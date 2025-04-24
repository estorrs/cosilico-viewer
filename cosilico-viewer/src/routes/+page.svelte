<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import ZarrTileViewer from "$lib/ZarrTileViewer.svelte";
    import ViewerSidebar from "$lib/ViewerSidebar.svelte";
    import PointViewOptions from "$lib/sidebar/PointViewOptions.svelte";
    import FieldOptions from "$lib/sidebar/FieldOptions.svelte";
    import PaletteSelector from "$lib/sidebar/PaletteSelector.svelte";
    import ContinuousOptions from "$lib/sidebar/ContinuousOptions.svelte";
    import Sandbox from "$lib/Sandbox.svelte";
   </script>

<h1>Welcome to SvelteKit</h1>
<p>Visit <a href="https://svelte.dev/docs/kit">svelte.dev/docs/kit</a> to read the documentation</p>

<!-- <ViewerSidebar /> -->

<!-- <FieldOptions /> -->
 <!-- <Sandbox /> -->

<!-- <PaletteSelector /> -->

<!-- <PointViewOptions /> -->

<!-- <ContinuousOptions /> -->
<ZarrTileViewer />