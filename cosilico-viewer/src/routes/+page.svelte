<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import ZarrTileViewer from "$lib/ZarrTileViewer.svelte";
    import ViewerSidebar from "$lib/ViewerSidebar.svelte";
    import PointViewOptions from "$lib/sidebar/PointViewOptions.svelte";
    import FieldOptions from "$lib/sidebar/FieldOptions.svelte";
    import PaletteSelector from "$lib/sidebar/PaletteSelector.svelte";
    import ContinuousOptions from "$lib/sidebar/ContinuousOptions.svelte";
    import Sandbox from "$lib/Sandbox.svelte";
    import SearchableOptions from "$lib/widgets/SearchableOptions.svelte";
    import FilterOptions from "$lib/sidebar/FilterOptions.svelte";
    import DoubleSlider from "$lib/widgets/DoubleSlider.svelte";
    import SingleSlider from "$lib/widgets/SingleSlider.svelte";
   </script>

<h1>Welcome to SvelteKit</h1>
<p>Visit <a href="https://svelte.dev/docs/kit">svelte.dev/docs/kit</a> to read the documentation</p>


<!-- <SingleSlider
   value={5}
   vMin={0}
   vMax={10}
   title={'woohoo'}
   onValueChange={(v) => null}
   step={.01}
/> -->

<!-- <DoubleSlider 
    minValue={1}
    maxValue={9.5}
    vMin={0}
    vMax={10}
    title={'Woohoo'}
    onMinValueChange={(v) => null}
    onMaxValueChange={(v) => null}
    step={0.01}
    /> -->
<!-- <FilterOptions /> -->

<!-- <ViewerSidebar /> -->
 <!-- <SearchableOptions names={['a', 'b', 'c', 'd', 'e']}/> -->

<!-- <FieldOptions /> -->
 <!-- <Sandbox /> -->

<!-- <PaletteSelector /> -->

<!-- <PointViewOptions /> -->

<!-- <ContinuousOptions /> -->
<ZarrTileViewer />