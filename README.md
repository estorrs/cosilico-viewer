# Viewer

A proof of concept for remote viewing application for multi-modal spatial datasets.

Check out the [experiment viewer](https://lighthearted-kulfi-ce56ba.netlify.app/portal/demo_429ed69f-28e9-4663-8e71-222a7fbc7533) and [directory portal](https://lighthearted-kulfi-ce56ba.netlify.app/portal/demo_directory_429ed69f-28e9-4663-8e71-222a7fbc7533) demos. 

## Motivation

The viewer is intented to be a proof of concept for an image viewer that also handles attached vector data (i.e. transcripts, cells, etc.). Downloading experiment data to view on your local machine really sucks, especially if you need to view a large number of samples. This type of remote viewer allows for data to be viewed through the browser, elimating that time consuming step. Additionally, since everything is browser based, we can construct an api that allows for uploading and downloading of experimental data in a synchronized format (no more tracking experimental files, etc.). 

Think of it as similar in function to a remote image viewer like [Omero](https://www.openmicroscopy.org/omero/), but in addition to viewing images, you can also view vector data on top, such as gene transcripts and cells. When viewing an experiemnt, only the relavent transcripts and image channels currently being viewed for a particular location in the image are fetched, rather than downloading all the data a priori. This allows for data efficient viewing applications on the web. 

## Installation

There are three main components: the viewing application (for viewing the data through the browser), python library (for downloading, uploading, and interacting with experiment data), and supabase (backend infrastructure, databases, storage, etc.).

Follow the following instructions to run locally. All three services must be running for the app to work.

#### Supabase

We use the free verison of [Supabase](https://supabase.com/) to organize all our databases and authorization policies.

First we need to install supabase.

```bash
npm install supabase
```

We can then run the supabase containers locally. Note you must have either [Docker Compose](https://docs.docker.com/compose/) or [Docker Desktop](https://docs.docker.com/desktop/) running on your machine.

```bash
cd infra/supabase
supabase start
```

In a seperate terminal, we also need to run the supabase edge functions.

```bash
supabase functions serve
```

To stop supabase, run:

```bash
supabase stop
```

#### Python library

A python client for interacting with the viewer. This includes uploading and downloading data. To install, run the following. We reccomended installing into a fresh virtual environment to avoid package conflicts. Here we use [Miniconda](https://www.anaconda.com/docs/getting-started/miniconda/main), but any virtual environment could be used. [Poetry](https://python-poetry.org/) must be installed as a prerequisite.

```bash
conda create -n cosilico-py -y -c conda-forge python poetry
conda activate cosilico-py

cd cosilico-py
poetry install
```

For an example of uploading and downloading experimental data, please see [this notebook](https://github.com/estorrs/viewer/blob/main/notebooks/data_preprocessing/populate_project.ipynb). This notebook must be run before logging into the frontend web application since the a user is created in the notebook. Use that email and password to login to the web application.


#### Viewing application

The frontend is built with [Svelte](https://svelte.dev/), a javascript framework.

```bash
cd cosilico-viewer
npm install
```

First, we need to create a .env file so our application can talk to supabase. To do so, copy `API URL` and `anon key` from the output of `supabase start` and create a .env file at cosilico-viewer/.env with the following contents.

```bash
PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321"
PUBLIC_SUPABASE_ANON_KEY = "YOUR_ANON_KEY"
```

To run the development server run the following.

```bash
npm run dev
```

The viewer is now available at `http://localhost:5173`.

To login go to `http://localhost:5173/auth`, you will then be directed to the directory portal containing your experiments you created and uploaded with cosilico-py.


## Concepts

#### Zarr

The way remote viewing is achieved is via Zarr files. We save experimental data in the Zarr format so that only parts of the zarrs with the relavent data are read, thereby avoiding downloading the whole dataset just to view a subset of the data.

Unfortunately, the reason this application remains a demo is when Zarr files get too big, the lookup for data downloading gets too slow, making viewing large experiments cumbersome. But it works great for small datasets! Say less than ~10k x 10x microns. 

