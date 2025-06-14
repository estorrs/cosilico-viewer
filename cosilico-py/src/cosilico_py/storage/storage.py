import json
import os
from typing import Annotated

import requests
import supabase


def upload_object(
        filename: Annotated[str, 'Key to store the file under.'],
        local_path: Annotated[os.PathLike, 'Path of the file that will be uploaded'],
        supabase_client: Annotated[supabase.Client, 'Signed in supabase client.']
    ) -> requests.Response:
    """Upload an object"""
    response = supabase_client.functions.invoke(
        "generate-upload-url",
        invoke_options={
            "body": {"filename": filename},
        },
    )
    body = json.loads(response.decode())
    signed_url = body['url']
    
    with open(local_path, "rb") as f:
        response = requests.put(
            signed_url,
            data=f,
            headers={
                "Content-Type": "application/zip"
            },
        )
    
    if response.status_code != 200:
        raise RuntimeError('Upload failed: {response}')
    
    return response


def download_file_streaming(download_url, output_path):
    with requests.get(download_url, stream=True) as response:
        if response.status_code != 200:
            raise RuntimeError(f'Download failed: {response.status_code} - {response.text}')
        
        with open(output_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:  # filter out keep-alive chunks
                    f.write(chunk)


def download_object(
        filename: Annotated[str, 'Key of the file to download.'],
        local_path: Annotated[os.PathLike, 'Path of where the file will be downloaded'],
        supabase_client: Annotated[supabase.Client, 'Signed in supabase client.']
    ) -> None:
    response = supabase_client.functions.invoke(
        "generate-download-url",
        invoke_options={
            "body": {"filename": filename},
        },
    )
    body = json.loads(response.decode())
    download_url = body['getUrl']

    download_file_streaming(download_url, local_path)
