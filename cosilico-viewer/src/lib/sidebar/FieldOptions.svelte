<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import * as Alert from "$lib/components/ui/alert/index.js";

	import Info from "@lucide/svelte/icons/info";
	import ChevronsUpDown from '@lucide/svelte/icons/chevrons-up-down';
	import Trash2 from '@lucide/svelte/icons/trash-2';

	import { onMount, tick } from 'svelte';
	import * as Command from '$lib/components/ui/command/index.js';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { ScrollArea } from '$lib/components/ui/scroll-area/index.js';
	import { computeCommandScore } from 'bits-ui';

	import SwatchSelector from '$lib/components/ui/swatch-selector/SwatchSelector.svelte';
	import ContinuousOptions from './ContinuousOptions.svelte';

	let {
		fields,
		displayNFields = 20,
		displayNFieldsSearch = 50,
		areCategorical = true,
		getCurrentObjectType = () => 'polygon',
		onColorChange = (field, color) => null,
		onShapeChange = (field, shape) => null,
		onPaletteChange = (field, palette) => null,
		onVisibilityChange = (field, isVisible) => null,
		onVMinChange = (field, vMin) => null,
		onVMaxChange = (field, vMax) => null,
		onVCenterChange = (field, vMax) => null
	} = $props();

	// areCategorical = false;

	// categorical
	// let fields = $state([
	// 	{
	// 		name: 'Gene A',
	// 		hex: '#ff0000',
	// 		shape: 'circle',
	// 		isVisible: false
	// 	},
	// 	{
	// 		name: 'Bene B',
	// 		hex: '#00ff00',
	// 		shape: 'circle',
	// 		isVisible: false
	// 	},
	// 	{
	// 		name: 'Bene C',
	// 		hex: '#00ff00',
	// 		shape: 'circle',
	// 		isVisible: false
	// 	},
	// 	{
	// 		name: 'Bene D',
	// 		hex: '#00ff00',
	// 		shape: 'circle',
	// 		isVisible: false
	// 	},
	// 	{
	// 		name: 'Bene ZZZ',
	// 		hex: '#000000',
	// 		shape: 'circle',
	// 		isVisible: false
	// 	},
	// 	{
	// 		name: 'Bene Y',
	// 		hex: '#0000ff',
	// 		shape: 'circle',
	// 		isVisible: false
	// 	}
	// ]);

	// let fields = $state([
	// 	{
	// 		name: 'score A',
	// 		palette: 'viridis',
	// 		vMin: 0,
	// 		vMax: 10,
	// 		absoluteVMin: 0,
	// 		absoluteVMax: 10,
	// 		vCenter: null,
	// 		vStepSize: 0.01,
	// 		isVisible: false
	// 	},
	// 	{
	// 		name: 'score B',
	// 		palette: 'viridis',
	// 		vMin: 0,
	// 		vMax: 10,
	// 		absoluteVMin: 0,
	// 		absoluteVMax: 10,
	// 		vCenter: null,
	// 		vStepSize: 0.01,
	// 		isVisible: false
	// 	},
	// 	{
	// 		name: 'score C',
	// 		palette: 'viridis',
	// 		vMin: 0,
	// 		vMax: 10,
	// 		absoluteVMin: 0,
	// 		absoluteVMax: 10,
	// 		vCenter: null,
	// 		vStepSize: 0.01,
	// 		isVisible: false
	// 	},
	// 	{
	// 		name: 'score D',
	// 		palette: 'viridis',
	// 		vMin: 0,
	// 		vMax: 10,
	// 		absoluteVMin: 0,
	// 		absoluteVMax: 10,
	// 		vCenter: null,
	// 		vStepSize: 0.01,
	// 		isVisible: false
	// 	},
	// 	{
	// 		name: 'score E',
	// 		palette: 'viridis',
	// 		vMin: 0,
	// 		vMax: 10,
	// 		absoluteVMin: 0,
	// 		absoluteVMax: 10,
	// 		vCenter: null,
	// 		vStepSize: 0.01,
	// 		isVisible: false
	// 	},
	// 	{
	// 		name: 'score F',
	// 		palette: 'viridis',
	// 		vMin: 0,
	// 		vMax: 10,
	// 		absoluteVMin: 0,
	// 		absoluteVMax: 10,
	// 		vCenter: null,
	// 		vStepSize: 0.01,
	// 		isVisible: false
	// 	},
	// 	{
	// 		name: 'score G',
	// 		palette: 'viridis',
	// 		vMin: 0,
	// 		vMax: 10,
	// 		absoluteVMin: 0,
	// 		absoluteVMax: 10,
	// 		vCenter: null,
	// 		vStepSize: 0.01,
	// 		isVisible: false
	// 	}
	// ]);

	let rerenderActive = $state(false);

	let swatchHexs = $state([]);
	if (areCategorical) {
		for (const field of fields) {
			if (!swatchHexs.includes(field.hex)) {
				swatchHexs.push(field.hex);
			}
		}
	}

	let selectedFields = $state([]);
	let search = $state('');
	let filteredFields = $derived(filterFields(search));

	let open = $state(false);
	let name = $state('');
	let triggerRef = $state<HTMLButtonElement>(null!);

	const selectedValue = $derived(fields.find((f) => f.name === name)?.name);

	function filterFields(search) {
		let scores = [];
		for (const field of fields) {
			const score = computeCommandScore(field.name, search);
			scores.push(score);
		}
		let objs = fields.map((f, i) => ({ entity: f, score: scores[i] }));
		objs = objs.sort((a, b) => b.score - a.score);
		objs = objs.filter((f) => f.score > 0);
		objs = objs.map((f) => f.entity);
		const n = objs.length - displayNFieldsSearch;
		objs = objs.slice(0, displayNFieldsSearch);
		if (n > 0) {
			objs.push({
				name: `${n} additional fields`,
				isDisabeled: true
			});
		}
		return objs;
	}

	function closeAndFocusTrigger() {
		open = false;
		tick().then(() => {
			triggerRef.focus();
		});
	}

	function onFieldSelection(field) {
		closeAndFocusTrigger();
		selectedFields.push(field);
		field.isSelected = true;
		onFieldVisibilityChange(field, true);
		rerenderActive = !rerenderActive;
	}

	function onFieldDeselection(field) {
		if (field.isVisible) {
			onFieldVisibilityChange(field, false);
		}
		selectedFields = selectedFields.filter((item) => item.name !== field.name);
		field.isSelected = false;

		rerenderActive = !rerenderActive;
	}

	function onFieldColorSelection(field, hex) {
		field.hex = hex;
		onColorChange(field, hex);
	}

	function onFieldSymbolSelection(field, symbol) {
		field.shape = symbol;
		onShapeChange(field, symbol);
	}

	// function onFieldPaletteSelection(field, palette) {
	// 	field.palette = palette;
	// 	onPaletteChange(field, palette);
	// }

	function onFieldVisibilityChange(field, value) {
		if (!areCategorical && value) {
			// can only have one visible at a time if continuous
			for (const f of fields) {
				if (f.isVisible) {
					onVisibilityChange(f, false);
					f.isVisible = false;
				}
			}
		} 
		field.isVisible = value;
		onVisibilityChange(field, field.isVisible);
	}

	function onFieldVMaxChange(field, value) {
		field.vMax = value;
		onVMaxChange(field, value);
	}

	function onFieldVMinChange(field, value) {
		field.vMin = value;
		onVMinChange(field, value);
	}

	function onFieldVCenterChange(field, value) {
		field.vCenter = value;
		onVCenterChange(field, value);
	}

	onMount(() => {
		for (let field of fields) {
			field.isDisabeled = false;
			if (field.isVisible){
				field.isSelected = true;
				selectedFields.push(field);
			} else if(areCategorical && fields.length < displayNFields) {
				field.isSelected = true;
				selectedFields.push(field);
			} else {
				field.isSelected = false;
			}
		}
		rerenderActive = !rerenderActive;
	});
