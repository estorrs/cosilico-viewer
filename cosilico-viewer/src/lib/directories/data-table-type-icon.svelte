<script lang="ts">
 import Folder from "@lucide/svelte/icons/folder";
 import Microscope from "@lucide/svelte/icons/microscope";
 import Badge from "$lib/components/ui/badge/badge.svelte";

 import { generateColorMapping } from "$lib/openlayers/ColorHelpers.js";
 
 let { value, platform = null } = $props();

 let platforms = [
    '10X Xenium',
    '10X Visium',
    '10X Visium HD',
    'NanoString GeoMx',
    'Curio Bioscience Slide-seq',
    'NanoString CosMx',
    'H&E',
    'IHC',
    'Unknown'
 ];
 let platformToColor = generateColorMapping('pastel', platforms);
 const color = platformToColor.get(platform);

 const name_mapping = new Map([
    ['10X Xenium', 'Xenium'],
    ['10X Visium', 'Visium'],
    ['10X Visium HD', 'VisiumHD'],
    ['NanoString GeoMx', 'GeoMx'],
    ['Curio Bioscience Slide-seq', 'Slide-seq'],
    ['NanoString CosMx', 'CosMx'],
    ['H&E', 'H&E'],
    ['IHC', 'IHC'],
    ['Unknown', 'UNK']
]);

</script>
 
<!-- <div class="text-center align-middle w-10">
  <div class="flex items-center justify-center"> -->
    {#if value == 'directory'}
        <Folder class='size-5'/>
    {/if}
    {#if value == 'experiment'}
        <!-- <Microscope color={"orange"} class='size-5'/> -->
         
         <Badge style={`background-color: ${color};`} class={`text-white text-xs`}>{name_mapping.get(platform)}</Badge>
    {/if}
<!-- </div> -->
<!-- </div> -->