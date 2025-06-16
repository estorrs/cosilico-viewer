<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Slider } from '$lib/components/ui/slider/index.js';
    import { Description } from 'formsnap';

    let {
		minValue,
        maxValue,
        vMin,
        vMax,
        title = 'Adjust value',
        onMinValueChange = (v) => null,
        onMaxValueChange = (v) => null,
		step = 0.01
	} = $props();

	function vSliderSetValues(vs) {
		minValue = Number(vs[0]);
		maxValue = Number(vs[1]);

		onMinValueChange(minValue);
		onMaxValueChange(maxValue);
	}
</script>


<Card.Root class="p-1 w-full gap-0">
    <Card.Header class="p-1">
        <Card.Title class="text-sm">{title}</Card.Title>
    </Card.Header >
    <Card.Content class="p-1 pt-0">
        <div class="flex w-full items-center gap-3">
            <Input
                type="number"
                value={minValue}
                {step}
                onchange={(e) => {
                    minValue = Number(e.target.value);
                    onMinValueChange(minValue);
                }}
                class="w-[70px] py-1 text-left"
            />
            <Slider
                bind:value={() => [minValue, maxValue], (vs) => vSliderSetValues(vs)}
                min={vMin}
                max={vMax}
                {step}
                class="flex-1"
            />
            <Input
                type="number"
                value={maxValue}
                {step}
                onchange={(e) => {
                    maxValue = Number(e.target.value);
                    onMinValueChange(maxValue);
                }}
                class="w-[70px] py-1 text-left"
            />
        </div>
    </Card.Content>
</Card.Root>