<script lang="ts">
 import Folder from "@lucide/svelte/icons/folder";
 import Microscope from "@lucide/svelte/icons/microscope";
 
 let { value } = $props();
</script>
 
<td class="text-center align-middle w-10">
  <div class="flex items-center justify-center">
    {#if value == 'directory'}
        <Folder class='size-5'/>
    {/if}
    {#if value == 'experiment'}
        <Microscope color={"orange"} class='size-5'/>
    {/if}
</div>
</td>