<script lang="ts">
 import { Badge } from "$lib/components/ui/badge/index.js";

 let { permission } = $props();

 let color = $state();
 if (permission == 'Read') {
    color = 'bg-cyan-500'
 } else if ( permission == 'Write') {
    color = 'bg-green-500'
 } else {
    color = 'bg-red-500'
 }
</script>
 
<!-- <Badge variant="outline">Badge</Badge> -->
<Badge class={`${color} text-white dark:${color}`}>{permission}</Badge>