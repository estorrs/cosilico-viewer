<script lang="ts">
	import { continousPalettes, defaultPalettes } from '$lib/openlayers/ColorHelpers';

	import Check from '@lucide/svelte/icons/check';
	import ChevronsUpDown from '@lucide/svelte/icons/chevrons-up-down';
	import { tick } from 'svelte';
	import * as Command from '$lib/components/ui/command/index.js';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { cn } from '$lib/utils.js';

	let { defaultPalette, palettes, onPaletteSelection = (palette) => null } = $props();

	// let defaultPalette = 'viridis';
	// let palettes = continousPalettes;

	const entries = Object.entries(palettes).map(([name, hexs]) => ({
		name,
		hexs
	}));

	let open = $state(false);
	let value = $state(defaultPalette);
	let triggerRef = $state<HTMLButtonElement>(null!);

	const selectedValue = $derived(entries.find((f) => f.name === value)?.name);

	function closeAndFocusTrigger() {
		open = false;
		tick().then(() => {
			triggerRef.focus();
		});
	}

	function onSelection(obj) {
		value = obj.name;
		closeAndFocusTrigger();
		onPaletteSelection(obj.name);
	}

	function getGradStyle(hexs) {
		const gradientStyle = `background: linear-gradient(to right, ${hexs.join(',')});`;
		return gradientStyle;
	}
</script>

{#snippet paletteView(name, hexs)}
	<div class="border-2 border-slate-700 h-4 w-full rounded" style={getGradStyle(hexs)}></div>
	<p>{name}</p>
{/snippet}

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
				{@render paletteView(value, palettes[value])}
				<!-- {selectedValue || 'Select a palette...'} -->

				<ChevronsUpDown class="opacity-50" />
			</Button>
		{/snippet}
	</Popover.Trigger>
	<Popover.Content class="w-[200px] p-0">
		<Command.Root>
			<Command.Input placeholder="Search palettes..." />
			<Command.List>
				<Command.Empty>No palette found.</Command.Empty>
				<Command.Group>
					{#each entries as obj}
						<Command.Item value={obj.name} onSelect={() => onSelection(obj)}>
							<Check class={cn(value !== obj.name && 'text-transparent')} />
							{@render paletteView(obj.name, obj.hexs)}
						</Command.Item>
					{/each}
				</Command.Group>
			</Command.List>
		</Command.Root>
	</Popover.Content>
</Popover.Root>
