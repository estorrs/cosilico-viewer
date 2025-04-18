<script>
	import * as Accordion from '$lib/components/ui/accordion';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card';
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label/index.js';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import { Separator } from '$lib/components/ui/separator';
	import { Slider } from '$lib/components/ui/slider';
	import * as Tabs from '$lib/components/ui/tabs/index.js';
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';
	import SwatchSelector from '$lib/components/ui/swatch-selector/SwatchSelector.svelte';
	import Regex from 'lucide-svelte/icons/regex';

	let {
        view,
		onPointScaleChange = (e) => null,
		onFillOpacityChange = (e) => null,
        onStrokeOpacityChange = (e) => null,
		minScale = 0,
		maxScale = 4,
        minStrokeWidth = 0,
        maxStrokeWisth = 4,
	} = $props();

	function scaleSliderGetValue() {
		return [view.scale];
	}

	function scaleSliderSetValue(v) {
		v = Number(v[0]);
		view.scale = v;

		onPointScaleChange(v);
	}

	function scaleInputGetValue() {
		return view.scale;
	}

	function scaleInputSetValue(v) {
		v = Number(v);
		view.scale = v;

		onPointScaleChange(v);
	}

	function fillOpacitySliderGetValue() {
		return [view.fillOpacity];
	}

	function fillOpacitySliderSetValue(v) {
		v = Number(v[0]);
		view.fillOpacity = v;

		onFillOpacityChange(v);
	}

	function fillOpacityInputGetValue() {
		return view.fillOpacity;
	}

	function fillOpacityInputSetValue(v) {
		v = Number(v);
		view.fillOpacity = v;

		onFillOpacityChange(v);
	}

    function strokeOpacitySliderGetValue() {
		return [view.strokeOpacity];
	}

	function strokeOpacitySliderSetValue(v) {
		v = Number(v[0]);
		view.strokeOpacity = v;

		onStrokeOpacityChange(v);
	}

	function strokeOpacityInputGetValue() {
		return view.strokeOpacity;
	}

	function strokeOpacityInputSetValue(v) {
		v = Number(v);
		view.strokeOpacity = v;

		onStrokeOpacityChange(v);
	}

    function strokeWidthSliderGetValue() {
		return [view.strokeWidth];
	}

	function strokeWidthSliderSetValue(v) {
		v = Number(v[0]);
		view.strokeWidth = v;

		onStrokeWidthChange(v);
	}

	function strokeWidthInputGetValue() {
		return view.strokeWidth;
	}

	function strokeWidthInputSetValue(v) {
		v = Number(v);
		view.strokeWidth = v;

		onStrokeWidthChange(v);
	}
</script>

<Popover.Root>
	<Popover.Trigger>
		<Tooltip.Root>
			<Tooltip.Trigger asChild let:builder>
				<Button builders={[builder]} variant="outline">
					<Regex />
				</Button>
			</Tooltip.Trigger>
			<Tooltip.Content>
				<p>Point view options</p>
			</Tooltip.Content>
		</Tooltip.Root>
	</Popover.Trigger>
	<Popover.Content>
		<Card.Root>
			<Card.Header>
				<Card.Title>Point view options</Card.Title>
				<Card.Description>Set view options for point-level features</Card.Description>
			</Card.Header>
			<Card.Content>
				<div>
					<div class="flex flex-col items-center gap-0">
						<p>View features as</p>
						<Tabs.Root value={view.viewAs}>
							<Tabs.List class="grid w-full grid-cols-2">
								<Tabs.Trigger value="point">Points</Tabs.Trigger>
								<Tabs.Trigger value="density">Density Map</Tabs.Trigger>
							</Tabs.List>
							<Tabs.Content value="point">
                                <p>Scaling</p>
								<Card.Root class="p-1">
									<Card.Header class="p-1">
										<Card.Title class="text-sm">Point size</Card.Title>
									</Card.Header>
									<Card.Content class="p-1 pt-0">
										<div class="flex w-full items-center gap-3">
											<Slider
												bind:value={() => scaleSliderGetValue(), (v) => scaleSliderSetValue(v)}
												min={minScale}
												max={maxScale}
												step={0.01}
												class="flex-1"
											/>
											<Input
												type="number"
                                                step=".01"
												bind:value={() => scaleInputGetValue(), (v) => null}
												on:change={(e) => scaleInputSetValue(e.target.value)}
												class="w-[70px] py-1 text-left"
											/>
										</div>
									</Card.Content>
								</Card.Root>
                                <p class='pt-2'>Fill</p>
								<Card.Root class="p-1">
									<Card.Header class="p-1">
										<Card.Title class="text-sm">Fill opacity</Card.Title>
									</Card.Header>
									<Card.Content class="p-1 pt-0">
										<div class="flex w-full items-center gap-3">
											<Slider
												bind:value={
													() => fillOpacitySliderGetValue(), (v) => fillOpacitySliderSetValue(v)
												}
												min={0}
												max={1.0}
												step={0.01}
											/>
											<Input
												type="number"
                                                step=".01"
												bind:value={() => fillOpacityInputGetValue(), (v) => null}
												on:change={(e) => fillOpacityInputSetValue(e.target.value)}
												class="w-[70px] py-1 text-left"
											/>
										</div>
									</Card.Content>
								</Card.Root>
                                <p class='pt-2'>Stroke</p>
								<Card.Root class="p-1">
									<Card.Header class="p-1">
										<Card.Title class="text-sm">Stroke opacity</Card.Title>
									</Card.Header>
									<Card.Content class="p-1 pt-0">
										<div class="flex w-full items-center gap-3">
											<Slider
												bind:value={
													() => strokeOpacitySliderGetValue(), (v) => strokeOpacitySliderSetValue(v)
												}
												min={0}
												max={1.0}
												step={0.01}
											/>
											<Input
												type="number"
                                                step=".01"
												bind:value={() => strokeOpacityInputGetValue(), (v) => null}
												on:change={(e) => strokeOpacityInputSetValue(e.target.value)}
												class="w-[70px] py-1 text-left"
											/>
										</div>
									</Card.Content>
								</Card.Root>
                                <Card.Root class="p-1">
									<Card.Header class="p-1">
										<Card.Title class="text-sm">Stroke width</Card.Title>
									</Card.Header>
									<Card.Content class="p-1 pt-0">
										<div class="flex w-full items-center gap-3">
											<Slider
												bind:value={
													() => strokeWidthSliderGetValue(), (v) => strokeWidthSliderSetValue(v)
												}
												min={minStrokeWidth}
												max={maxStrokeWisth}
												step={0.01}
											/>
											<Input
												type="number"
                                                step=".01"
												bind:value={() => strokeWidthInputGetValue(), (v) => null}
												on:change={(e) => strokeWidthInputSetValue(e.target.value)}
												class="w-[70px] py-1 text-left"
											/>
										</div>
									</Card.Content>
								</Card.Root>
							</Tabs.Content>
							<Tabs.Content value="density"></Tabs.Content>
						</Tabs.Root>
					</div>
					<Separator />
				</div>
			</Card.Content>
		</Card.Root>
	</Popover.Content>
</Popover.Root>
