<script lang="ts">
 import { Button, buttonVariants } from "$lib/components/ui/button/index.js";
 import * as Dialog from "$lib/components/ui/dialog/index.js";
 import * as Alert from "$lib/components/ui/alert/index.js";
 import { Input } from "$lib/components/ui/input/index.js";
 import { Label } from "$lib/components/ui/label/index.js";
 import { Switch } from "$lib/components/ui/switch/index.js";
 import Save from "@lucide/svelte/icons/save";
 import AlertCircleIcon from "@lucide/svelte/icons/alert-circle";

 import type { EventHandler } from 'svelte/elements'

 let {
    onSaveViewSettings = () => null,
    onExportViewSettings = (name) => null,
    supabase = null,
 } = $props();

 let dialogOpen = $state(false);
 let isAvailable = $state(true);
 let isChecked = $state(false);
 let dropdownKey = $state(false);

 let buttonText = $state('Save view settings')
 let name = $state('My beautiful settings');

 async function nameIsAvailable(name) {
   const { data, error } = await supabase
    .from('view_settings')
    .select('name')
    .eq('name', name)
  
   if (data.length == 0) {
    return true;
   }
   return false;
  }
</script>


<Dialog.Root bind:open={dialogOpen}>
 <Dialog.Trigger title='Save view settings' class={buttonVariants({ variant: "default", class: 'hover:bg-yellow-500 bg-black' })}>
    <Save color="#ffffff" />
  </Dialog.Trigger>
 <Dialog.Content class="sm:max-w-[425px]">
  <Dialog.Header>
   <Dialog.Title>Save</Dialog.Title>
   <Dialog.Description>
    Save or export your view settings.
   </Dialog.Description>
  </Dialog.Header>
  <div class="flex items-center space-x-2">
    <Switch
      id="export" 
      checked={isChecked}
	  onCheckedChange={(v) => { 
        isChecked = v;
        dropdownKey = !dropdownKey;

        buttonText = isChecked ? 'Export view settings' : 'Save view settings';
      }}
      />
    <Label for="export">Export view settings</Label>
  </div>
  {#key dropdownKey}
    {#if isChecked}
        <div class="grid gap-4 py-4">
        <div class="grid grid-cols-4 items-center gap-4">
            <Label for="name" class="text-right">Name</Label>
            <Input id="name" bind:value={name} class="col-span-3" />
        </div>
        </div>
    {/if}
  {/key}
  {#key isAvailable}
    {#if !isAvailable}
    <Alert.Root variant="destructive">
      <AlertCircleIcon />
      <Alert.Title>Unable to export view settings.</Alert.Title>
      <Alert.Description>Name is already taken.</Alert.Description>
    </Alert.Root>
    {/if}
    {/key}
  <Dialog.Footer>
   <!-- <Dialog.Close> -->
    <Button onclick={async () => {
     if (!isChecked) {
        onSaveViewSettings();
        dialogOpen = false;
     } else {
        isAvailable = await nameIsAvailable(name);
        console.log('name is available', isAvailable);
        if (isAvailable) {
          onExportViewSettings(name);
          dialogOpen = false;
        }
     }
    }}
    >
    {buttonText}
   </Button>
  <!-- </Dialog.Close> -->
  </Dialog.Footer>
 </Dialog.Content>
</Dialog.Root>