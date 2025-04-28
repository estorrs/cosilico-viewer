<script lang="ts">
	import * as Accordion from '$lib/components/ui/accordion';
	import { Button, buttonVariants } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card';
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label/index.js';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import { Separator } from '$lib/components/ui/separator';
	import { Slider } from '$lib/components/ui/slider';
	import * as Tabs from '$lib/components/ui/tabs/index.js';
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';
	import SwatchSelector from '$lib/components/ui/swatch-selector/SwatchSelector.svelte';
	import Regex from '@lucide/svelte/icons/regex';
	import Shapes from '@lucide/svelte/icons/shapes';
	import ScrollArea from '$lib/components/ui/scroll-area/scroll-area.svelte';
	import * as Sheet from '$lib/components/ui/transparent-sheet/index.js';

	let {
		view,
		onPointScaleChange = (e) => null,
		onFillOpacityChange = (e) => null,
		onStrokeOpacityChange = (e) => null,
		onStrokeWidthChange = (e) => null,
		onStrokeColorChange = (e) => null,
		minScale = 0,
		maxScale = 4,
		minStrokeWidth = 0,
		maxStrokeWidth = 4
	} = $props();

	let customAnchor = $state<HTMLElement>(null!);

	// let view = $state({
	// 	viewAs: 'point',
	// 	scale: 1.0,
	// 	fillOpacity: 1.0,
	// 	strokeOpacity: 1.0,
	// 	strokeWidth: 1.0,
	//  strokeColor: '#aaaaaa'
	// })

	let swatchHexs = $state([view.strokeColor]);

	function scaleSliderGetValue() {
		return [view.scale];
	}

	function scaleSliderSetValue(v) {
		v = Number(v[0]);
		onPointScaleChange(v);
	}

	function scaleInputGetValue() {
		return view.scale;
	}

	function scaleInputSetValue(v) {
		v = Number(v);
		onPointScaleChange(v);
	}

	function fillOpacitySliderGetValue() {
		return [view.fillOpacity];
	}

	function fillOpacitySliderSetValue(v) {
		v = Number(v[0]);
		onFillOpacityChange(v);
	}

	function fillOpacityInputGetValue() {
		return view.fillOpacity;
	}

	function fillOpacityInputSetValue(v) {
		v = Number(v);
		onFillOpacityChange(v);
	}

	function strokeOpacitySliderGetValue() {
		return [view.strokeOpacity];
	}

	function strokeOpacitySliderSetValue(v) {
		v = Number(v[0]);
		onStrokeOpacityChange(v);
	}

	function strokeOpacityInputGetValue() {
		return view.strokeOpacity;
	}

	function strokeOpacityInputSetValue(v) {
		v = Number(v);
		onStrokeOpacityChange(v);
	}

	function strokeWidthSliderGetValue() {
		return [view.strokeWidth];
	}

	function strokeWidthSliderSetValue(v) {
		v = Number(v[0]);
		onStrokeWidthChange(v);
	}

	function strokeWidthInputGetValue() {
		return view.strokeWidth;
	}

	function strokeWidthInputSetValue(v) {
		v = Number(v);
		onStrokeWidthChange(v);
	}
</script>

