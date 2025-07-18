import shutil
from pathlib import Path

import cosilico_py.models as models
from cosilico_py.config import get_config


def write_bundle(bundle: models.ExperimentUploadBundle) -> None:
    config = get_config()
    cache_dir = Path(config['cache_dir'])
    assert cache_dir.is_dir(), f'Cache directory {cache_dir} does not exist.'

    objs = bundle.images + bundle.layers + bundle.layer_metadata
    for obj in objs:
        target_path = cache_dir / obj.id
        initial_path = str(obj.local_path.absolute())
        shutil.copy(initial_path, target_path)
