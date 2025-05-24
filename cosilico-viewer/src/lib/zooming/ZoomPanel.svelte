<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Slider } from '$lib/components/ui/slider';
    // import { Slider } from 'bits-ui';
	import { Toggle } from '$lib/components/ui/toggle';
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
		<!-- <Slider
			bind:value={() => [zoom], (vs) => vSliderSetValues(vs)}
			orientation={'horizontal'}
			min={minZoom}
			max={maxZoom}
			{step}
			class="flex-1 bg-yellow-500"

		/> -->

        <ColoredSlider
			bind:value={() => [zoom], (vs) => vSliderSetValues(vs)}
			orientation={'horizontal'}
			min={minZoom}
			max={maxZoom}
			{step}
			class="flex-1"

		/>
            
        <!-- <Slider.Root
        bind:value={() => [zoom], (vs) => vSliderSetValues(vs)}
			orientation={'horizontal'}
			min={minZoom}
			max={maxZoom}
			{step}
			class="flex-1 "
        >
            <Slider.Track class="bg-yellow-100">
    <Slider.Range class="bg-yellow-500" />
  </Slider.Track>
        </Slider.Root> -->
		<!-- <Input
			type="number"
			value={zoom}
			{step}
			onchange={(e) => {
				zoom = Number(e.target.value);
				onZoomChange(zoom);
			}}
			class="w-[70px] py-1 text-left"
		/> -->
		<Toggle
			bind:pressed={isLocked}
			onPressedChange={(v) => {
				onLockedChange(v);
			}}
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
