from collections.abc import Iterable
from pathlib import Path
from typing import Annotated, Union
import datetime
import json
import os

from dateutil import parser
from rich import print
import numpy as np
import pandas as pd
import scanpy as sc
import zarr

from cosilico_py.config import get_config
from cosilico_py.models import Experiment, ExperimentUploadBundle
# from cosilico_py.preprocessing.platform_helpers.x10 import read_10x_h5
from cosilico_py.preprocessing.core.image import (
    get_resolutions,
    write_image_zarr_from_ome,
)
from cosilico_py.preprocessing.core.layer import (
    combine_barcoded_data,
    write_grouped_layer_zarr_from_df,
    write_grouped_metadata_zarrs_from_df,
    write_ungrouped_layer_zarr_from_df,
    write_sparse_continuous_ungrouped_layer_metadata
)

PLATFORM_VERSIONS = ['Prime VV']



def load_transcript_df(filepath, mpp=1., bbox=None):
    # Read only necessary columns & use `dtype` hints for memory efficiency
    dtype_dict = {
        "feature_name": "category",
        "is_gene": "bool",
        "codeword_category": "category",
        "x_location": "float32",
        "y_location": "float32",
        "transcript_id": "uint64",
        "qv": "float32",
    }

    source = pd.read_parquet(
        filepath,
        columns=["feature_name", "is_gene", "codeword_category", "x_location", "y_location", "transcript_id", "qv"],
        engine="pyarrow"
    ).astype(dtype_dict)

    # Filter first to minimize memory usage
    source = source.loc[source['is_gene']].copy()
    source = source.loc[source['codeword_category']=='predesigned_gene'].copy()
    source = source.loc[source['qv']>=20].copy()
    source["feature_name"] = source["feature_name"].cat.remove_unused_categories()
    source["feature_index"] = pd.Categorical(source["feature_name"].cat.codes)

    source['x_location'] /= mpp
    source['y_location'] /= mpp

    if bbox is not None:
        r1, r2, c1, c2 = bbox
        source = source[((source['x_location'] > c1) & (source['x_location'] < c2))]
        source = source[((source['y_location'] > r1) & (source['y_location'] < r2))]
        source['x_location'] -= c1
        source['y_location'] -= r1
    return source

def load_cell_df(filepath, mpp=1., bbox=None):
    df = pd.read_parquet(filepath)

    df['vertex_x'] /= mpp
    df['vertex_y'] /= mpp

    if bbox is not None:
        r1, r2, c1, c2 = bbox
        df = df[((df['vertex_x'] > c1) & (df['vertex_x'] < c2))]
        df = df[((df['vertex_y'] > r1) & (df['vertex_y'] < r2))]
        df['vertex_x'] -= c1
        df['vertex_y'] -= r1

    return df



