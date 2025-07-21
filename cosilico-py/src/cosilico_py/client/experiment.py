from typing import Annotated

import anndata
import dask.array as da
import dask.dataframe as dd
import numpy as np
import pandas as pd
import zarr
import zarr.types
from supabase import Client
from pydantic import Field

import cosilico_py.models as models

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

class Experiment(object):
    def __init__(
            self,
            supabase: Annotated[Client, 'Supabase client.'],
            experiment_id: Annotated[str, 'ID of experiment.'],
        ):
        self.supabase = supabase

        self.bundle = bundle_from_id(experiment_id, self.supabase)
    
    def __str__(self):
        return str(self.bundle)
    
    def __repr__(self):
        return str(self.bundle)
    
    @property
    def images(self):
        return self.bundle.images

    def generate_layer_data(
            self,
            layer: Annotated[models.Layer, 'Layer to generate data from. If layer is a grouped layer, than a pandas DataFrame will be returned. Otherwise an AnnData object will be returned.'],
            return_type: Annotated[str | None, 'Return type for layer data. Can be ["pandas", "dask"]. Only applies to grouped layers, which can be returned as a pandas DataFrame or dask DataFrame. Non-grouped layers will always return as AnnData objects.'] = None,
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
            lm_to_store[lm.name] = lm_to_store
            name_to_lm[lm.name] = lm

        return_obj = None
        if layer.is_grouped:
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
                    
                    idxs_order = np.array([index_map[val] for val in df['id']])
                    for name, lm_root in lm_to_root.items():
                        df[name] = lm_root[f'object/{level}'][idxs_order]
                    
                    ddfs.append(dd.from_pandas(df))
            ddf = dd.concat(ddfs)
            ddf = ddf.set_index('id')
        
            if return_type == 'dask':
                return_obj = ddf
            else:
                return_obj = ddf.compute()
        
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

    def get_layer_metadata(self, layer: models.LayerMetadata) -> list[models.LayerMetadata]:
        lms = [lm for lm in self.bundle.layer_metadata if lm.layer_id == layer.id]
        return lms

    @property
    def layers(self):
        return self.bundle.layers
    
    @property
    def layer_metadata(self):
        return self.bundle.layer_metadata


