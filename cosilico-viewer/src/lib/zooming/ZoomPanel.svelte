<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Slider } from '$lib/components/ui/slider';
	import { Toggle } from '$lib/components/ui/toggle';
	import Lock from '@lucide/svelte/icons/lock';

	import ScaleLine from './ScaleLine.svelte';

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

	// let zoom = $state(10);
	// let isLocked = $state(false);

	function vSliderSetValues(vs) {
		zoom = Number(vs[0]);
		onZoomChange(zoom);
	}
</script>
<!-- 
<div>
	<div class="flex w-full items-center gap-3"> -->
<div class="flex items-center gap-2 pt-1 w-full">
	<div class="flex items-center gap-2 pt-1 w-64">
		<Slider
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
		>
			<Lock />
		</Toggle>
	</div>
	<div class='ml-auto'>
		<ScaleLine {zoom} {upp} {unit} />
	</div>
</div>

<!-- <script>
    import SingleSlider from "$lib/widgets/SingleSlider.svelte";
    // import Slider from "$lib/components/ui/slider/slider.svelte";
    // import { Slider } from "bits-ui";
    import Button from "$lib/components/ui/button/button.svelte";
    import Toggle from "$lib/components/ui/toggle/toggle.svelte";
	import ChevronDown from "@lucide/svelte/icons/chevron-down";

    let {
        // zoom,
        // isLocked,
        minZoom = 1,
        maxZoom = 1000,
		// getZoomLevel = () => null,
		setZoomLevel = (res) => null,
        setZoomLock = (bool) => null,
	} = $props();

    let zoom = $state(100);
    let isLocked = $state(false);

    // function setValues(vs) {
    //     zoom = Number(vs[0]);
    //     setZoomLevel(zoom);

    // }


</script>

<div>
    <SingleSlider
        value={zoom}
        vMin={minZoom}
        vMax={maxZoom}
        title={'Zoom'}
        onValueChange={(v) => {
            setZoomLevel(v);
        }}
        step={1}
        location='left'
        />
    <Toggle bind:pressed={isLocked} onPressedChange={(v) => {
            setZoomLock(v);
        }}>
        <ChevronDown />
	</Toggle>
</div>
 -->
