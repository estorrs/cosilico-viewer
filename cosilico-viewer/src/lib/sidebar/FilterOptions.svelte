<script lang="ts">
	import Addable from '$lib/widgets/SearchAddable.svelte';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import EllipsisVertical from '@lucide/svelte/icons/ellipsis-vertical';
	import SlidersHorizontal from '@lucide/svelte/icons/sliders-horizontal';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import Funnel from '@lucide/svelte/icons/funnel';
	import { Button, buttonVariants } from '$lib/components/ui/button/index.js';
	import * as Sheet from '$lib/components/ui/transparent-sheet/index.js';
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';
	import SearchAddable from '$lib/widgets/SearchAddable.svelte';
	import SearchableOptions from '$lib/widgets/SearchableOptions.svelte';
	import SingleSlider from '$lib/widgets/SingleSlider.svelte';
	import { onMount } from 'svelte';

	let {
		layer,
		layers,
		metadataFilters,
		layerFilters,
		vectorToGeomType = (layer) => null,
		onAddFilterMetadata = (metadataName) => null,
		onAddMetadataFilter = (metadataFilter) => null,
		onAddLayerFilter = (layerFilter) => null,
		onRemoveMetadataFilter = (metadataFilter) => null,
		onRemoveLayerFilter = (layerFilter) => null
	} = $props();

	let metadataOpen = $state(false);
	let metadataIsDisabled = $state(true);

	let rerenderFields = $state(false);
	let rerenderValue = $state(false);

	// layerViews = $state([
	// 	{
	// 		name: 'blah',
	// 		geometryType: 'point',
	// 	}
	// ]);

	let metadataNames = $state([]);
	let metadataFields = $state([]);
	let opts = $state(null);
	let vMin = $state(null);
	let vMax = $state(null);
	let value = $state([]);
	let categoricalSymbols = $state(['=', '!=']);
	let continuousSymbols = $state(['=', '<=', '<', '>=', '>']);
	let currentMetadataFilter = $state({});
	let metadataType = $state(null);

	let layerOpen = $state(false);
	let layerNames = $state([]);
	let layerSymbols = $state(['is in', 'is not in']);
	let currentLayerFilter = $state({});
	let layerIsDisabled = $state(true);
	// let layerType = $state(null); // point or polygon

	// let metadataFilters = $state([
	// 	{
	// 		name: 'blah a',
	// 		isSelected: false,
	// 		metadataName: 'm1',
	// 		fieldName: 'f1',
	// 		symbol: '<='
	// 	},
	// 	...
	// ]);

	// let layerFilters = $state([
	// 	{
	// 		name: 'blah a',
	// 		isSelected: false,
	// 		layerName: 'm1',
	// 		symbol: 'is in' // or 'is not in'
	// 	},
	// 	...
	// ]);

	async function onMetadataNameSelection(name) {
		await onAddFilterMetadata(name);
		opts = layer.vector.filterMap.get(name);
		metadataFields = [...opts.metadataFields];
		metadataType = opts.metadataType;
		currentMetadataFilter.metadataName = name;

		if (layer.isGrouped) {
			onMetadataFieldSelection(name);
		}

		rerenderFields = !rerenderFields;
	}

	function onMetadataFieldSelection(fieldName) {
		currentMetadataFilter.fieldName = fieldName;

		if (metadataType == 'continuous') {
			const fidx = opts.metadataFields.indexOf(fieldName);
			vMin = opts.vmins[fidx];
			vMax = opts.vmaxs[fidx];
		}

		if (currentMetadataFilter.fieldName && currentMetadataFilter.symbol) {
			metadataIsDisabled = false;
		}
	}

	function onMetadataSymbolSelection(symbol) {
		currentMetadataFilter.symbol = symbol;

		if (metadataType == 'continuous') {
			value = (vMin + vMax) / 2;
			currentMetadataFilter.value = value;
		}

		if (metadataType == 'continuous') {
			onAddMetadataFilter(currentMetadataFilter);
		}

		if (currentMetadataFilter.fieldName && currentMetadataFilter.symbol) {
			metadataIsDisabled = false;
		}

		rerenderValue = !rerenderValue;
	}

	function onMetadataValueSelection(v) {
		currentMetadataFilter.value = v;
		onAddMetadataFilter(currentMetadataFilter);
	}

	function onMetadataFilterAddition() {
		onAddMetadataFilter(currentMetadataFilter);
		currentMetadataFilter = {};
		metadataFields = [];
		metadataIsDisabled = true;

		metadataOpen = false;
	}

	async function onMetadataFilterDeletion(filter) {
		await onRemoveMetadataFilter(filter);
	}

	function onLayerNameSelection(name) {
		currentLayerFilter.layerName = name;
		let layerId = null;
		for (const [key, obj] of layers) {
			if (obj.vector.name == name) {
				layerId = obj.vector.vectorId;
			}
		}
		currentLayerFilter.layerId = layerId;
	}

	function onLayerSymbolSelection(symbol) {
		currentLayerFilter.symbol = symbol;
		layerIsDisabled = false;
	}

	function onLayerFilterAddition() {
		onAddLayerFilter(currentLayerFilter);
		currentLayerFilter = {};
		layerNames = layerNames.filter((l) => l.layerName != currentLayerFilter.layerName);
		layerIsDisabled = true;

		layerOpen = false;
	}

	function onLayerFilterDeletion(filter) {
		onRemoveLayerFilter(filter);
		layerNames.push(filter.layerName);
	}

	onMount(() => {
		metadataNames = Array.from(layer.metadataToNode.keys());
		for (const [key, obj] of layers) {
			const geometryType = vectorToGeomType(obj.vector);
			if (geometryType == 'polygon' && obj.vector.name != layer.vector.name) {
				layerNames.push(obj.vector.name);
			}
		}
	});
