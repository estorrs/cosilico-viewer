<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import Check from '@lucide/svelte/icons/check';
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';

	import ChevronsUpDown from '@lucide/svelte/icons/chevrons-up-down';
	import Trash2 from '@lucide/svelte/icons/trash-2';

	import { tick } from 'svelte';
	import * as Command from '$lib/components/ui/command/index.js';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { ScrollArea } from '$lib/components/ui/scroll-area/index.js';
	import { cn } from '$lib/utils.js';

	import SwatchSelector from '$lib/components/ui/swatch-selector/SwatchSelector.svelte';

	let {
		// fields
		displayNFields = 5,
		onPaletteChange = (fieldName, palette) => null,
		onVisibilityChange = (fieldName, isVisible) => null
	} = $props();

	let fields = $state([
		{
			name: 'score A',
			palette: 'viridis',
			isVisible: false
		},
		{
			name: 'score B',
			palette: 'viridis',
			isVisible: false
		},
        {
			name: 'score C',
			palette: 'viridis',
			isVisible: false
		},
        {
			name: 'score D',
			palette: 'viridis',
			isVisible: false
		},
        {
			name: 'score E',
			palette: 'viridis',
			isVisible: false
		},
        {
			name: 'score F',
			palette: 'viridis',
			isVisible: false
		},
        {
			name: 'score G',
			palette: 'viridis',
			isVisible: false
		},
	]);

	let selectedFields = $state([]);
	if (fields.length < displayNFields) {
		for (const field of fields) {
			selectedFields.push(field);
		}
	}

	let open = $state(false);
	let name = $state('');
	let triggerRef = $state<HTMLButtonElement>(null!);

	const selectedValue = $derived(fields.find((f) => f.name === name)?.name);

	function closeAndFocusTrigger() {
		open = false;
		tick().then(() => {
			triggerRef.focus();
		});
	}

	function onFieldSelection(field) {
		closeAndFocusTrigger();

		field.isVisible = true;
		selectedFields.push(field);
		onVisibilityChange(field.name, field.isVisible);
	}

  function onFieldDeselection(field) {
    if (field.isVisible) {
      field.isVisible = false;
      onVisibilityChange(field.name, field.isVisible);
    }
    selectedFields = selectedFields.filter(item => item.name !== field.name);
  }

	function onFieldPaletteSelection(field, palette) {
		field.palette = palette;
		onPaletteChange(field.name, palette);
	}

</script>

{#if fields.length >= displayNFields}
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
					{selectedValue || 'Select a field...'}
					<ChevronsUpDown class="opacity-50" />
				</Button>
			{/snippet}
		</Popover.Trigger>
		<Popover.Content class="w-[200px] p-0">
			<Command.Root>
				<Command.Input placeholder="Search fields..." />
				<Command.List>
					<Command.Empty>No framework found.</Command.Empty>
					<Command.Group>
						{#each fields as field (field.name)}
							{#if !field.isVisible}
								<Command.Item value={field.name} onSelect={() => onFieldSelection(field)}>
									<!-- <Check class={cn(name !== field.name && 'text-transparent')} /> -->
									{field.name}
								</Command.Item>
							{/if}
						{/each}
					</Command.Group>
				</Command.List>
			</Command.Root>
		</Popover.Content>
	</Popover.Root>
{/if}
<Card.Root>
	<Card.Header class="p-1">
		<Card.Title class="text-md">Active Fields</Card.Title>
	</Card.Header>
	<Card.Content class="p-1 pt-0">
		<ScrollArea class="rounded-md border p-2">
			{#each selectedFields as field}
				<div class="flex items-center gap-2 pt-1 w-full">
					<div class="flex items-center gap-2 pt-1">
						<Checkbox
              title='Field visibility'
							checked={field.isVisible}
							onCheckedChange={(v) => onVisibilityChange(field.name, v)}
						/>
						<SwatchSelector
              title="Select field color and symbol"
							hex={field.hex}
							{swatchHexs}
							includeSymbols={true}
							onColorSelection={(value) => onFieldColorSelection(field, value)}
							onSymbolSelection={(value) => onFieldSymbolSelection(field, value)}
						/>
						<p>{field.name}</p>
					</div>
					<Button title='Remove field' class="h-8 w-8 ml-auto" variant="outline" onclick={() => onFieldDeselection(field)}>
						<Trash2 />
					</Button>
				</div>
			{/each}
		</ScrollArea>
	</Card.Content>
</Card.Root>
