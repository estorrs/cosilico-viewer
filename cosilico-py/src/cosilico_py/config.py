import json
import typer
from pathlib import Path

# import yaml


def get_config():
    app_dir = typer.get_app_dir('cosilico_py')
    config_path = Path(app_dir) / 'config.json'
    if not config_path.is_file():
        raise RuntimeError("Config file doesn't exist yet. Please create with cosilico config")

    # return yaml.safe_dump(open(config_path, 'r'))
    return json.load(open(config_path))
    

    