def experiment_from_x10_xenium_cellranger(
        directory: Annotated[os.PathLike, 'Path to CellRanger outs directory.'],
        name: Annotated[str, 'Name of experiment.'] = None,
        bbox: Annotated[Union[Iterable[int], None], 'Bounding box to crop to. Format is [top, bottom, left, right]. Default is None.'] = None,
        to_uint8: Annotated[bool, 'Default is False. If True, will convert the Xenium IHC image to UINT8. This can save space for images that are UINT16.'] = False,
        verbose: Annotated[bool, 'Whether to display verbose output. Default is True.'] = True,
    ):
    assert os.path.isdir(directory), f'Input directory {directory} is not a directory.'
    directory = Path(directory)

    if verbose: print(f'Loading xenium experiment from [green]{directory}[/green]')

    config = get_config()
    output_directory = config['cache_dir']

    path = directory / 'experiment.xenium'
    assert path.is_file(), f'Could not find experiment file at: {path}.'
    xenium_metadata = json.load(open(path))
    if name is None:
        name = xenium_metadata['run_name'] + '-' + xenium_metadata['region_name']
    dt = parser.isoparse(xenium_metadata['run_start_time'])

    experiment = Experiment(
        name = name,
        experiment_date = dt,
        platform = '10X Xenium',
        platform_version = xenium_metadata['panel_name'],
        metadata = xenium_metadata,
        parent_id = None # none for now, get's set at upload time.
    )

    # upload ihc image
    ome_tiff_path = directory / 'morphology_focus.ome.tif'
    if not ome_tiff_path.is_file():
        ome_tiff_path = directory / 'morphology_focus' / 'morphology_focus_0002.ome.tif'
    assert ome_tiff_path.is_file(), 'Could not find Xenium morphology image at morphology_focus.ome.tif or morphology_focus/.'
    if verbose: print(f'Loading xenium morphology image from [green]{ome_tiff_path}[/green]')
    image = write_image_zarr_from_ome(
        experiment.id,
        ome_tiff_path,
        'Xenium Morphology',
        output_directory,
        tile_size = 512,
        res_magnitude = 4,
        bbox = bbox,
        to_uint8 = to_uint8
    )
    experiment.image_ids.append(image.id)
    pixels = image.metadata.images[0].pixels
    max_dim_size = max(pixels.size_x, pixels.size_y)
    mpp = pixels.physical_size_x

    # upload the layers
    # transcripts
    tile_size = 4096
    if tile_size > max_dim_size:
        tile_size = 1 << (max_dim_size.bit_length() - 1)
    res_magnitude = 4
    initial_group_size = 1024
    bin_size = 64
    transcripts_path = directory / 'transcripts.parquet'
    assert transcripts_path.is_file(), f'Could not find transcripts at {transcripts_path}.'
    if verbose: print(f'Loading xenium transcripts from [green]{transcripts_path}[/green]')
    source = load_transcript_df(transcripts_path, mpp=mpp, bbox=bbox)

    zooms = get_resolutions(tile_size, max_dim_size, scaler=res_magnitude)
    group_sizes = [int(initial_group_size / (res_magnitude * 2)**i) for i in range(len(zooms))]
    bin_size_map = {res:i * res_magnitude * bin_size for i, res in enumerate(zooms) if i}

    transcript_layer = write_grouped_layer_zarr_from_df(
        experiment.id,
        source,
        'transcript_id',
        zooms,
        bin_size_map,
        group_sizes,
        output_directory,
        (pixels.size_x, pixels.size_y),
        name='Transcripts',
        chunk_size = 10_000_000,
        use_disk = True,
    )
    experiment.layer_ids.append(transcript_layer.id)

    # transcript metadata
    store = zarr.storage.ZipStore(transcript_layer.local_path, mode='r')
    root = zarr.group(store=store)
    attrs = root.attrs
    zoom_to_order = {res:root[f'/metadata/ids/{res}'][:] for res in attrs['resolutions']}
    fnames = root['/metadata/features/feature_names'][:]
    store.close()

    value_params = {
        'qv': {
            'name': 'QV',
            'vmin': 0,
            'vmax': 40
        }
    }
    if verbose: print(f'Loading xenium transcript metadata for [green]{list(value_params.keys())}[/green]')

    transcript_metas = write_grouped_metadata_zarrs_from_df(
        transcript_layer.id,
        source,
        'transcript_id',
        output_directory,
        bin_size_map,
        fnames,
        attrs,
        zoom_to_order,
        value_params,
        'feature_name',
        chunk_size = 10_000_000,
        use_disk = True,
    )


    ## cell layer
    cell_poly_path = directory / 'cell_boundaries.parquet'
    assert cell_poly_path.is_file(), f'Cell boundaries not found at {cell_poly_path}'
    if verbose: print(f'Loading xenium cell boundaries from [green]{cell_poly_path}[/green]')
    df = load_cell_df(cell_poly_path, mpp=mpp, bbox=bbox)

    tile_size = 4096
    res_magnitude = 2
    zooms = get_resolutions(tile_size, max_dim_size, scaler=res_magnitude)

    max_vert_map = {int(k):v for k, v in config['preprocessing']['layer']['cells_max_vert_map'].items()}
    downsample_map = {int(k):v for k, v in config['preprocessing']['layer']['cells_downsample_map'].items()}
    object_type_map = {int(k):v for k, v in config['preprocessing']['layer']['cells_object_type_map'].items()}
    # max_vert_map = {
    #     4096: 32,
    #     8192: 4
    # }

    # downsample_map = {
    #     4096: -1,
    #     8192: 100_000
    # }

    # object_type_map = {
    #     4096: 'polygon',
    #     8192: 'polygon'
    # }
    
    cell_layer = write_ungrouped_layer_zarr_from_df(
        experiment.id,
        'Cells',
        df,
        'cell_id',
        zooms,
        output_directory,
        max_vert_map,
        downsample_map,
        object_type_map,
    )
    experiment.layer_ids.insert(0, cell_layer.id)

    # cell metadata
    h5_path = directory / 'cell_feature_matrix.h5'
    assert h5_path.is_file(), f'Cell feature matrix not found at {h5_path}'
    if verbose: print(f'Loading xenium cell transcript counts [green]{h5_path}[/green]')
    adata = sc.read_10x_h5(h5_path)
    source = combine_barcoded_data(None, adata, chunk_size=1_000_000).sort_index()
    fnames = np.asarray(source['feature_name'].cat.categories.to_list(), dtype=object)

    cell_transcript_count_meta = write_sparse_continuous_ungrouped_layer_metadata(
        cell_layer.id,
        fnames,
        'Transcript Counts',
        source,
        'count',
        cell_layer.local_path,
        output_directory,
    )

    bundle = ExperimentUploadBundle(
        experiment = experiment,
        images = [image],
        layers = [cell_layer, transcript_layer],
        layer_metadata = list(transcript_metas.values()) + [cell_transcript_count_meta]
    )
    
    return bundle
