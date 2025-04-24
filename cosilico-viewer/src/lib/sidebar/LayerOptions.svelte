<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import Check from '@lucide/svelte/icons/check';
	import ChevronsUpDown from '@lucide/svelte/icons/chevrons-up-down';
	import { tick } from 'svelte';
	import * as Command from '$lib/components/ui/command/index.js';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { cn } from '$lib/utils.js';

	import FieldOptions from './FieldOptions.svelte';

	let {
		layer,
		onMetadataChange = (layer, metadataName) => null,
		onFieldColorChange = (layer, fieldName, color) => null,
		onFieldShapeChange = (layer, fieldName, shape) => null,
		onFieldPaletteChange = (layer, fieldName, palette) => null,
		onFieldVisibilityChange = (layer, fieldName, isVisible) => null,
		onFieldVMinChange = (layer, fieldName, vMin) => null,
		onFieldVMaxChange = (layer, fieldName, vMax) => null,
		onFieldVCenterChange = (layer, fieldName, vMax) => null
	} = $props();

	let names = $state(Array.from(layer.metadataToNode.keys()));

	let open = $state(false);
	// let value = $state("");
	let triggerRef = $state<HTMLButtonElement>(null!);

	let selectedValue = $state(layer.isGrouped ? 'Gene' : null);

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
		} else if (layer.metadataType == 'categorical') {
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
			for (const fname of layer.vector.metadataFields) {
				const view = layer.vector.vectorView.fieldToView.get(fname);

				let field = {
					name: fname,
					palette: view.palette,
					vMin: view.vMin,
					vMax: view.vMax,
					absoluteVMin: view.absoluteVMin,
					absoluteVMax: view.absoluteVMax,
					vCenter: view.vCenter,
					vStepSize: view.vStepSize,
					isVisible: false
				};
				fields.push(field);
			}
		}

		return fields;
	}

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

	function selectMetadataName(metadataName) {
		selectedValue = metadataName;

		closeAndFocusTrigger();

		onMetadataChange(layer, metadataName);
	}

	function fieldVisibilityChange(field, isVisible) {
		onFieldVisibilityChange(layer, field.name, isVisible);

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
							<Command.Item value={name} onSelect={() => selectMetadataName(name)}>
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
{#if selectedValue !== null}
	<FieldOptions
		fields={getFields()}
		areCategorical={layerIsCategorical()}
		onVisibilityChange={(field, isVisible) => fieldVisibilityChange(field, isVisible)}
	/>
{/if}

<!-- onColorChange = (fieldName, color) => null,
   onShapeChange = (fieldName, shape) => null,
   onPaletteChange = (fieldName, palette) => null,
   
   onVMinChange = (fieldName, vMin) => null,
   onVMaxChange = (fieldName, vMax) => null,
   onVCenterChange = (fieldName, vMax) => null -->
