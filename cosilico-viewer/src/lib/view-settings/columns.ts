import type { ColumnDef } from "@tanstack/table-core";
import { renderComponent } from "$lib/components/ui/data-table/index.js";
import DataTableNameButton from "$lib/directories/data-table-name-button.svelte";
import DataTableAbbvField from "$lib/directories/data-table-abbv_field.svelte";
import DataTableCreatedonButton from "$lib/directories/data-table-createdon-button.svelte";
import DataTableCreatedbyButton from "$lib/directories/data-table-createdby-button.svelte";

import { Checkbox } from "$lib/components/ui/checkbox/index.js";

export type ViewSettingRow = {
  id: string;
  name: string;
  created_by: string;
  created_on: string;
};

export const columns: ColumnDef<ViewSettingRow>[] = [
  {
    id: "select",
    header: ({ table }) =>
      renderComponent(Checkbox, {
        checked: table.getIsAllPageRowsSelected(),
        indeterminate:
          table.getIsSomePageRowsSelected() &&
          !table.getIsAllPageRowsSelected(),
        onCheckedChange: (value) => table.toggleAllPageRowsSelected(!!value),
        "aria-label": "Select all",
      }),
    cell: ({ row }) =>
      renderComponent(Checkbox, {
        checked: row.getIsSelected(),
        onCheckedChange: (value) => row.toggleSelected(!!value),
        "aria-label": "Select row",
      }),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "name",
    header: ({ column }) =>
      renderComponent(DataTableNameButton, {
        onclick: column.getToggleSortingHandler(),
      }),
    cell: ({ row }) =>
      renderComponent(DataTableAbbvField, {
        value: row.original.name,
      }),
  },
  {
    accessorKey: "created_on",
    header: ({ column }) =>
      renderComponent(DataTableCreatedonButton, {
        onclick: column.getToggleSortingHandler(),
      }),
    cell: ({ row }) => {
      const full = row.original.created_on;
      const date = typeof full === 'string' ? full.split('T')[0] : '';
      return date;
    }
  },
  {
    accessorKey: "created_by",
    header: ({ column }) =>
      renderComponent(DataTableCreatedbyButton, {
        onclick: column.getToggleSortingHandler(),
      }),
    cell: ({ row }) =>
      renderComponent(DataTableAbbvField, {
        value: row.original.created_by,
        abbv_type: 'name'
      }),
  },
];