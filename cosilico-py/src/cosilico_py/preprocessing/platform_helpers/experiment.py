import cosilico_py.models as models
from cosilico_py.preprocessing.platforms import (
    experiment_from_x10_xenium_cellranger
)


def create_bundle_from_input(input) -> models.ExperimentUploadBundle:
    if input.platform == models.PlatformEnum.x10_xenium:
        bundle = experiment_from_x10_xenium_cellranger(
            input.cellranger_outs,
            input.name,
            bbox = input.bbox,
            to_uint8 = input.to_uint8
        )
    else:
        raise RuntimeError(f'Platform {input.platform} was not found.')

    return bundle