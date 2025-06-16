<script lang="ts">

	import { Button, buttonVariants } from '$lib/components/ui/button/index.js';
	import * as Card from "$lib/components/ui/card/index.js";
	import * as Tabs from '$lib/components/ui/tabs/index.js';
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';
	import SwatchSelector from '$lib/components/ui/swatch-selector/SwatchSelector.svelte';
	import SingleSlider from '$lib/widgets/SingleSlider.svelte';

	import Waypoints from '@lucide/svelte/icons/waypoints';
	import * as Sheet from '$lib/components/ui/transparent-sheet/index.js';

	let {
		view,
		onFillOpacityChange = (e) => null,
		onStrokeOpacityChange = (e) => null,
		onStrokeWidthChange = (e) => null,
		onStrokeColorChange = (e) => null,
		onBorderColoring = (value) => null,
		onBorderTypeChange = (e) => null,
		minScale = 0,
		maxScale = 4,
		minStrokeWidth = 0,
		maxStrokeWidth = 4
	} = $props();

	let swatchHexs = $state([view.strokeColor]);

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

	function strokeDarknessInputSetValue(v) {
		v = Number(v);
		onBorderColoring(v);
	}

</script>

<Sheet.Root>
	<Sheet.Trigger>
		<Tooltip.Provider>
			<Tooltip.Root>
				<Tooltip.Trigger class={buttonVariants({ variant: 'outline' })}>
					<Waypoints />
				</Tooltip.Trigger>
				<Tooltip.Content>
					<p>Adjust polygon view options</p>
				</Tooltip.Content>
			</Tooltip.Root>
		</Tooltip.Provider>
	</Sheet.Trigger>
	<Sheet.Portal>
		<Sheet.Overlay />
		<Sheet.Content>
			<Sheet.Header>
				<Sheet.Title>Polygon view options</Sheet.Title>
				<Sheet.Description>Set view options for polygon features</Sheet.Description>
			</Sheet.Header>
			<div class="w-full">
				<div class="flex flex-col items-center gap-0 w-full">
					<p>Fill</p>
					<SingleSlider 
						value={view.fillOpacity}
						vMin={0}
						vMax={1.0}
						title='Fill opacity'
						onValueChange = {(v) => fillOpacityInputSetValue(v)}
						step={0.01}
						location='left'
						orientation='horizontal'
					    />
					
					<p class="pt-2">Stroke</p>
					<Card.Root class="p-1 w-full gap-0">
						<Card.Header class="p-1">
							<Card.Title class="text-sm mb-0">Border color style</Card.Title>
						</Card.Header>
						<Card.Content class="p-1 pt-0">
							<Tabs.Root value={view.borderType} class="w-full" onValueChange={(value) => onBorderTypeChange(value)}>
								<Tabs.List class="grid grid-cols-2 w-full">
								  <Tabs.Trigger value="default">Default</Tabs.Trigger>
								  <Tabs.Trigger value="field">Color by field</Tabs.Trigger>
								</Tabs.List>
								<Tabs.Content value="default">
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
								</Tabs.Content>
								<Tabs.Content value="field">
									<SingleSlider 
										value={view.strokeDarkness}
										vMin={0}
										vMax={1.0}
										title='Border brightness'
										onValueChange = {(v) => strokeDarknessInputSetValue(v)}
										step={0.01}
										location='left'
										orientation='horizontal'
										/>
								</Tabs.Content>
							</Tabs.Root>
							
						</Card.Content>
					</Card.Root>
					<SingleSlider 
						value={view.strokeOpacity}
						vMin={0}
						vMax={1.0}
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
				</div>
			</div></Sheet.Content
		>
	</Sheet.Portal>
</Sheet.Root>
