from collections.abc import Iterable
from pathlib import Path
from typing import Annotated, Union
import json
import os

from ome_types import OME, to_dict, from_xml
from scipy.ndimage import zoom
import dask.array as da
import numpy as np
import tifffile
import zarr

from cosilico_py.preprocessing.core.conversion import da_to_uint8
from cosilico_py.preprocessing.core.ome import validate_ome, ome_serializer
from cosilico_py.models import Image


def get_resolutions(
        tile_size: Annotated[int, 'Size of the image tiles.'],
        max_dim_size: Annotated[int, 'Largest dimension of the image.'],
        scaler: Annotated[float, 'Scale applied between each resolution.'] = 2
    ) -> Annotated[list[str], 'Resolutions sizes']:
    """
    Get list of resolutions for an image based on it's max dimension.
    """
    min_res = int(tile_size)
    resolution_sizes = []
    while min_res < max_dim_size:
        resolution_sizes.append(min_res)
        min_res *= scaler
    
    if resolution_sizes:
        resolution_sizes.append(resolution_sizes[-1] * scaler)
    else:
        resolution_sizes.append(min_res)

    return resolution_sizes

def pad_to_target_block_shape(
        arr: Annotated[da.Array, 'Array to pad. Should be (X, Y, Z, C, T).'],
        target_block_shape: Annotated[Iterable[int], 'The target block shape. Is (W, H).']
    ) -> Annotated[da.Array, 'Array padded to fit the target_block_shape.']:
    """
    Pads a dask array so it can fit target_block_shape.
    """
    original_shape = arr.shape  # (X, Y, Z, C, T)
    W, H = original_shape[:2] 

    new_W = (W + target_block_shape[0] - 1) // target_block_shape[0] * target_block_shape[0]
    new_H = (H + target_block_shape[1] - 1) // target_block_shape[1] * target_block_shape[1]

    pad_widths = [
        (0, new_W - W),
        (0, new_H - H),
        (0, 0),
        (0, 0),
        (0, 0),
    ]

    return da.pad(arr, pad_widths, mode="constant", constant_values=0)

def write_zoom_level(
        image: Annotated[da.Array, 'Image to be written. Is X, Y, Z, C, T.'],
        tile_size: Annotated[da.Array, 'Size of written image tiles.'],
        res_size: Annotated[float, 'Size of the image for a given resolution.'],
        res_group: Annotated[zarr.Group, 'Zarr group that will be written to.']
    ) -> None:
    assert np.sum(image.chunksize[2:]) == len(image.chunksize[2:])
    assert image.shape[0] % tile_size == 0
    assert image.shape[1] % tile_size == 0
    assert image.dtype in [np.uint8, np.uint16]

    dt = image.dtype

    _, _, Z, C, T = image.shape

    if tile_size < res_size:
        scale_factor = tile_size / res_size
        downsampled = da.map_blocks(
            lambda block: zoom(
                block, (scale_factor, scale_factor, 1, 1, 1), order=0
            ).astype(dt),
            image,
            dtype=dt,
            chunks=(int(
                scale_factor * image.chunksize[0]),
                int(scale_factor * image.chunksize[1]), 1, 1, 1)
        )

        if int(scale_factor * image.shape[0]) % tile_size != 0 or int(scale_factor * image.shape[1]) % tile_size != 0:
            downsampled = pad_to_target_block_shape(downsampled, (tile_size, tile_size))
        downsampled = downsampled.rechunk((tile_size, tile_size, 1, 1, 1))
    else:
        downsampled = image

    num_tiles_x = len(downsampled.chunks[0])
    num_tiles_y = len(downsampled.chunks[1])

    dataset_shape = (num_tiles_x, num_tiles_y, T, C, Z, tile_size, tile_size)
    dataset_chunks = (1, 1, 1, 1, 1, tile_size, tile_size)
    tiles_dataset = res_group.create_dataset(
        "tiles", shape=dataset_shape, dtype=dt, chunks=dataset_chunks, overwrite=True
    )

    tiled_dask = downsampled.reshape(
        (num_tiles_x, tile_size, num_tiles_y, tile_size, *downsampled.shape[2:])
    )
    tiled_dask = tiled_dask.transpose(0, 2, 4, 5, 6, 3, 1)
    tiled_dask.to_zarr(tiles_dataset)


