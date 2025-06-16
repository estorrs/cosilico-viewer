<script>
	// @ts-nocheck

	import * as Popover from '$lib/components/ui/popover/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card';
	import * as ToggleGroup from '$lib/components/ui/toggle-group/index.js';
	import ColorPicker from 'svelte-awesome-color-picker';

	import Plus from '@lucide/svelte/icons/plus';
	import Circle from '@lucide/svelte/icons/circle';
	import Triangle from '@lucide/svelte/icons/triangle';
	import Square from '@lucide/svelte/icons/square';
	import Star from '@lucide/svelte/icons/star';
	import Cross from '@lucide/svelte/icons/cross';
	import Hexagon from '@lucide/svelte/icons/hexagon';
	import Diamond from '@lucide/svelte/icons/diamond';
	import Sparkle from '@lucide/svelte/icons/sparkle';

	let {
		hex,
		swatchHexs,
		currentShape = 'circle',
		onColorSelection = (e) => null,
		includeSymbols = false,
		onSymbolSelection = (e) => null,
		title="Select color"
	} = $props();

	let currentHex = $state(null);
	let isOpen = $state(false);

	function addSwatch() {
		console.log('adding swatch');
		if (!swatchHexs.includes(currentHex)) {
			swatchHexs.push(currentHex);
		}
	}

	function selectSymbol(symbol) {
		currentShape = symbol;
		onSymbolSelection(symbol);
	}
</script>

{#snippet icon(shape, size = 14)}
	{#if shape == 'circle'}
		<Circle strokeWidth={4} color={hex} {size} />
	{/if}
	{#if shape == 'triangle'}
		<Triangle strokeWidth={4} color={hex} {size} />
	{/if}
	{#if shape == 'square'}
		<Square strokeWidth={4} color={hex} {size} />
	{/if}
	{#if shape == 'diamond'}
		<Diamond strokeWidth={4} color={hex} {size} />
	{/if}
	{#if shape == 'hexagon'}
		<Hexagon strokeWidth={4} color={hex} {size} />
	{/if}
	{#if shape == 'star'}
		<Star strokeWidth={4} color={hex} {size} />
	{/if}
	{#if shape == 'sparkle'}
		<Sparkle strokeWidth={4} color={hex} {size} />
	{/if}
{/snippet}

<Popover.Root>
	<Popover.Trigger {title} class='text-sm'>
		{#if !includeSymbols}
			<Button
				style="background-color: {hex}"
				class="border border-gray-400 hover:ring-gray flex h-5 w-5 items-center justify-center rounded-full p-0 ring-offset-2 transition-all hover:ring-2"
			></Button>
		{/if}
		{#if includeSymbols}
		<Button
				style="background-color: white"
				class="hover:ring-gray flex h-5 w-5 items-center justify-center p-0 ring-offset-0 transition-all hover:ring-2">
				{@render icon(currentShape)}
			</Button>
		{/if}
	</Popover.Trigger>
	<Popover.Content class='flex gap-2 flex-col'>
		<Card.Root class="p-1 w-full gap-0">
			<Card.Header class='p-1 pb-0'>
				<Card.Title class='text-md'>Swatches</Card.Title>
			</Card.Header>
			<Card.Content class='p-1 pt-0'>
				<div class="flex flex-wrap gap-1">
					{#each swatchHexs as value}
						<Button
							style="background-color: {value}"
							class="border border-gray-400 hover:ring-gray-400 flex h-6 w-6 items-center justify-center rounded-full p-1 ring-offset-1 transition-all hover:ring-1"
							onclick={() => onColorSelection(value)}
						/>
					{/each}
					<Popover.Root>
						<Popover.Trigger>
							<Button
								title="Add a new color swatch"
								variant="outline"
								class="border border-gray-400 hover:ring-gray-400 flex h-6 w-6 items-center justify-center rounded-full p-1 ring-offset-1 transition-all hover:ring-1"
							>
								<Plus />
							</Button>
						</Popover.Trigger>
						<Popover.Content>
							<div class="flex flex-col gap-2">
								<ColorPicker
									{hex}
									isDialog={false}
									isAlpha={false}
									onInput={(event) => {
										currentHex = event.hex;
									}}
								/>
								<Button onclick={() => addSwatch()}>Add Swatch</Button>
							</div>
						</Popover.Content>
					</Popover.Root>
				</div>
			</Card.Content>
		</Card.Root>
		{#if includeSymbols}
			<Card.Root>
				<Card.Header class='p-1'>
					<Card.Title class='text-md'>Symbols</Card.Title>
				</Card.Header>
				<Card.Content class='p-1'>
					<ToggleGroup.Root type="single" variant="outline" size="sm" onValueChange={(v) => selectSymbol(v)}>
						<div class="flex flex-wrap gap-1">
							<ToggleGroup.Item value="circle" aria-label="Circle">
								{@render icon('circle')}
							</ToggleGroup.Item>
							<ToggleGroup.Item value="triangle" aria-label="Triangle">
								{@render icon('triangle')}
							</ToggleGroup.Item>
							<ToggleGroup.Item value="square" aria-label="Square">
								{@render icon('square')}
							</ToggleGroup.Item>
							<ToggleGroup.Item value="diamond" aria-label="Diamond">
								{@render icon('diamond')}
							</ToggleGroup.Item>
							<ToggleGroup.Item value="hexagon" aria-label="Hexagon">
								{@render icon('hexagon')}
							</ToggleGroup.Item>
							<ToggleGroup.Item value="star" aria-label="Star">
								{@render icon('star')}
							</ToggleGroup.Item>
							<ToggleGroup.Item value="sparkle" aria-label="Sparkle">
								{@render icon('sparkle')}
							</ToggleGroup.Item>
						</div>
					</ToggleGroup.Root>
				</Card.Content>
			</Card.Root>
		{/if}
	</Popover.Content>
</Popover.Root>
