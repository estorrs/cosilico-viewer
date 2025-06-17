<script lang="ts">
	import Check from '@lucide/svelte/icons/check';
	import ChevronsUpDown from '@lucide/svelte/icons/chevrons-up-down';
	import { tick } from 'svelte';
	import * as Command from '$lib/components/ui/command/index.js';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { cn } from '$lib/utils.js';

	import FieldOptions from './FieldOptions.svelte';
	import { continousPalettes, defaultPalettes } from '$lib/openlayers/ColorHelpers.js';
	import PaletteSelector from './PaletteSelector.svelte';

	let {
		layer,
		getCurrentObjectType = () => 'point',
		onMetadataChange = (metadataName) => null,
		onPaletteChange = (palette) => null,
		onFieldColorChange = (fieldName, color) => null,
		onFieldShapeChange = (fieldName, shape) => null,
		onFieldPaletteChange = (fieldName, palette) => null,
		onFieldVisibilityChange = (fieldName, isVisible) => null,
		onFieldVMinChange = (fieldName, vMin) => null,
		onFieldVMaxChange = (fieldName, vMax) => null,
		onFieldVCenterChange = (fieldName, vMax) => null
	} = $props();

	let names = $state(Array.from(layer.metadataToNode.keys()));

	let open = $state(false);
	// let value = $state("");
	let triggerRef = $state<HTMLButtonElement>(null!);

	let selectedValue = $state(layer.isGrouped ? 'Gene' : null);

	let renderFields = $state(false);

	function getFields() {
		let fields = [];
		if (layer.isGrouped) {
			for (const fname of layer.vector.featureNames) {
				const view = layer.vector.vectorView.featureNameToView.get(fname);

				let field = {
					name: fname,
					hex: layer.vector.featureToColor.get(fname),
					shape: view.shapeType,
					isVisible: layer.vector.vectorView.visibleFeatureNames.includes(fname)
				};
				fields.push(field);
			}
		} else if (layer.vector.metadataType == 'categorical') {
			for (const fname of layer.vector.metadataFields) {
				const view = layer.vector.vectorView.fieldToView.get(fname);
				let field = {
					name: fname,
					hex: view.fillColor,
					shape: view.shapeType,
					isVisible: layer.vector.vectorView.visibleFields.includes(fname)
				};
				fields.push(field);
			}
		} else {
			// for (const fname of layer.vector.metadataFields ?? []) {
			for (const fidx of layer.vector.metadataFieldIdxs ?? []) {
				const fname = layer.vector.metadataFields[fidx];
				const vinfo = layer.vector.metadataFieldToVInfo.get(fidx);
				let field = {
					name: fname,
					palette: vinfo.palette,
					vMin: vinfo.vMin,
					vMax: vinfo.vMax,
					absoluteVMin: vinfo.absoluteVMin,
					absoluteVMax: vinfo.absoluteVMax,
					vCenter: vinfo.vCenter,
					vStepSize: vinfo.vStepSize,
					isVisible: layer.vector.vectorView.visibleFields.includes(fname)
				};
				fields.push(field);
			}
		}

		return fields;
	}

	let allFields = $state(getFields());

	function layerIsCategorical() {
		if (layer.isGrouped) {
			return true;
		}
		return layer.vector.metadataType == 'categorical';
	}

	function closeAndFocusTrigger() {
		open = false;
		tick().then(() => {
			triggerRef.focus();
		});
	}

	async function selectMetadataName(metadataName) {
		selectedValue = metadataName;

		closeAndFocusTrigger();

		await onMetadataChange(metadataName);

		console.log('layer opt layer is', layer);

		allFields = getFields();


		renderFields = !renderFields;

	}

	function fieldVisibilityChange(field, isVisible) {
		onFieldVisibilityChange(field.name, isVisible);

		field.isVisible = isVisible;
	}
</script>

{#if !layer.isGrouped}
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
					{selectedValue || 'Search metadata...'}
					<ChevronsUpDown class="opacity-50" />
				</Button>
			{/snippet}
		</Popover.Trigger>
		<Popover.Content class="w-[200px] p-0">
			<Command.Root>
				<Command.Input placeholder="Search metadata..." />
				<Command.List>
					<Command.Empty>No metadata found.</Command.Empty>
					<Command.Group>
						{#each names as name (name)}
							<Command.Item value={name} onSelect={async () => await selectMetadataName(name)}>
								<Check class={cn(selectedValue !== name && 'text-transparent')} />
								{name}
							</Command.Item>
						{/each}
					</Command.Group>
				</Command.List>
			</Command.Root>
		</Popover.Content>
	</Popover.Root>
{/if}
{#key renderFields}
{#if selectedValue !== null}
	<FieldOptions
		fields={allFields}
		getCurrentObjectType={getCurrentObjectType}
		areCategorical={layerIsCategorical()}
		onVisibilityChange={(field, isVisible) => fieldVisibilityChange(field, isVisible)}
		onColorChange={(field, color) => onFieldColorChange(field.name, color)}
		onShapeChange={(field, shape) => onFieldShapeChange(field.name, shape)}
		onPaletteChange={(field, palette) => onFieldPaletteChange(field.name, palette)}
		onVMinChange={(field, vMin) => onFieldVMinChange(field.name, vMin)}
		onVMaxChange={(field, vMax) => onFieldVMaxChange(field.name, vMax)}
		onVCenterChange={(field, vCenter) => onFieldVCenterChange(field.name, vCenter)}
	/>
{/if}

	{#if !layerIsCategorical() && layer.vector.metadataName != null}
		<div>
			<p>Color Palette</p>
			<PaletteSelector
				defaultPalette={layer.vector.vectorView.palette}
				palettes={continousPalettes}
				onPaletteSelection={(v) => onPaletteChange(v)}
			/>
		</div>
	{/if}
{/key}
