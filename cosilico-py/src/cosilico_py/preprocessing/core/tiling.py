from collections.abc import Iterable
from typing import Annotated
import os
import tempfile


import numpy as np
import pandas as pd

def generate_tiled_data_grouped(
        df: Annotated[pd.DataFrame, 'Dataframe to be tiled. Must contain the following columns: feature_index, x_location, y_location. feature_index represents the variable to be grouped on. It should be an integer encoding representing the fields of the target variable. x_location and y_location specify location of the entity described by each row in the dataframe. '],
        n_per_group: Annotated[int, 'The number of fields to include in each group.'] = 100,
        grid_size: Annotated[int, 'Size of the grid to use when tiling.'] = 256,
    ) -> Annotated[pd.DataFrame, 'Input dataframe with grid and group columns added.']:
    """
    Will generate grouped, tiled data for a given Dataframe.
    """
    for col in ['feature_index', 'x_location', 'y_location']:
        assert col in df.columns, f'Required column {col} was not found in df.'

    index_col = 'feature_index'
    feat_counts = df[index_col].value_counts().sort_values()
    feats, _ = feat_counts.index.to_numpy(), feat_counts.values

    # Compute group assignments
    num_feats = len(feats)
    group_size = num_feats // n_per_group
    groups = np.arange(num_feats) % group_size  # Vectorized operation

    # Map features to groups
    feat_to_group = pd.Series(groups, index=feats, dtype="category")
    df["group"] = df[index_col].map(feat_to_group)

    # Compute grid location
    x_bins, _ = divmod(df["x_location"].to_numpy(), grid_size)
    y_bins, _ = divmod(df["y_location"].to_numpy(), grid_size)
    df["grid"] = pd.Categorical([f"{int(x)}_{int(y)}" for x, y in zip(x_bins, y_bins)])

    # Convert categorical columns
    df["group"] = df["group"].astype("category")
    df[index_col] = df[index_col].astype("category")

    # Use `MultiIndex` & sort
    df.set_index(["grid", "group", index_col], inplace=True)
    df.sort_index(inplace=True)

    # Reset index
    df.reset_index(index_col, inplace=True)

    return df

def compute_grid_centroids_multi(
        df: Annotated[pd.DataFrame, 'Dataframe to compute centroids for. Each row represents an object in 2D space. Must have the following columns: feature_index, x_location, y_location.'],
        bin_sizes: Annotated[Iterable[int], 'Bin sizes to generate centroid dataframes for.'],
        chunk_size: Annotated[int, 'Chunk size to use when batch processing.'] = 10_000_000,
        use_disk: Annotated[bool, 'Whether to write batch files to disk to decrease memory usage. Default is False'] = True,
        target_columns: Annotated[Iterable[str], 'Additional columns to compute means over.'] = None,
        group_by_index: Annotated[bool, 'Whether to group by index. Default is True.'] = True
    ) -> Annotated[dict[str, pd.DataFrame], 'Dictionary mapping bin size to its respective centroid dataframe. A centroid dataframe has x_location (centroid x), y_location (centroid y), bin_x (grid x position), bin_y (grid y position), and mean columns for target_columns if there were any present.']:
    """
    Compute centroids or mean of target values by binning data into fixed grid squares.
    """
    # may move these to function arguments, havent decided yet
    file_format="parquet"
    result_col='count'
    index_col='feature_index'

    temp_dirs = {bin_size: tempfile.mkdtemp() for bin_size in bin_sizes} if use_disk else {}
    chunk_files = {bin_size: [] for bin_size in bin_sizes} if use_disk else {}
    final_results = {bin_size: [] for bin_size in bin_sizes}

    for chunk_start in range(0, len(df), chunk_size):
        chunk = df.iloc[chunk_start:chunk_start + chunk_size]

        x_coords = chunk["x_location"].to_numpy()
        y_coords = chunk["y_location"].to_numpy()
        if group_by_index:
            feature_indices = chunk[index_col].to_numpy()

        if target_columns:
            targets = {col: chunk[col].to_numpy(dtype=np.float64) for col in target_columns}

        for bin_size in bin_sizes:
            bin_x = (x_coords // bin_size).astype(np.int32)
            bin_y = (y_coords // bin_size).astype(np.int32)

            if group_by_index:
                group_keys = np.column_stack((feature_indices, bin_x, bin_y))
            else:
                group_keys = np.column_stack((bin_x, bin_y))

            unique_bins, bin_idx = np.unique(group_keys, axis=0, return_inverse=True)
            num_bins = len(unique_bins)

            sum_x = np.zeros(num_bins, dtype=np.float64)
            sum_y = np.zeros(num_bins, dtype=np.float64)
            counts = np.zeros(num_bins, dtype=np.int32)
            if target_columns:
                target_sums = {col: np.zeros(num_bins, dtype=np.float64) for col in target_columns}

            np.add.at(sum_x, bin_idx, x_coords)
            np.add.at(sum_y, bin_idx, y_coords)
            np.add.at(counts, bin_idx, 1)
            if target_columns:
                for col in target_columns:
                    np.add.at(target_sums[col], bin_idx, targets[col])

            centroids_x = sum_x / counts
            centroids_y = sum_y / counts
            if target_columns:
                target_means = {col: target_sums[col] / counts for col in target_columns}

            data = {
                "bin_x": unique_bins[:, -2],
                "bin_y": unique_bins[:, -1],
                "x_location": centroids_x,
                "y_location": centroids_y,
                result_col: counts
            }
            if group_by_index:
                data[index_col] = unique_bins[:, 0]
            if target_columns:
                for col in target_columns:
                    data[col] = target_means[col]

            chunk_df = pd.DataFrame(data)

            if use_disk:
                chunk_file = os.path.join(temp_dirs[bin_size], f"chunk_{chunk_start}.{file_format}")
                if file_format == "parquet":
                    chunk_df.to_parquet(chunk_file, index=False)
                elif file_format == "feather":
                    chunk_df.to_feather(chunk_file)
                elif file_format == "h5":
                    chunk_df.to_hdf(chunk_file, key="df", mode="w")
                elif file_format == "pkl":
                    chunk_df.to_pickle(chunk_file)
                else:
                    raise ValueError("Unsupported file format!")
                chunk_files[bin_size].append(chunk_file)
            else:
                final_results[bin_size].append(chunk_df)

    merged_results = {}

    for bin_size in bin_sizes:
        if use_disk:
            chunk_files_list = [
                pd.read_parquet(f) if file_format == "parquet"
                else pd.read_feather(f) if file_format == "feather"
                else pd.read_hdf(f) if file_format == "h5"
                else pd.read_pickle(f)
                for f in chunk_files[bin_size]
            ]
            df_concat = pd.concat(chunk_files_list, ignore_index=True)
            for f in chunk_files[bin_size]:
                os.remove(f)
            os.rmdir(temp_dirs[bin_size])
        else:
            df_concat = pd.concat(final_results[bin_size], ignore_index=True)

        group_cols = ["bin_x", "bin_y"]
        if group_by_index:
            group_cols = [index_col] + group_cols

        agg_dict = {
            "x_location": ("x_location", "mean"),
            "y_location": ("y_location", "mean"),
            result_col: (result_col, "sum")
        }
        if target_columns:
            for col in target_columns:
                agg_dict[col] = (col, "mean")

        final_df = df_concat.groupby(group_cols, as_index=False).agg(**agg_dict)
        merged_results[bin_size] = final_df

    return merged_results