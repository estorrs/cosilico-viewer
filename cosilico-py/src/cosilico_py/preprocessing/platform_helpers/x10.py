import h5py
import pandas as pd
from scipy import sparse

from cosilico_py.ports.anndata import AnnData

def read_10x_h5(filepath, genome=None):
    with h5py.File(filepath, "r") as f:
        # Default path: matrix or genome-specific
        if "matrix" in f:
            grp = f["matrix"]
        elif genome:
            grp = f[genome]
        else:
            raise ValueError("No 'matrix' group found and no genome specified.")

        # Read sparse matrix components
        data = grp["data"][:]
        indices = grp["indices"][:]
        indptr = grp["indptr"][:]
        shape = grp["shape"][:]

        # Build sparse matrix
        matrix = sparse.csc_matrix((data, indices, indptr), shape=shape)

        # Get barcodes and gene info
        barcodes = grp["barcodes"][:].astype(str)

        # Newer versions (v3) have "features" instead of "genes"
        features = grp["features"]
        gene_ids = features["id"][:].astype(str)
        gene_names = features["name"][:].astype(str)

        var = pd.DataFrame({"gene_ids": gene_ids, "gene_names": gene_names})
        var = var.set_index('gene_names')
        obs = pd.DataFrame(index=barcodes)
        obs.index = barcodes

        adata = AnnData(matrix.T, obs, var)

    return adata

