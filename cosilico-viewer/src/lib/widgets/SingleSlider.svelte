<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Slider } from '$lib/components/ui/slider';

    let {
		value,
        vMin,
        vMax,
        title = 'Adjust value',
        onValueChange = (v) => null,
		step = 0.01,
        location = 'left' // right or left
	} = $props();

	function vSliderSetValues(vs) {
		value = Number(vs[0]);
		onValueChange(value);
	}
</script>


<Card.Root class="p-1 w-full">
    <Card.Header class="p-1">
        <Card.Title class="text-sm">{title}</Card.Title>
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