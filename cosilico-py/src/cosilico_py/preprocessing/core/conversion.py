from typing import Annotated

import dask.array as da
import numpy as np

def da_to_uint8(
        dask_array: Annotated[da.Array, "Dask array to be converted to uint8."]
    ) -> da.Array:
    """
    Convert a Dask array to uint8.
    """
    min_val, max_val = da.compute(dask_array.min(), dask_array.max())

    if max_val == min_val:
        return (dask_array > min_val).astype(np.uint8) * 255 

    return ((dask_array - min_val) / (max_val - min_val) * 255).astype(np.uint8)

