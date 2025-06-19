import type { ColumnDef } from "@tanstack/table-core";
import { createRawSnippet } from "svelte";
import { renderSnippet } from "$lib/components/ui/data-table/index.js";
import { renderComponent } from "$lib/components/ui/data-table/index.js";
import DataTableEmailButton from "./data-table-email-button.svelte";
import DataTableActions from "./data-table-actions.svelte";

import { Checkbox } from "$lib/components/ui/checkbox/index.js";

// This type is used to define the shape of our data.
// You can use a Zod schema here if you want.


export type Payment = {
  id: string;
  amount: number;
  status: "pending" | "processing" | "success" | "failed";
  email: string;
};

 
export const columns: ColumnDef<Payment>[] = [
 {
  accessorKey: "amount",
  header: () => {
   const amountHeaderSnippet = createRawSnippet(() => ({
    render: () => `<div class="text-right">Amount</div>`,
   }));
   return renderSnippet(amountHeaderSnippet, "");
  },
  cell: ({ row }) => {
   const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
   });
 
   const amountCellSnippet = createRawSnippet<[string]>((getAmount) => {
    const amount = getAmount();
    return {
     render: () => `<div class="text-right font-medium">${amount}</div>`,
    };
   });
 
   return renderSnippet(
    amountCellSnippet,
    formatter.format(parseFloat(row.getValue("amount")))
   );
  },
 },
 {
    id: "actions",
    cell: ({ row }) => {
      // You can pass whatever you need from `row.original` to the component
      return renderComponent(DataTableActions, { id: row.original.id });
    },
  },
  {
    accessorKey: "email",
    header: ({ column }) =>
      renderComponent(DataTableEmailButton, {
        onclick: column.getToggleSortingHandler(),
      }),
  },
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
];