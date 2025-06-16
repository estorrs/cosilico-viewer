<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Slider } from '$lib/components/ui/slider/index.js';

    let {
		value,
        vMin,
        vMax,
        title = 'Adjust value',
        onValueChange = (v) => null,
		step = 0.01,
        location = 'left', // right or left or top or bottom
        orientation = 'horizontal',
	} = $props();

	function vSliderSetValues(vs) {
		value = Number(vs[0]);
		onValueChange(value);
	}
</script>


<Card.Root class="p-1 w-full gap-0">
    <Card.Header class="p-1 pb-0">
        <Card.Title class="text-sm mb-0">{title}</Card.Title>
    </Card.Header>
    <Card.Content class="p-1 pt-0">
        <div class="flex w-full items-center gap-3">
            {#if location == 'right'}
                <Input
                    type="number"
                    {value}
                    {step}
                    onchange={(e) => {
                        value = Number(e.target.value);
                        onValueChange(value);
                    }}
                    class="w-[70px] py-1 text-left"
                />
            {/if}
            <Slider
                bind:value={() => [value], (vs) => vSliderSetValues(vs)}
                orientation={orientation}
                min={vMin}
                max={vMax}
                {step}
                class="flex-1"
            />
            {#if location == 'left'}
                <Input
                    type="number"
                    {value}
                    {step}
                    onchange={(e) => {
                        value = Number(e.target.value);
                        onValueChange(value);
                    }}
                    class="w-[70px] py-1 text-left"
                />
            {/if}
        </div>
    </Card.Content>
</Card.Root>