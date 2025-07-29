# Viewer

*A proof‑of‑concept web viewer for multi‑modal spatial datasets.*

[**Experiment Viewer Demo**](https://lighthearted-kulfi-ce56ba.netlify.app/portal/demo_429ed69f-28e9-4663-8e71-222a7fbc7533)\
[**Directory Portal Demo**](https://lighthearted-kulfi-ce56ba.netlify.app/portal/demo_directory_429ed69f-28e9-4663-8e71-222a7fbc7533)

---

## Motivation (Why another viewer?)

Moving multi‑gigabyte experiments to your laptop to view a handful of genes is painful. **Viewer** streams only the imagery and vector features (gene transcripts, segmented cells, etc.) that are visible into your browser window. I.e., no pre‑downloads, no file wrangling.

Because the entire stack is exposed through a Python API, the same infrastructure allows for uploads, downloads, and synchronized metadata, all in easy-to-use formats.

Think [Omero](https://www.openmicroscopy.org/omero/), but with support for spatial‑omics vector data.

---

## System overview

The application as a whole has three main components.

| Layer          | Tech                                                  | Role                                      |
| -------------- | ----------------------------------------------------- | ----------------------------------------- |
| **Frontend**   | SvelteKit - OpenLayers - Zarrita                      | Browser rendering                         |
| **Backend**    | Supabase (PostgreSQL, edge functions, object storage) | Auth, metadata, tile & vector serving     |
| **Python SDK** |                                                       | Programmatic upload, download, automation |

---

## Quick start (local)

> **Prereqs**: Docker (or Docker Desktop), Node ≥ 18, Conda (or another venv), Python ≥ 3.9, Poetry.

### 1. Boot Supabase

```bash
npm install -g supabase
cd infra/supabase
supabase start # launches Postgres, storage
supabase functions serve  # run in a second terminal, launches Edge runtime
```

Shut everything down with:

```bash
supabase stop
```

### 2. Install the Python SDK

```bash
conda create -n cosilico-py -c conda-forge python=3.10 poetry -y
conda activate cosilico-py

cd cosilico-py
poetry install
```

Run [`notebooks/data_preprocessing/populate_project.ipynb`](https://github.com/estorrs/viewer/blob/main/notebooks/data_preprocessing/populate_project.ipynb) to:

1. Register a demo user.
2. Upload an example experiment.
3. Verify the upload.

### 3. Launch the viewer

```bash
cd cosilico-viewer
npm install
```

First, we need to create a .env file so our application can talk to supabase. To do so, copy `API URL` and `anon key` from the output of `supabase start` and create a .env file at `cosilico-viewer/.env` with the following contents.

```bash
PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321"
PUBLIC_SUPABASE_ANON_KEY = "YOUR_ANON_KEY"
```

Then run:

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173), log in with the credentials used in the [populate_project notebook](https://github.com/estorrs/viewer/blob/main/notebooks/data_preprocessing/populate_project.ipynb), and start exploring.

---

## How on‑demand streaming works

Data are stored as chunked **Zarr** arrays in object storage. Each pan/zoom operation requests only the raster tiles and vector chunks overlapping the viewport. This keeps network traffic and memory to the minimum size necessary to see what is on your screen.

> **A quick note:**: Performance is good for datasets up to \~10 k × 10 k µm. For larger experiments, however, the S3 listing latency becomes noticeable; we’re working on smarter indexing. But until then, the applications mostly serves as a proof-of-concept.

---

## Roadmap

- **Permissions & sharing** — Role‑based controls for collaborative projects. Allow for sharable links for collaborators.
- **Scalability** — Improved Zarr formatting to allow visualization of large experiments.
- **Workflows** — New notebooks demonstrating various spatial workflows, along with integration into the viewer.
- **Documentation** - More comprehensive documentation.
- **More experimental platforms** - Build converters for more experimental formats (currently only supports 10X Xenium).