def write_image_zarr(
        image: Annotated[Union[da.Array, np.ndarray], 'Image to write. Must be Dask or numpy array. Must be XYZCT.'],
        ome_model: Annotated[OME, 'OME metadata to be saved with the image.'],
        zarr_path: Annotated[os.PathLike, 'Path to write the .zarr.zip file.'],
        tile_size: Annotated[int, 'Tile size to use during writing. This is the tile size that will used to read in data with the viewer. Default is 512.'] = 512,
        res_magnitude: Annotated[int, 'When selecting resolutions automatically, this is the scaler used.'] = 4,
        bbox: Annotated[Union[Iterable[int], None], 'Bounding box to crop to. Format is [top, bottom, left, right]. Default is None.'] = None
    ) -> None:
    if isinstance(image, np.ndarray):
        image = da.from_array(image, chunks=(1, 2048, 2048))
    assert isinstance(image, da.Array), f'Image must be a Dask Array (da.Array), got {type(image)}'

    validate_ome(ome_model)

    if bbox is not None:
        assert len(bbox) == 4 and bbox[0] < bbox[1] and bbox[2] < bbox[3], f'bbox must be [top, bottom, left, right], got {bbox}.'
        r1, r2, c1, c2 = bbox
        image = image[c1:c2, r1:r2]

    max_dim_size = max(image.shape[:2])
    resolution_sizes = get_resolutions(tile_size, max_dim_size, scaler=res_magnitude)

    image = pad_to_target_block_shape(image, (tile_size, tile_size))
    image = image.rechunk((tile_size, tile_size, 1, 1, 1))

    store = zarr.storage.ZipStore(zarr_path, mode='w')
    root = zarr.group(store=store, overwrite=True)
    zoom_group = root.create_group("zooms")

    for res_size in resolution_sizes:
        res_group = zoom_group.create_group(f"{res_size}")
        write_zoom_level(image, tile_size, res_size, res_group)

    if bbox is not None:
        ome_model.images[0].pixels.size_x = c2 - c1
        ome_model.images[0].pixels.size_y = r2 - r1
    d_str = json.dumps(to_dict(ome_model), default=ome_serializer, indent=2)
    meta = {
        'ome': json.loads(d_str),
        'version': 'v1',
        'name': 'Xenium Multiplex',
        'resolutions': resolution_sizes,
        'tile_size': tile_size,
        'upp': ome_model.images[0].pixels.physical_size_x,
        'unit': ome_model.images[0].pixels.physical_size_x_unit.value,
    }
    root.attrs.update(meta)

    store.close()

def write_image_zarr_from_ome(
        experiment_id: Annotated[str, 'ID of parent experimenet'],
        ome_tiff_path: Annotated[os.PathLike, 'Path to OME TIFF.'],
        name: Annotated[str, 'Name of the image'],
        output_directory: Annotated[os.PathLike, 'Directory in which to write the .zarr.zip file.'],
        tile_size: Annotated[int, 'Tile size to use during writing. This is the tile size that will used to read in data with the viewer. Default is 512.'] = 512,
        res_magnitude: Annotated[int, 'When selecting resolutions automatically, this is the scaler used.'] = 4,
        bbox: Annotated[Union[Iterable[int], None], 'Bounding box to crop to. Format is [top, bottom, left, right]. Default is None.'] = None,
        to_uint8: Annotated[bool, 'Default is False. If True, will convert the saved image to UINT8. This can save space for images that are UINT16.'] = False,
    ) -> None:
    assert os.path.exists(ome_tiff_path), f'ome_tiff_path {ome_tiff_path} does not exist.'

    output_directory = Path(output_directory).expanduser().absolute()
    assert output_directory.is_dir(), f'{output_directory} is not a directory.'

    ome_metadata = tifffile.TiffFile(ome_tiff_path).ome_metadata
    ome_model = from_xml(ome_metadata)
    size_c = ome_model.images[0].pixels.size_c

    with tifffile.TiffFile(ome_tiff_path) as tif:
        if size_c == 1:
            image = tif.pages[0].aszarr()
            image = da.from_zarr(image, chunks=(2048, 2048))
        else:
            image = tif.aszarr()
            image = da.from_zarr(image, chunks=(1, 2048, 2048))

    # tifffile will automatically remove the T/Z dimension, adding it back in if needed
    if len(image.shape) == 2:   
        image = da.expand_dims(image, axis=(2, 3, 4))
    elif len(image.shape) == 3:
        image = da.expand_dims(image, axis=(3, 4))
    image = image.transpose(2, 1, 3, 0, 4) # now image is XYZCT

    if to_uint8:
        image = da_to_uint8(image)
    
    image_model = Image(name=name, experiment_id=experiment_id, metadata=ome_model)
    image_model.local_path = (output_directory / f'{image_model.id}.zarr.zip').absolute()
    write_image_zarr(
        image,
        ome_model,
        image_model.local_path,
        tile_size=tile_size,
        res_magnitude=res_magnitude,
        bbox=bbox
    )
    return image_model