</script>

<Sheet.Root>
	<Sheet.Trigger>
		<Tooltip.Provider>
			<Tooltip.Root>
				<Tooltip.Trigger class={buttonVariants({ variant: 'outline' })}>
					<Funnel />
				</Tooltip.Trigger>
				<Tooltip.Content>
					<p>Filters</p>
				</Tooltip.Content>
			</Tooltip.Root>
		</Tooltip.Provider>
	</Sheet.Trigger>
	<Sheet.Portal>
		<Sheet.Overlay />
		<Sheet.Content>
			<Sheet.Header>
				<Sheet.Title>Set layer filters</Sheet.Title>
				<Sheet.Description>Adjust filters to control which features are shown</Sheet.Description>
			</Sheet.Header>
			<div>
				<div class="flex flex-col items-center gap-0">
					<p>Metadata filters</p>
					<Popover.Root
						bind:open={metadataOpen}
						onOpenChange={() => {
							if (metadataOpen) {
								currentMetadataFilter = {};
								metadataFields = [];
								metadataIsDisabled = true;
							}
						}}
					>
						<Popover.Trigger class={buttonVariants({ variant: 'outline' })}>
							Add Metadata Filter
						</Popover.Trigger>
						<Popover.Content class="sm:max-w-[425px]">
							<p>Select Metadata</p>
							<SearchableOptions
								names={metadataNames}
								displayNFields={100}
								onSelection={(name) => onMetadataNameSelection(name)}
								entityName="options"
							/>
							{#key rerenderFields}
								{#if layer.vector.isGrouped}
									<p>Select Field</p>
									<SearchableOptions
										names={metadataFields}
										displayNFields={100}
										onSelection={(name) => onMetadataFieldSelection(name)}
										entityName="options"
									/>
								{/if}
								<p>Select Symbol</p>
								{#if metadataType == 'categorical'}
									<SearchableOptions
										names={categoricalSymbols}
										displayNFields={100}
										onSelection={(symbol) => onMetadataSymbolSelection(symbol)}
										entityName="options"
									/>
								{/if}
								{#if metadataType == 'continuous'}
									<SearchableOptions
										names={continuousSymbols}
										displayNFields={100}
										onSelection={(symbol) => onMetadataSymbolSelection(symbol)}
										entityName="options"
									/>
								{/if}
								{#key rerenderValue}
									{#if currentMetadataFilter.symbol && metadataType == 'continuous'}
										<SingleSlider
											{value}
											{vMin}
											{vMax}
											title={'Threshold value'}
											onValueChange={(v) => onMetadataValueSelection(v)}
											step={0.01}
											location={'left'}
										/>
									{/if}
								{/key}
							{/key}

							<Button
								disabled={metadataIsDisabled}
								onclick={() => {
									if (!metadataIsDisabled) {
										onMetadataFilterAddition();
									}
								}}
							>
								Add filter
							</Button>
							<!-- <Button type="submit">Save changes</Button> -->
						</Popover.Content>
					</Popover.Root>
					{#each Array.from(metadataFilters) as [key, filter] (key)}
						<div class="flex items-center gap-2 pt-1">
							<p>{filter.metadataName}</p>
							<p>{filter.fieldName}</p>
							<p>{filter.symbol}</p>
							{#if filter.value}
								<p>{filter.value}</p>
							{/if}
							{#if filter.value}
								<Popover.Root
									onOpenChange={() => {
										currentMetadataFilter = filter;
										value = filter.value;

										opts = layer.vector.filterMap.get(filter.metadataName);
										const fidx = opts.metadataFields.indexOf(filter.fieldName);
										vMin = opts.vmins[fidx];
										vMax = opts.vmaxs[fidx];
										console.log(
											'current metadata filter is',
											$state.snapshot(currentMetadataFilter)
										);
									}}
								>
									<Popover.Trigger
										title="Adjust threshold value"
										class={buttonVariants({ variant: 'outline' })}
									>
										<SlidersHorizontal />
									</Popover.Trigger>
									<Popover.Content class="sm:max-w-[425px]">
										<SingleSlider
											{value}
											{vMin}
											{vMax}
											title={'Threshold value'}
											onValueChange={(v) => onMetadataValueSelection(v)}
											step={0.01}
											location={'left'}
										/>
									</Popover.Content>
								</Popover.Root>
							{/if}

							<Button
								title="Remove filter"
								variant="outline"
								onclick={() => onMetadataFilterDeletion(filter)}
							>
								<Trash2 />
							</Button>
						</div>
					{/each}
				</div>
				<div class="flex flex-col items-center gap-0">
					<p>Layer filters</p>
					<Popover.Root
						bind:open={layerOpen}
						onOpenChange={() => {
							if (layerOpen) {
								currentLayerFilter = {};
								layerIsDisabled = true;
							}
						}}
					>
						<Popover.Trigger class={buttonVariants({ variant: 'outline' })}>
							Add Layer Filter
						</Popover.Trigger>
						<Popover.Content class="sm:max-w-[425px]">
							<p>Select Layer</p>
							<SearchableOptions
								names={layerNames}
								displayNFields={100}
								onSelection={(name) => onLayerNameSelection(name)}
								entityName="options"
							/>

							<p>Select Symbol</p>

							<SearchableOptions
								names={layerSymbols}
								displayNFields={100}
								onSelection={(symbol) => onLayerSymbolSelection(symbol)}
								entityName="options"
							/>

							<Button
								disabled={layerIsDisabled}
								onclick={() => {
									if (!layerIsDisabled) {
										onLayerFilterAddition();
									}
								}}
							>
								Add filter
							</Button>
						</Popover.Content>
					</Popover.Root>
					{#each Array.from(layerFilters) as [key, filter] (key)}
						<div class="flex items-center gap-2 pt-1">
							<p>{filter.layerName}</p>
							<p>{filter.symbol}</p>

							<Button
								title="Remove filter"
								variant="outline"
								onclick={() => onLayerFilterDeletion(filter)}
							>
								<Trash2 />
							</Button>
						</div>
					{/each}
				</div>
			</div>
		</Sheet.Content>
	</Sheet.Portal>
</Sheet.Root>
