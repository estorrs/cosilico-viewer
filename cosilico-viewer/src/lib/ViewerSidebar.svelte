<script lang="ts">
	import * as Accordion from '$lib/components/ui/accordion';
    import { Button } from "$lib/components/ui/button/index.js";
	import * as Card from '$lib/components/ui/card';
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
    import { Input } from "$lib/components/ui/input";
	import { Label } from '$lib/components/ui/label/index.js';
    import * as Popover from "$lib/components/ui/popover/index.js";
    import { Slider } from "$lib/components/ui/slider";
    import SwatchSelector from './components/ui/swatch-selector/SwatchSelector.svelte';


	// let { experiment } = $props();
	let checked = $state(true);
    let hex = $state('#ff0000');
    let values = $state([10, 100]);
    let swatchHexs = $state(['#ff0000', '#00ff00', '#0000ff']);

    function onColorSelection(colorHex) {
        hex = colorHex;

    }
    
    function getValues() {
        return values;
    }
    function setValues(vs) {
        values = vs;
    }
    function setMinValuesFromEvent(e) {
        values[0] = Number(e.target.value);
    }
    function setMaxValuesFromEvent(e) {
        values[1] = Number(e.target.value);
        $state.snapshot(console.log('setting max', e.target.value, values));
    }

	function toggle(value) {
		console.log(value);
		checked = value;
	}
</script>


<!-- Icons
bolt
asterisk
egg-fried
regex -->




<!-- <Card.Root>
    <Card.Header>
        <Card.Title>Layers</Card.Title>
    </Card.Header>
    <Card.Content>
        <Accordion.Root>
            <Accordion.Item value="item-z">
                <div class="grid w-full grid-cols-[auto_1fr] items-center gap-2">
                    <Checkbox bind:checked id="terms" onCheckedChange={(v) => toggle(v)} />
                    <Accordion.Trigger>
                        <span id="terms-label" class="text-left">Layer name</span>
                    </Accordion.Trigger>
                </div>
                <Accordion.Content>
                    <Accordion.Root>
                        <Accordion.Item value="item-asdf">
                            <div class="grid w-full grid-cols-[auto_1fr] items-center gap-2">
                                <div class="flex items-center gap-2">
                                <Checkbox bind:checked id="terms" onCheckedChange={(v) => toggle(v)} />
                                <SwatchSelector {hex} {swatchHexs} {onColorSelection}/>
                                </div>
                                <Accordion.Trigger>
                                    <span id="teraams-label" class="text-left">channel name</span>
                                </Accordion.Trigger>
                            </div>
                            <Accordion.Content>
                                <Card.Root>
                                    <Card.Header>
                                        <Card.Title>Intensity Threshold</Card.Title>
                                    </Card.Header>
                                    <Card.Content>
                                        <div class="flex items-center gap-2 w-full">
                                            <Input type="number" value={values[0]} on:change={(e) => setMinValuesFromEvent(e)} class="w-[70px] text-center" />
                                            <Slider bind:value={getValues, setValues} min={0} max={255} step={1} class="flex-1" />
                                            <Input type="number" value={values[1]} on:change={(e) => setMaxValuesFromEvent(e)} class="w-[70px] text-center"/>
                                        </div>
                                    </Card.Content>
                                </Card.Root>
                            </Accordion.Content>
                        </Accordion.Item>
 -->

<!-- 


<Accordion.Root>
	<Accordion.Item value="item-1">
		<Accordion.Trigger>{'hello'}</Accordion.Trigger>
		<Accordion.Content>{'world'}</Accordion.Content>
	</Accordion.Item>
    <Accordion.Item value="item-2">
		<Accordion.Trigger>{'hello2'}</Accordion.Trigger>
		<Accordion.Content>{'world2'}</Accordion.Content>
	</Accordion.Item>
</Accordion.Root>

<Card.Root>
    <Card.Header>
        <Card.Title>Images</Card.Title>
    </Card.Header>
    <Card.Content>
        <Accordion.Root>
            <Accordion.Item value="item-z">
                <div class="grid w-full grid-cols-[auto_1fr] items-center gap-2">
                    <Checkbox bind:checked id="terms" onCheckedChange={(v) => toggle(v)} />
                    <Accordion.Trigger>
                        <span id="terms-label" class="text-left">channel name</span>
                    </Accordion.Trigger>
                </div>
                <Accordion.Content>
                    <Accordion.Root>
                        <Accordion.Item value="item-asdf">
                            <div class="grid w-full grid-cols-[auto_1fr] items-center gap-2">
                                <div class="flex items-center gap-2">
                                <Checkbox bind:checked id="terms" onCheckedChange={(v) => toggle(v)} />
                                <SwatchSelector {hex} {swatchHexs} {onColorSelection}/>
                                </div>
                                <Accordion.Trigger>
                                    <span id="teraams-label" class="text-left">channel name</span>
                                </Accordion.Trigger>
                            </div>
                            <Accordion.Content>
                                <Card.Root>
                                    <Card.Header>
                                        <Card.Title>Intensity Threshold</Card.Title>
                                    </Card.Header>
                                    <Card.Content>
                                        <div class="flex items-center gap-2 w-full">
                                            <Input type="number" value={values[0]} on:change={(e) => setMinValuesFromEvent(e)} class="w-[70px] text-center" />
                                            <Slider bind:value={getValues, setValues} min={0} max={255} step={1} class="flex-1" />
                                            <Input type="number" value={values[1]} on:change={(e) => setMaxValuesFromEvent(e)} class="w-[70px] text-center"/>
                                        </div>
                                    </Card.Content>
                                </Card.Root>
                            </Accordion.Content>
                        </Accordion.Item>
                    </Accordion.Root>
                </Accordion.Content>
            </Accordion.Item>
            <Accordion.Item value="item-2">
                <Accordion.Trigger>Nested?</Accordion.Trigger>
                <Accordion.Content>helo</Accordion.Content>
            </Accordion.Item>
        </Accordion.Root>

    </Card.Content>
</Card.Root> -->
