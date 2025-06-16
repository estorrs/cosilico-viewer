<script lang="ts">
	import { Button, buttonVariants } from '$lib/components/ui/button/index.js';
	import * as Card from "$lib/components/ui/card/index.js";
	import { Input } from '$lib/components/ui/input/index.js';
	import { Slider } from '$lib/components/ui/slider/index.js';
	import * as Tabs from '$lib/components/ui/tabs/index.js';
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';
	import SwatchSelector from '$lib/components/ui/swatch-selector/SwatchSelector.svelte';
	import Shapes from '@lucide/svelte/icons/shapes';
	import * as Sheet from '$lib/components/ui/transparent-sheet/index.js';

	import SingleSlider from '$lib/widgets/SingleSlider.svelte';

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


	let swatchHexs = $state([view.strokeColor]);

	function scaleInputSetValue(v) {
		v = Number(v);
		onPointScaleChange(v);
	}

	function fillOpacityInputSetValue(v) {
		v = Number(v);
		onFillOpacityChange(v);
	}

	function strokeOpacityInputSetValue(v) {
		v = Number(v);
		onStrokeOpacityChange(v);
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
							<SingleSlider 
								value={view.scale}
								vMin={minScale}
								vMax={maxScale}
								title='Point size'
								onValueChange = {(v) => scaleInputSetValue(v)}
								step={0.01}
								location='left'
								orientation='horizontal'
								/>
							<p class="pt-2">Fill</p>
							<SingleSlider 
								value={view.fillOpacity}
								vMin={0}
								vMax={1}
								title='Fill opacity'
								onValueChange = {(v) => fillOpacityInputSetValue(v)}
								step={0.01}
								location='left'
								orientation='horizontal'
								/>
							<p class="pt-2">Stroke</p>
							
							<Card.Root class="p-1 gap-0">
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
							<SingleSlider 
								value={view.strokeOpacity}
								vMin={0}
								vMax={1}
								title='Stroke opacity'
								onValueChange = {(v) => strokeOpacityInputSetValue(v)}
								step={0.01}
								location='left'
								orientation='horizontal'
								/>
							<SingleSlider 
								value={view.strokeWidth}
								vMin={minStrokeWidth}
								vMax={maxStrokeWidth}
								title='Stroke width'
								onValueChange = {(v) => strokeWidthInputSetValue(v)}
								step={0.01}
								location='left'
								orientation='horizontal'
								/>
				
						</Tabs.Content>
						<Tabs.Content value="density"></Tabs.Content>
					</Tabs.Root>
				</div>
			</div>
		</Sheet.Content>
	</Sheet.Portal>
</Sheet.Root>