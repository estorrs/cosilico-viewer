from typing import Annotated

import anndata
import dask.array as da
import dask.dataframe as dd
import numpy as np
import pandas as pd
import scipy
import zarr
from supabase import Client
from pydantic import Field
# from scipy.sparse import coo_matrix, csr_matrix

import cosilico_py.client.utils as utils
from cosilico_py.config import get_config
import cosilico_py.models as models
import cosilico_py.preprocessing.core.layer as layer_utils
from cosilico_py.storage import upload_object


def bundle_from_id(experiment_id: str, supabase: Client) -> models.ExperimentUploadBundle:
    response = (
        supabase.table("experiments")
        .select("*")
        .eq('id', experiment_id)
        .single()
        .execute()
    )
    body = response.data
    experiment = models.Experiment(
        id = body['id'],
        version = body['version'],
        experiment_date = body['experiment_date'],
        name = body['name'],
        platform = body['platform'],
        platform_version = body['platform_version'],
        metadata = body['metadata'],
        parent_id = body['parent_id'],
        image_ids = body['image_ids'],
        layer_ids = body['layer_ids'],
        view_setting_id = body['view_setting_id'],
        tags = body['tags'],
    )

    images = []
    for image_id in experiment.image_ids:
        response = (
            supabase.table("images")
            .select("*")
            .eq('id', image_id)
            .single()
            .execute()
        )
        body = response.data
        image = models.Image(
            id = body['id'],
            version = body['version'],
            created_by = body['created_by'],
            created_at = body['created_at'],
            experiment_id = body['experiment_id'],
            name = body['name'],
            metadata = body['metadata'],
            path = body['path'],
            tags = body['tags'],
        )
        images.append(image)

    layers = []
    for layer_id in experiment.layer_ids:
        response = (
            supabase.table("layers")
            .select("*")
            .eq('id', layer_id)
            .single()
            .execute()
        )
        body = response.data
        layer = models.Layer(
            id = body['id'],
            version = body['version'],
            created_by = body['created_by'],
            created_at = body['created_at'],
            experiment_id = body['experiment_id'],
            name = body['name'],
            is_grouped = body['is_grouped'],
            metadata = body['metadata'],
            path = body['path'],
            tags = body['tags'],
        )
        layers.append(layer)
    
    layer_metadata = []
    for layer in layers:
        response = (
            supabase.table("layer_metadata")
            .select("*")
            .eq('layer_id', layer.id)
            .execute()
        )
        for body in response.data:
            lm = models.LayerMetadata(
                id = body['id'],
                version = body['version'],
                created_by = body['created_by'],
                created_at = body['created_at'],
                layer_id = body['layer_id'],
                name = body['name'],
                metadata_type = body['metadata_type'],
                is_sparse = body['is_sparse'],
                fields = body['fields'],
                metadata = body['metadata'],
                path = body['path'],
                tags = body['tags'],
            )
            layer_metadata.append(lm)
    
    bundle = models.ExperimentUploadBundle(
        experiment=experiment,
        images=images,
        layers=layers,
        layer_metadata=layer_metadata
    )

    return bundle

def first_occurrence_indices(xs):
    seen = set()
    idxs = []
    for i, x in enumerate(xs):
        if x not in seen:
            seen.add(x)
            idxs.append(i)
    return idxs

def extract_grouped_layer(layer, root, lm_to_root, return_type='pandas', include_all=True):
    level = min([int(x) for x in list(root['zooms'].group_keys())])
    feature_names = root['metadata/features/feature_names'][:]

    index_map = {val: i for i, val in enumerate(root[f'metadata/ids/{level}'][:])}
    ddfs = []
    for tile_loc, g in root[f'zooms/{level}'].groups():
        row, col = tile_loc.split('_')
        for key, fg in g.groups():
            fidx_arr = da.from_zarr(fg['feature_index']).compute()
            id_arr = da.from_zarr(fg['id']).compute()
            location_arr = da.from_zarr(fg['location']).compute()
            df = pd.DataFrame(data=location_arr, columns=['x_location', 'y_location'])
            df['id'] = id_arr
            df['feature_name'] = feature_names[fidx_arr]
            
            if include_all:
                idxs_order = np.array([index_map[val] for val in df['id']])
                for name, lm_root in lm_to_root.items():
                    df[name] = lm_root[f'object/{level}'][idxs_order]
            
            ddfs.append(dd.from_pandas(df))
    ddf = dd.concat(ddfs)
    ddf = ddf.set_index('id')

    if return_type == 'dask':
        return ddf
    return ddf.compute()

