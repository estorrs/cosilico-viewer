from typing import Annotated

import anndata
import numpy as np
import pandas as pd
import zarr
import zarr.types
from supabase import Client

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

    def generate_layer_data(self, layer_id: str, return_type: str) -> pd.DataFrame | anndata.AnnData:
        pass

    def generate_image_data(self, image_id: str, return_type: str) -> np.ndarray:
        pass
