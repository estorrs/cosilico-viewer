<script lang="ts">
	import { Input } from '$lib/components/ui/input/index.js';
	import { Toggle } from '$lib/components/ui/toggle/index.js';
	import Lock from '@lucide/svelte/icons/lock';

	import ScaleLine from './ScaleLine.svelte';
    import ColoredSlider from '$lib/components/ui/slider-colored/ColoredSlider.svelte';

	let {
		zoom,
		isLocked,
		upp = 1,
		unit = 'px',
		minZoom = 1,
		maxZoom = 100,
		onZoomChange = (v) => null,
		onLockedChange = (v) => null,
		step = 1
	} = $props();

    let redrawScaleBar = $state(false);

	// let zoom = $state(10);
	// let isLocked = $state(false);

	function vSliderSetValues(vs) {
		zoom = Number(vs[0]);
		onZoomChange(zoom);
        redrawScaleBar = !redrawScaleBar;
	}
</script>
<!-- 
<div>
	<div class="flex w-full items-center gap-3"> -->
<div class="flex items-center gap-2 pt-1 w-full">
	<div class="flex items-center gap-2 pt-1 w-64">

        <ColoredSlider
			bind:value={() => [zoom], (vs) => vSliderSetValues(vs)}
			orientation={'horizontal'}
			min={minZoom}
			max={maxZoom}
			{step}
			class="flex-1"

		/>
            
		<Input
			type="number"
			value={zoom}
			{step}
			onchange={(e) => {
				zoom = Number(e.target.value);
				onZoomChange(zoom);
			}}
			class="w-[70px] py-1 text-left"
		/>
		<Toggle
			bind:pressed={isLocked}
			onPressedChange={(v) => {
				onLockedChange(v);
			}}
            class="data-[state=on]:bg-yellow-500 hover:bg-yellow-500 p-2 rounded"
		>
			<Lock color='white'/>
		</Toggle>
	</div>
	<div class='ml-auto'>
        {#key redrawScaleBar}
		<ScaleLine {zoom} {upp} {unit} />
        {/key}
	</div>
</div>