def ungrouped_dataframe_from_root(lm, lm_root, level):
    fields = lm_root['metadata/fields'][:]
    if lm.metadata_type == 'continuous':
        values = lm_root[f'object/{level}'][:]
        extra_df = pd.DataFrame(values, columns=fields)
    else:
        field_idxs = lm_root[f'object/{level}'][:]
        extra_df = pd.DataFrame.from_dict(
            {lm.name: fields[field_idxs]}
        )
    return extra_df

def extract_ungrouped_layer(layer, root, lm, lm_to_root, name_to_lm, return_type='pandas', include_all=True):
    level = min([int(x) for x in list(root['zooms'].group_keys())])
    id_order = root[f'metadata/ids/{level}'][:]
    # index_map = {val: i for i, val in enumerate(root[f'metadata/ids/{level}'][:])}
    adata, source = None, None
    if lm.is_sparse:
        adatas = []
        for tile_loc, g in root[f'zooms/{level}'].groups():
            row, col = tile_loc.split('_')
            id_arr = da.from_zarr(g['id']).compute()
            location_arr = da.from_zarr(g['vertices']).compute()
            if len(location_arr.shape) == 3:
                location_arr = location_arr.mean(1)
            df = pd.DataFrame(data=location_arr, columns=['x_location', 'y_location'])
            df['id'] = id_arr

            # idxs_order = np.array([index_map[val] for val in df['id']])
            lm_root = lm_to_root[lm.name]
            fields = lm_root['metadata/fields'][:]
            lm_g = lm_root[f'zooms/{level}/{tile_loc}']
            b_fidxs = lm_g['feature_indices'][:]
            b_ids = lm_g['ids'][:]
            values = lm_g['values'][:]
            unique_ids, row_indices = np.unique(b_ids, return_inverse=True)
            csr = scipy.sparse.coo_matrix((values, (row_indices, b_fidxs)),
                                    shape=(id_arr.shape[0], len(fields)),
                                    dtype=np.float32).tocsr()
            adata = anndata.AnnData(X=csr)
            adata.obs.index = unique_ids
            adata = adata[df['id']]
            adata.obsm['spatial'] = df[['x_location', 'y_location']].values
            adata.var.index = fields
            adatas.append(adata)

        adata = anndata.concat(adatas)
        idxs = first_occurrence_indices(adata.obs.index)
        adata = adata[idxs]
        adata = adata[id_order]
    else:
        lm_root = lm_to_root[lm.name]
        source = ungrouped_dataframe_from_root(lm, lm_root, level)
        source.index = id_order
    
    if include_all:
        for extra_name, extra_root in lm_to_root.items():
            extra_lm = name_to_lm[extra_name]
            fields = extra_root['metadata/fields'][:]
            if not extra_lm.is_sparse and extra_name != lm.name:
                extra_df = ungrouped_dataframe_from_root(extra_lm, extra_root, level)
                extra_df.index = id_order
                if adata is not None:
                    adata.obs = pd.concat((adata.obs, extra_df), axis=1)
                else:
                    source = pd.concat((source, extra_df), axis=1)

    return adata if lm.is_sparse else source

