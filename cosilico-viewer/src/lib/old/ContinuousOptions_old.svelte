<script lang="ts">
	import { onMount, tick } from 'svelte';

	import { Button, buttonVariants } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label/index.js';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import { Separator } from '$lib/components/ui/separator';
	import { Slider } from '$lib/components/ui/slider';
	import * as Tabs from '$lib/components/ui/tabs/index.js';
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';
	import { Switch } from '$lib/components/ui/switch/index.js';

	import EllipsisVertical from '@lucide/svelte/icons/ellipsis-vertical';

	let {
		// vMin,
		// vMax,
		// absoluteVMin,
		// absoluteVMax,
		// vCenter = null,
		// vStepSize = 0.01,
		// onVMinChange = (e) => null,
		// onVMaxChange = (e) => null,
		// onVCenterChange = (e) => null
	} = $props();

	let vMin = $state(0);
	let vMax = $state(10);
	// let vCenter = $state(null);
	let absoluteVMin = $state(0);
	let absoluteVMax = $state(10);
	let vStepSize = $state(1);

	// let hasVCenter = $derived(vCenter != null);

	function vSliderGetValues() {
		return [vMin, vMax];
	}

	function vSliderSetValues(vs) {
		vMin = Number(vs[0]);
		vMax = Number(vs[1]);

		// onVMinChange(vMin);
		// onVMaxChange(vMax);
	}

	function vMinInputSetValue(v) {
		v = Number(v);

		// if (v < absoluteVMin) {
		// 	v = absoluteVMin;
		// }
		// if (v >= vMax) {
		// 	v = vMax - vStepSize;
		// }

		vMin = v;
		// onVMinChange(vMin);
	}

	function vMaxInputSetValue(v) {
		v = Number(v);

		// if (v > absoluteVMax) {
		// 	v = absoluteVMax;
		// }
		// if (v <= vMin) {
		// 	v = vMin + vStepSize;
		// }

		vMax = v;
		// onVMaxChange(vMax);
	}

	// function vCenterInputSetValue(v) {
	// 	v = Number(v);
	// 	if (v >= vMax) {
	// 		v = vMax - vStepSize;
	// 	}
	// 	if (v <= vMin) {
	// 		v = vMin + vStepSize;
	// 	}

	// 	vCenter = v;
	// 	// onVCenterChange(vCenter);
	// }

	// function setInitialVCenter(v) {
	// 	if (v) {
	// 		if (vCenter == null) {
	// 			vCenter = (vMax + vMin) / 2;
	// 		}
	// 		hasVCenter = true;
	// 		// onVCenterChange(vCenter);
	// 	} else {
	// 		hasVCenter = false;
	// 		vCenter = null;
	// 		// onVCenterChange(null);
	// 	}
	// }

	// onMount(() => {

	// });
</script>

<Popover.Root>
	<Popover.Trigger>
		<Tooltip.Provider>
			<Tooltip.Root>
				<Tooltip.Trigger class={buttonVariants({ variant: 'outline' })}>
					<EllipsisVertical />
				</Tooltip.Trigger>
				<Tooltip.Content>
					<p>Adjust point view options</p>
				</Tooltip.Content>
			</Tooltip.Root>
		</Tooltip.Provider>
	</Popover.Trigger>
	<Popover.Content>
		<Card.Root>
			<Card.Header>
				<Card.Title class="text-sm">View options</Card.Title>
				<!-- <Card.Description>Set view options for field</Card.Description> -->
			</Card.Header>
			<Card.Content class="w-96">
				<div>
					<div class="flex flex-col items-center gap-0">
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
										step={vStepSize}
										class="w-[70px] py-1 text-left"
									/>
									<Slider
										bind:value={() => vSliderGetValues(), (vs) => vSliderSetValues(vs)}
										min={absoluteVMin}
										max={absoluteVMax}
										step={vStepSize}
										class="flex-1"
									/>
									<Input
										type="number"
										value={vMax}
										onchange={(e) => vMaxInputSetValue(e.target.value)}
										step={vStepSize}
										class="w-[70px] py-1 text-left"
									/>
								</div>
							</Card.Content>
						</Card.Root>
						<!-- <Card.Root class="p-1 w-full">
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
								</div>
							</Card.Content>
						</Card.Root> -->
					</div>
				</div>
			</Card.Content>
		</Card.Root>
	</Popover.Content>
</Popover.Root>
