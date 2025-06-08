from collections.abc import Iterable
from typing import Annotated
import time

from rich import print, Console
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
        # self.user = None
        # self.session = None

        self.logged_in = False
        self.boto3 = None

    def _check_session(self):
        session = self.supabase.auth.get_session()
        if session is None:
            STDERR.print(f'User must be signed in. To sign in, use [cyan]cosilico.sign_in_with_password[/cyan].')
            raise RuntimeError(f'User not signed in.')

        if session.expires_at <= time.time():
            self.supabase.auth.refresh_session()


    def sign_in_with_password(
            self,
            email: Annotated[str, 'User email.'],
            password: Annotated[str, 'User password.'],
        ) -> None:
        """Sign in a user."""
        try:
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
        ):
        self.bundle: models.ExperimentUploadBundle = create_bundle_from_input(experiment_input)
    
    def upload_experiment(
            self,
            upload_directory: Annotated[models.DirectoryEntity, 'Directory to upload experiment to.']
        ):
        pass



        