class Experiment(object):
    def __init__(
            self,
            supabase: Annotated[Client, 'Supabase client.'],
            config: Annotated[dict, 'Cosilico configuration'],
            experiment_id: Annotated[str, 'ID of experiment.'],
        ):
        self.supabase = supabase
        self.config = config

        self.bundle = bundle_from_id(experiment_id, self.supabase)
    
    def __str__(self):
        return str(self.bundle)
    
    def __repr__(self):
        return str(self.bundle)
    
    
    @property
    def images(self):
        return self.bundle.images
    
    @property
    def layers(self):
        return self.bundle.layers
    
    @property
    def layer_metadata(self):
        return self.bundle.layer_metadata

    
    def add_continuous_layer_metadata(
            self,
            name: Annotated[str, 'Name of layer metadata'],
            values_df: Annotated[pd.DataFrame, 'Data to add.'],
            layer: Annotated[models.Layer, 'Layer to add metadata to.'],
        ):
        store = zarr.storage.ZipStore(layer.local_path, mode='r')
        root = zarr.group(store=store)
        level = min([int(x) for x in list(root['zooms'].group_keys())])
        ids = root[f'metadata/ids/{level}'][:]

        current_names = [lm.name for lm in self.get_layer_metadata(layer)]
        assert name not in current_names, f'Name must be unique. Name already exists: {current_names}'
        assert np.array_equal(np.unique(values_df.index), np.unique(ids)), f'The values_df index and the layer object IDs must be the same.'

        layer_metadata = layer_utils.write_continuous_ungrouped_layer_metadata(
            layer.id,
            name,
            values_df,
            layer.local_path,
            self.config['cache_dir'],
        )

        upload_object(layer_metadata.path, str(layer_metadata.local_path.absolute()), self.supabase)
        response = utils.insert_to_table(self.supabase, 'layer_metadata', layer_metadata)

        self.bundle.layer_metadata.append(layer_metadata)

        store.close()

        return layer_metadata

    def create_categorical_layer_metadata(
            self,
            name: Annotated[str, 'Name of layer metadata'],
            values: Annotated[pd.Series, 'Data to add.'],
            layer: Annotated[models.Layer, 'Layer to add metadata to.'],
        ):
        store = zarr.storage.ZipStore(layer.local_path, mode='r')
        root = zarr.group(store=store)
        level = min([int(x) for x in list(root['zooms'].group_keys())])
        ids = root[f'metadata/ids/{level}'][:]

        values = values.astype('category')

        current_names = [lm.name for lm in self.get_layer_metadata(layer)]
        assert name not in current_names, f'Name must be unique. Name already exists: {current_names}'
        assert np.array_equal(np.unique(values.index), np.unique(ids)), f'The values index and the layer object IDs must be the same.'

        layer_metadata = layer_utils.write_categorical_ungrouped_layer_metadata(
            layer.id,
            name,
            values,
            layer.local_path,
            self.config['cache_dir'],
        )

        upload_object(layer_metadata.path, str(layer_metadata.local_path.absolute()), self.supabase)
        response = utils.insert_to_table(self.supabase, 'layer_metadata', layer_metadata)

        self.bundle.layer_metadata.append(layer_metadata)

        store.close()

        return layer_metadata


    def generate_layer_data(
            self,
            layer: Annotated[models.Layer, 'Layer to generate data from. If layer is a grouped layer, than a pandas DataFrame will be returned. Otherwise an AnnData object will be returned.'],
            layer_metadata: Annotated[models.LayerMetadata | None, 'Layer metadata to include. If generating data for an ungrouped layer, a layer metadata must be provided.'] = None,
            include_all: Annotated[bool, 'Whether to include all possible layer metadata.'] = True,
            return_type: Annotated[str, 'Return type for layer data. Can be ["pandas", "dask"]. Only applies to grouped layers, which can be returned as a pandas DataFrame or dask DataFrame. Non-grouped layers will always return as AnnData objects.'] = 'pandas',
        ) -> pd.DataFrame | anndata.AnnData:
        store = zarr.storage.ZipStore(layer.local_path, mode='r')
        root = zarr.group(store=store)

        lms = self.get_layer_metadata(layer)
        lm_to_root = {}
        lm_to_store = {}
        name_to_lm = {}
        for lm in lms:
            lm_store = zarr.storage.ZipStore(lm.local_path, mode='r')
            lm_root = zarr.group(store=lm_store)
            lm_to_root[lm.name] = lm_root
            lm_to_store[lm.name] = lm_store
            name_to_lm[lm.name] = lm

        return_obj = None

        if layer.is_grouped:
            return_obj = extract_grouped_layer(layer, root, lm_to_root, return_type=return_type, include_all=include_all)
        else:
            return_obj = extract_ungrouped_layer(layer, root, layer_metadata, lm_to_root, name_to_lm, return_type=return_type, include_all=include_all)
        
        store.close()
        for lm_store in lm_to_store.values():
            lm_store.close()

        return return_obj

    def generate_image_data(
            self,
            image: Annotated[models.Image, 'Image from which to return rasterized pixel data.'],
            return_type: Annotated[str, 'Return type of image. Can be dask (dask array) or numpy (numpy ndarray).'] = 'dask'
        ) -> np.ndarray | da.Array:
        store = zarr.storage.ZipStore(image.local_path, mode='r')
        root = zarr.group(store=store)
        level = min([int(x) for x in list(root['zooms'].group_keys())])

        arr = da.from_zarr(root[f'zooms/{level}/tiles'])
        store.close()

        a, b, c, d, e, f, g = arr.shape
        arr = da.einsum('abcdefg->afbgcde', arr)
        arr = arr.reshape(a * f, b * g, c, d, e)

        if return_type == 'numpy':
            return arr.compute()
        
        return arr

    def get_layer(self, layer_name):
        ls = [l for l in self.bundle.layers if l.name == layer_name]
        assert len(ls), f'Layer with name {layer_name} was not found.'
        return ls[0]

    def get_layer_metadata(self, layer: models.LayerMetadata, metadata_name = None) -> list[models.LayerMetadata]:
        lms = [lm for lm in self.bundle.layer_metadata if lm.layer_id == layer.id]

        if metadata_name is not None:
            lms = [lm for lm in lms if lm.name == metadata_name]
            assert len(lms), f'Name {metadata_name} was not found in layer.'
            return lms[0]
        return lms
    

