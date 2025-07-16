<script lang="ts">
 import { goto } from '$app/navigation';
 import EllipsisIcon from "@lucide/svelte/icons/ellipsis";
 import { Button } from "$lib/components/ui/button/index.js";
 import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
 
 let { id, href = null }: { id: string, href: string | null } = $props();
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
    <a href={href} onclick={(event) => event.stopPropagation()}>
        Open
    </a>
  </DropdownMenu.Item>
  </DropdownMenu.Group>
  <DropdownMenu.Separator />
  <DropdownMenu.Item>Share</DropdownMenu.Item>
  <DropdownMenu.Separator />
  <DropdownMenu.Item>Delete</DropdownMenu.Item>
 </DropdownMenu.Content>


</DropdownMenu.Root>