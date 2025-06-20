import type { ColumnDef } from "@tanstack/table-core";
import { createRawSnippet } from "svelte";
import { renderSnippet } from "$lib/components/ui/data-table/index.js";
import { renderComponent } from "$lib/components/ui/data-table/index.js";
// import DataTableEmailButton from "./data-table-email-button.svelte";
import DataTableNameButton from "./data-table-name-button.svelte";
import DataTableCreatedonButton from "./data-table-createdon-button.svelte";
import DataTableCreatedbyButton from "./data-table-createdby-button.svelte";
import DataTableTypeButton from "./data-table-type-button.svelte";
import DataTableTypeIcon from "./data-table-type-icon.svelte";
import DataTablePermissionBadge from "./data-table-permission-badge.svelte";
import DataTableAbbvField from "./data-table-abbv_field.svelte";
import DataTableExperimentDateButton from "./data-table-experiment-date-button.svelte";

import DataTableActions from "./data-table-actions.svelte";

import { Checkbox } from "$lib/components/ui/checkbox/index.js";

// This type is used to define the shape of our data.
// You can use a Zod schema here if you want.
export type DirectoryEntityRow = {
  id: string;
  // parent_id: string;
  type: string;
  name: string;
  created_by: string;
  created_on: string;
  permission: string;
  // platform: string;
  // experiment_date: string;
};
 
export const columns: ColumnDef<DirectoryEntityRow>[] = [
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
    accessorKey: "type",
    header: ({ column }) =>
      renderComponent(DataTableTypeButton, {
        onclick: column.getToggleSortingHandler(),
      }),
    cell: ({ row }) =>
      renderComponent(DataTableTypeIcon, {
        // need to pass props here
        value: row.original.type
      }),
  },
  {
    accessorKey: "name",
    header: ({ column }) =>
      renderComponent(DataTableNameButton, {
        onclick: column.getToggleSortingHandler(),
      }),
    cell: ({ row }) =>
      renderComponent(DataTableAbbvField, {
        // need to pass props here
        value: row.original.name
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
  },
  {
    accessorKey: "permission",
    header: 'Permission',
    cell: ({ row }) =>
      renderComponent(DataTablePermissionBadge, {
        // need to pass props here
        permission: row.original.permission
      }),
  },
  {
    id: "actions",
    cell: ({ row }) => {
      // You can pass whatever you need from `row.original` to the component
      return renderComponent(DataTableActions, { id: row.original.id });
    },
  },
];