</script>

<Popover.Root bind:open>
	<Popover.Trigger bind:ref={triggerRef}>
		{#snippet child({ props })}
			<Button
				variant="outline"
				class="w-[200px] justify-between"
				style="width:200px"
				{...props}
				role="combobox"
				aria-expanded={open}
			>
				{selectedValue || 'Select a field...'}
				<ChevronsUpDown class="opacity-50" />
			</Button>
		{/snippet}
	</Popover.Trigger>
	<Popover.Content class="w-[200px] p-0">
		<Command.Root shouldFilter={false}>
			<Command.Input bind:value={search} placeholder="Search fields..." />
			<Command.List>
				<Command.Empty>No framework found.</Command.Empty>
				<Command.Group>
					{#each filteredFields as field (field.name)}
						{#if !field.isSelected}
							<Command.Item
								value={field.name}
								disabled={field.isDisabeled}
								onSelect={() => onFieldSelection(field)}
							>
								{field.name}
							</Command.Item>
						{/if}
					{/each}
				</Command.Group>
			</Command.List>
		</Command.Root>
	</Popover.Content>
</Popover.Root>
{#key rerenderActive}
	<Card.Root class='p-1 w-full gap-0'>
		<Card.Header class="p-1">
			<Card.Title class="text-md">Active Fields</Card.Title>
		</Card.Header>
		<Card.Content class="p-1 pt-0">
			<ScrollArea class="rounded-md border p-2">
				{#if selectedFields.length == 0}
					<Alert.Root>
						<Info class="size-4" />
						<Alert.Title>Info!</Alert.Title>
						<Alert.Description>No Active fields. Select a field to view.</Alert.Description>
					</Alert.Root>
				{/if}
				{#each selectedFields as field (field.name)}
					<!-- {#if field.isSelected} -->
					<div class="flex items-center gap-2 pt-1 w-full">
						<div class="flex items-center gap-2 pt-1">
							<Checkbox
								title="Field visibility"
								checked={field.isVisible}
								onCheckedChange={(v) => onFieldVisibilityChange(field, v)}
							/>
							{#if areCategorical && getCurrentObjectType() == 'point'}
								<SwatchSelector
									title="Select field color and symbol"
									hex={field.hex}
									{swatchHexs}
									includeSymbols={true}
									onColorSelection={(value) => onFieldColorSelection(field, value)}
									onSymbolSelection={(value) => onFieldSymbolSelection(field, value)}
								/>
								<p>{field.name}</p>
							{/if}
							{#if areCategorical && getCurrentObjectType() == 'polygon'}
								<SwatchSelector
									title="Select field color"
									hex={field.hex}
									{swatchHexs}
									includeSymbols={false}
									onColorSelection={(value) => onFieldColorSelection(field, value)}
								/>
								<p>{field.name}</p>
							{/if}
							{#if !areCategorical}
								<p>{field.name}</p>
							{/if}
						</div>
						<div class="ml-auto">
							{#if !areCategorical}
								<ContinuousOptions
									vMin={field.vMin}
									vMax={field.vMax}
									absoluteVMin={field.absoluteVMin}
									absoluteVMax={field.absoluteVMax}
									vCenter={field.vCenter}
									vStepSize={field.vStepSize}
									onVMinChange={(v) => onFieldVMinChange(field, v)}
									onVMaxChange={(v) => onFieldVMaxChange(field, v)}
									onVCenterChange={(v) => onFieldVCenterChange(field, v)}
								/>
							{/if}
							<Button
								title="Remove field"
								variant="outline"
								onclick={() => onFieldDeselection(field)}
							>
								<Trash2 />
							</Button>
						</div>
					</div>
					<!-- {/if} -->
				{/each}
			</ScrollArea>
		</Card.Content>
	</Card.Root>
{/key}
