from collections.abc import Iterable
from typing import Annotated
import time

from rich import print
from rich.console import Console
from supabase import create_client
import boto3

from cosilico_py.config import get_config
from cosilico_py.preprocessing.platform_helpers.experiment import create_bundle_from_input
import cosilico_py.models as models

STDERR = Console(stderr=True)

class CosilicoClient(object):
    """Cosilico Client."""
    def __init__(self):
        self.config = get_config()
        self.cache_dir = self.config['cache_dir']
        self.supabase = create_client(self.config['api_url'], self.config['anon_key'])
        self.bundle = None
        self.boto3 = None

    def _check_session(self):
        session = self.supabase.auth.get_session()
        if session is None:
            STDERR.print('User must be signed in. To sign in, use [cyan]cosilico.sign_in_with_password[/cyan].')
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
                assert 'email' in self.config, f'Email not found in config. Either add to config or set email argument.'
                email = self.config['email']
            if password is None:
                assert 'password' in self.config, f'Password not found in config. Either add to config or set password argument.'
                password = self.config['password']

            _ = self.supabase.auth.sign_in_with_password({
                "email": email,
                "password": password
            })
            print('[green]Sign-in successful. :boom:[/green]')
        except Exception as e:
            STDERR.print('[bold red]Sign-in attempt failed.[/bold red]')
            STDERR.print(e)
    
    def create_experiment(
            self,
            experiment_input: Annotated[models.ExperimentInput, 'Input used to generate the experiment.']
        ) -> models.ExperimentUploadBundle:
        return create_bundle_from_input(experiment_input)
    
    def upload_experiment(
            self,
            upload_directory: Annotated[models.DirectoryEntity, 'Directory to upload experiment to.']
        ):
        pass



        