<Sheet.Root>
	<Sheet.Trigger>
		<Tooltip.Provider>
			<Tooltip.Root>
				<Tooltip.Trigger class={buttonVariants({ variant: 'outline' })}>
					<Shapes />
				</Tooltip.Trigger>
				<Tooltip.Content>
					<p>Adjust point view options</p>
				</Tooltip.Content>
			</Tooltip.Root>
		</Tooltip.Provider>
	</Sheet.Trigger>
	<Sheet.Portal>
		<Sheet.Overlay />
		<Sheet.Content>
			<Sheet.Header>
				<Sheet.Title>Point view options</Sheet.Title>
				<Sheet.Description>Set view options for point-level features</Sheet.Description>
			</Sheet.Header>
			<div class="w-full">
				<div class="flex flex-col items-center gap-0">
					<p>View features as</p>
					<Tabs.Root value={view.viewAs} class="w-full">
						<Tabs.List class="grid w-full grid-cols-2">
							<Tabs.Trigger value="point">Points</Tabs.Trigger>
							<Tabs.Trigger value="density">Density Map</Tabs.Trigger>
						</Tabs.List>
						<Tabs.Content value="point">
							<p>Scaling</p>
							<Card.Root class="p-1">
								<Card.Header class="p-1">
									<Card.Title class="text-sm">Point size</Card.Title>
								</Card.Header>
								<Card.Content class="p-1 pt-0">
									<div class="flex w-full items-center gap-3">
										<Slider
											bind:value={() => scaleSliderGetValue(), (v) => scaleSliderSetValue(v)}
											min={minScale}
											max={maxScale}
											step={0.01}
											class="flex-1"
										/>
										<Input
											type="number"
											step=".01"
											value={view.scale}
											onchange={(e) => scaleInputSetValue(e.target.value)}
											class="w-[70px] py-1 text-left"
										/>
									</div>
								</Card.Content>
							</Card.Root>
							<p class="pt-2">Fill</p>
							<Card.Root class="p-1">
								<Card.Header class="p-1">
									<Card.Title class="text-sm">Fill opacity</Card.Title>
								</Card.Header>
								<Card.Content class="p-1 pt-0">
									<div class="flex w-full items-center gap-3">
										<Slider
											bind:value={
												() => fillOpacitySliderGetValue(), (v) => fillOpacitySliderSetValue(v)
											}
											min={0}
											max={1.0}
											step={0.01}
										/>
										<Input
											type="number"
											step=".01"
											value={view.fillOpacity}
											onchange={(e) => fillOpacityInputSetValue(e.target.value)}
											class="w-[70px] py-1 text-left"
										/>
									</div>
								</Card.Content>
							</Card.Root>
							<p class="pt-2">Stroke</p>
							<Card.Root class="p-1">
								<Card.Header class="p-1">
									<Card.Title class="text-sm">Stroke color</Card.Title>
								</Card.Header>
								<Card.Content class="p-1 pt-0">
									<div class="flex items-center gap-2 pt-1">
										<SwatchSelector
											title="Select stroke color"
											hex={view.strokeColor}
											{swatchHexs}
											includeSymbols={false}
											onColorSelection={(value) => onStrokeColorChange(value)}
										/>
										<p>Set stroke color</p>
									</div>
								</Card.Content>
							</Card.Root>
							<Card.Root class="p-1">
								<Card.Header class="p-1">
									<Card.Title class="text-sm">Stroke opacity</Card.Title>
								</Card.Header>
								<Card.Content class="p-1 pt-0">
									<div class="flex w-full items-center gap-3">
										<Slider
											bind:value={
												() => strokeOpacitySliderGetValue(), (v) => strokeOpacitySliderSetValue(v)
											}
											min={0}
											max={1.0}
											step={0.01}
										/>
										<Input
											type="number"
											step=".01"
											value={view.strokeOpacity}
											onchange={(e) => strokeOpacityInputSetValue(e.target.value)}
											class="w-[70px] py-1 text-left"
										/>
									</div>
								</Card.Content>
							</Card.Root>
							<Card.Root class="p-1">
								<Card.Header class="p-1">
									<Card.Title class="text-sm">Stroke width</Card.Title>
								</Card.Header>
								<Card.Content class="p-1 pt-0">
									<div class="flex w-full items-center gap-3">
										<Slider
											bind:value={
												() => strokeWidthSliderGetValue(), (v) => strokeWidthSliderSetValue(v)
											}
											min={minStrokeWidth}
											max={maxStrokeWidth}
											step={0.01}
										/>
										<Input
											type="number"
											step=".01"
											value={view.strokeWidth}
											onchange={(e) => strokeWidthInputSetValue(e.target.value)}
											class="w-[70px] py-1 text-left"
										/>
									</div>
								</Card.Content>
							</Card.Root>
						</Tabs.Content>
						<Tabs.Content value="density"></Tabs.Content>
					</Tabs.Root>
				</div>
			</div>
		</Sheet.Content>
	</Sheet.Portal>
</Sheet.Root>