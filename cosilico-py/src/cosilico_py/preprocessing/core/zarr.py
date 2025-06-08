import zarr

def get_group_size(group, unit="MB"):
    """
    Get size of a zarr hierarchy group
    """
    size_bytes = sum(arr.nbytes for arr in group.values() if isinstance(arr, zarr.Array))

    unit_map = {"B": 1, "KB": 1e3, "MB": 1e6, "GB": 1e9}
    return size_bytes / unit_map[unit]