<script lang="ts">
 import { goto } from '$app/navigation';
 import type { ViewSettingRow } from '$lib/view-settings/columns.js';
 import { columns } from '$lib/view-settings/columns.js';
 import ViewSettingsTable from '$lib/view-settings/view-settings-table.svelte';
 import EllipsisIcon from "@lucide/svelte/icons/ellipsis";
 import { Button } from "$lib/components/ui/button/index.js";
 import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
   import * as Alert from "$lib/components/ui/alert/index.js";
 import AlertCircleIcon from "@lucide/svelte/icons/alert-circle";
    import DialogFooter from '$lib/components/ui/dialog/dialog-footer.svelte';
    import { Footer } from '$lib/components/ui/table/index.js';
 
 let { row, viewSettingsData, onViewSettingsImport = (experimentId, importId) => null, href = null, new_tab = false }: { viewSettingsData: ViewSettingRow[], href: string | null, new_tab: boolean } = $props();
 
  let dialogOpen = $state(false);
  console.log('viewSettingsData', $state.snapshot(viewSettingsData));
</script>
 
<DropdownMenu.Root>
 <DropdownMenu.Trigger>
  {#snippet child({ props })}
   <Button
    {...props}
    variant="ghost"
    size="icon"
    class="relative size-8 p-0"
   >
    <span class="sr-only">Open menu</span>
    <EllipsisIcon />
   </Button>
  {/snippet}
 </DropdownMenu.Trigger>
 <DropdownMenu.Content>
  <DropdownMenu.Group>
   <DropdownMenu.Label>Actions</DropdownMenu.Label>
   <DropdownMenu.Item>
    {#if new_tab}
      <a href={href} target="_blank" rel="noopener noreferrer" onclick={(event) => event.stopPropagation()}>
          Open
      </a>
    {/if}
     {#if !new_tab}
      <a href={href} onclick={(event) => event.stopPropagation()}>
          Open
      </a>
    {/if}
  </DropdownMenu.Item>
  </DropdownMenu.Group>
  <DropdownMenu.Separator />
  <DropdownMenu.Item onSelect={() => {
    dialogOpen = true
    console.log('dialog open', dialogOpen);
    }}
    >Import view settings</DropdownMenu.Item>
  <DropdownMenu.Item>Share</DropdownMenu.Item>
  <DropdownMenu.Separator />
  <DropdownMenu.Item>Delete</DropdownMenu.Item>
 </DropdownMenu.Content>


</DropdownMenu.Root>

 <Dialog.Root bind:open={dialogOpen}>
    <Dialog.Content>
      <Dialog.Header>
        <Dialog.Title>Import view settings</Dialog.Title>
        <Dialog.Description>
          Will attempt to apply view settings to this experiment. Note that if layer names and fields differ between experiments, not all view settings may import properly.
        </Dialog.Description>
        <Alert.Root variant="destructive">
        <AlertCircleIcon />
        <Alert.Title>Caution!</Alert.Title>
        <Alert.Description>Import of view settings will overwrite existing view settings. If you wish to save current view settings, export them first.</Alert.Description>
      </Alert.Root>
      </Dialog.Header>
      <ViewSettingsTable {columns} data={viewSettingsData} onRowClick={(viewSettingsId) => {
        onViewSettingsImport(row.experiment_id, viewSettingsId);
        dialogOpen = false;
      }}/>
    </Dialog.Content>
  </Dialog.Root>