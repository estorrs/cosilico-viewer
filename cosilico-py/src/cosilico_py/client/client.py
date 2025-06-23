from collections.abc import Iterable
from typing import Annotated, Union
import os
import json
import time

from rich import print
from rich.console import Console
from supabase import create_client

from cosilico_py.config import get_config
from cosilico_py.preprocessing.platform_helpers.experiment import create_bundle_from_input
from cosilico_py.storage import upload_object, download_object
import cosilico_py.client.structure as structure
import cosilico_py.client.utils as utils
import cosilico_py.models as models


STDERR = Console(stderr=True)

class CosilicoClient(object):
    """Cosilico Client."""
    def __init__(self, config_fp: Annotated[os.PathLike, 'Path to config json.'] = None):
        if config_fp is None:
            self.config = get_config()
        else:
            self.config = json.load(open(config_fp))
        self.cache_dir = self.config['cache_dir']
        self.supabase = create_client(self.config['api_url'], self.config['anon_key'])
        self.root = None

    def _check_session(self):
        session = self.supabase.auth.get_session()
        if session is None:
            STDERR.print('User must be signed in. To sign in, use [cyan]client.sign_in()[/cyan].')
            raise RuntimeError('User not signed in.')

        if session.expires_at <= time.time():
            self.supabase.auth.refresh_session()


    def sign_in(
            self,
            email: Annotated[str, 'User email.'] = None,
            password: Annotated[str, 'User password.'] = None,
        ) -> None:
        """Sign in a user."""
        try:
            if email is None:
                assert 'email' in self.config, 'Email not found in config. Either add to config or set email argument.'
                email = self.config['email']
            if password is None:
                assert 'password' in self.config, 'Password not found in config. Either add to config or set password argument.'
                password = self.config['password']

            response = self.supabase.auth.sign_in_with_password({
                "email": email,
                "password": password
            })

            self.generate_directory_structure()

            print('[green]Sign-in successful. :boom:[/green]')
        except Exception as e:
            STDERR.print('[bold red]Sign-in attempt failed.[/bold red]')
            STDERR.print(e)
            raise RuntimeError('Sign-in attempt failed.')


    def create_user(
            self,
            email: Annotated[str, 'Users email'],
            password: Annotated[str, 'Users password.'],
            name: Annotated[str, 'Users name.']
        ) -> None:
        self._check_session()

        response = (
            self.supabase.table("profiles")
            .select("id,role")
            .eq('id', self.supabase.auth.get_user().user.id)
            .single()
            .execute()
        )

        if response.data['role'] != 'admin': ## soft limit to admin
            STDERR.print('[bold red]User sign-up attempt failed. User must be ADMIN to create user.[/bold red]')
            raise RuntimeError('Sign-up attempt failed.')
        
        try:
            response = self.supabase.auth.sign_up(
                {
                    "email": email,
                    "password": password,
                    'options': {
                        'data': {
                            'name': name
                        }
                    }
                }
            )
            print(f'[green]User created -- {email}.[/green]')
        except Exception as e:
            STDERR.print('[bold red]User sign-up attempt failed.[/bold red]')
            STDERR.print(e)
            raise RuntimeError('Sign-up attempt failed.')

    
    def create_experiment(
            self,
            experiment_input: Annotated[models.ExperimentInput, 'Input used to generate the experiment.']
        ) -> models.ExperimentUploadBundle:
        self._check_session()
        return create_bundle_from_input(experiment_input)
    
    def upload_experiment(
            self,
            bundle: Annotated[models.ExperimentUploadBundle, 'Experiment bundle to upload.'],
            upload_path: Annotated[Union[str, models.DirectoryEntity], 'Path of directory to upload experiment to.']
        ) -> None:
        self._check_session()

        # upload objects to storage
        objs = bundle.images + bundle.layers + bundle.layer_metadata
        for obj in objs:
            upload_object(obj.path, str(obj.local_path.absolute()), self.supabase)
        
        if isinstance(upload_path, str):
            node = structure.get_node(upload_path, self.root)
            parent_id = node.id
        else:
            parent_id = upload_path.id
        bundle.experiment.parent_id = parent_id
        
        ## do uploading
        response = utils.insert_to_table(self.supabase, 'experiments', bundle.experiment)
        for obj in bundle.images:
            response = utils.insert_to_table(self.supabase, 'images', obj)
        for obj in bundle.layers:
            response = utils.insert_to_table(self.supabase, 'layers', obj)
        for obj in bundle.layer_metadata:
            response = utils.insert_to_table(self.supabase, 'layer_metadata', obj)
        
        self.generate_directory_structure()
        
        print(f'Experiment [cyan]{bundle.experiment.name}[/cyan] successfuly uploaded :microscope:!')
                

    def generate_directory_structure(self):
        self._check_session()

        response = (
            self.supabase.table("directory_entities")
            .select("*")
            .execute()
        )
        self.root = structure.anytree_from_directory_entities(
            response.data,
            self.supabase.auth.get_user().user.id,
        )

    def display_experiments(
            self,
            path: Annotated[str, 'Path of node to display. Default will display all directories and experiments the user has access to.'] = None
        ):
        if path is None:
            structure.display_anytree_node(self.root)
        else:
            node = structure.get_node(path, self.root)
            structure.display_anytree_node(node)
