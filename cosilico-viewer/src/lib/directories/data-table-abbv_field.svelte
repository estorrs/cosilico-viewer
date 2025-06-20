
<script lang="ts">
 import * as Tooltip from "$lib/components/ui/tooltip/index.js";

 let { value, href = null } = $props();

 href = '/portal/root'

 const truncate = (value: string, n=24) => value.length > n ? value.slice(0, n-1) + "…" : value;
 const truncated = truncate(value);

</script>
 
<Tooltip.Provider>
 <Tooltip.Root>
  {#if href}
    <Tooltip.Trigger> <a
        href={href}
        class="text-black hover:underline focus:outline-none focus:ring-2 focus:ring-ring rounded-sm"
      >
        {truncated}
      </a></Tooltip.Trigger>
  {/if}
  {#if href == null}
   <Tooltip.Trigger>{truncated}</Tooltip.Trigger>
  {/if}
  <Tooltip.Content>
   <p>{value}</p>
  </Tooltip.Content>
 </Tooltip.Root>
</Tooltip.Provider>

