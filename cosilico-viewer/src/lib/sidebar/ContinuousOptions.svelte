<script lang="ts">
	import { Button, buttonVariants } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card';

	import { Input } from '$lib/components/ui/input';
	import { Slider } from '$lib/components/ui/slider';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';
	import { Switch } from '$lib/components/ui/switch/index.js';
	import * as Sheet from '$lib/components/ui/transparent-sheet/index.js';

	import EllipsisVertical from '@lucide/svelte/icons/ellipsis-vertical';

	import { continousPalettes, defaultPalettes } from '$lib/openlayers/ColorHelpers';
	import PaletteSelector from './PaletteSelector.svelte';

	let {
		vMin,
		vMax,
		absoluteVMin,
		absoluteVMax,
		vCenter = null,
		vStepSize = 0.01,
		palette = 'viridis',
		onVMinChange = (e) => null,
		onVMaxChange = (e) => null,
		onVCenterChange = (e) => null,
		onPaletteSelection = (e) => null
	} = $props();

	// let vMin = $state(0);
	// let vMax = $state(10);
	// let vCenter = $state(null);
	// let absoluteVMin = $state(0);
	// let absoluteVMax = $state(10);
	// let vStepSize = $state(1);

	let hasVCenter = $derived(vCenter !== null);

	let vCenterKey = $state(false);

	function vSliderGetValues() {
		return [vMin, vMax];
	}

	function vSliderSetValues(vs) {
		vMin = Number(vs[0]);
		vMax = Number(vs[1]);

		onVMinChange(vMin);
		onVMaxChange(vMax);
	}

	function vMinInputSetValue(v) {
		v = Number(v);
		vMin = v;
		onVMinChange(v);
	}

	function vMaxInputSetValue(v) {
		v = Number(v);
		vMax = v;
		onVMaxChange(v);
	}

	function vCenterInputSetValue(v) {
		v = Number(v);
		if (v >= vMax) {
			v = vMax;
		}
		if (v <= vMin) {
			v = vMin;
		}

		vCenter = v;
		onVCenterChange(vCenter);

		console.log('vcenter is', vCenter);

		vCenterKey = !vCenterKey;
	}

	function setInitialVCenter(v) {
		if (v) {
			if (vCenter == null) {
				vCenter = (vMax + vMin) / 2;
			}
			hasVCenter = true;
			onVCenterChange(vCenter);
		} else {
			hasVCenter = false;
			vCenter = null;
			onVCenterChange(null);
		}
	}
</script>

<Sheet.Root>
	<Sheet.Trigger>
		<Tooltip.Provider>
			<Tooltip.Root>
				<Tooltip.Trigger class={buttonVariants({ variant: 'outline' })}>
					<EllipsisVertical />
				</Tooltip.Trigger>
				<Tooltip.Content>
					<p>Adjust field view options</p>
				</Tooltip.Content>
			</Tooltip.Root>
		</Tooltip.Provider>
	</Sheet.Trigger>
	<Sheet.Portal>
		<Sheet.Overlay />
		<Sheet.Content>
			<Sheet.Header>
				<Sheet.Title>Field view options</Sheet.Title>
				<Sheet.Description>Adjust field view options for continuous metadata</Sheet.Description>
			</Sheet.Header>

			<div>
				<div class="flex flex-col items-center gap-0 w-full">
					<p>Color Palette</p>
					<PaletteSelector
						defaultPalette={palette}
						palettes={continousPalettes}
						onPaletteSelection={(v) => onPaletteSelection(v)}
					/>
					<p class="pt-2">Scale values</p>
					<Card.Root class="p-1 w-full">
						<Card.Header class="p-1">
							<Card.Title class="text-sm">Scale Min/Max</Card.Title>
						</Card.Header>
						<Card.Content class="p-1 pt-0">
							<div class="flex w-full items-center gap-3">
								<Input
									type="number"
									value={vMin}
									onchange={(e) => vMinInputSetValue(e.target.value)}
									class="w-[70px] py-1 text-left"
								/>
								<Slider
									bind:value={() => vSliderGetValues(), (vs) => vSliderSetValues(vs)}
									min={absoluteVMin}
									max={absoluteVMax}
									class="flex-1"
								/>
								<Input
									type="number"
									value={vMax}
									onchange={(e) => vMaxInputSetValue(e.target.value)}
									class="w-[70px] py-1 text-left"
								/>
							</div></Card.Content
						>
					</Card.Root>
					<Card.Root class="p-1 w-full">
						<Card.Header class="p-1">
							<Card.Title class="text-sm">Set scale center</Card.Title>
						</Card.Header>
						<Card.Content class="p-1 pt-0">
							<div class="flex w-full items-center gap-3">
								<Switch
									id="has-vcenter"
									checked={hasVCenter}
									onCheckedChange={(v) => setInitialVCenter(v)}
								/>
								{#key vCenterKey}
									{#if hasVCenter}
										<Input
											type="number"
											value={vCenter}
											step={vStepSize}
											onchange={(e) => vCenterInputSetValue(e.target.value)}
											class="w-[70px] py-1 text-left"
										/>
									{/if}
									{#if !hasVCenter}
										<p class="text-slate-700">No center value</p>
									{/if}
								{/key}
							</div>
						</Card.Content>
					</Card.Root>
				</div>
			</div>
		</Sheet.Content>
	</Sheet.Portal>
</Sheet.Root>
