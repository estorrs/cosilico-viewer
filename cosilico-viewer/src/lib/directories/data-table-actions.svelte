<script lang="ts">
 import { goto } from '$app/navigation';
 import EllipsisIcon from "@lucide/svelte/icons/ellipsis";
 import { Button } from "$lib/components/ui/button/index.js";
 import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
 
 let { id, href = null, new_tab = false }: { id: string, href: string | null, new_tab: boolean } = $props();
 console.log('href', href);
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
  <DropdownMenu.Item>Share</DropdownMenu.Item>
  <DropdownMenu.Separator />
  <DropdownMenu.Item>Delete</DropdownMenu.Item>
 </DropdownMenu.Content>


</DropdownMenu.Root>