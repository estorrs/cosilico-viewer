<script>
	// @ts-nocheck

	import * as Popover from '$lib/components/ui/popover/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card';
	import ColorPicker from 'svelte-awesome-color-picker';
    import Plus from "@lucide/svelte/icons/plus";

	let { hex, swatchHexs, onColorSelection = (e) => null } = $props();
	let currentHex = $state(null);
    let isOpen = $state(false);

    function addSwatch() {
		console.log('adding swatch');
        if (!swatchHexs.includes(currentHex)) {
            swatchHexs.push(currentHex);
        }
    }

</script>

<Popover.Root>
	<Popover.Trigger>
		<Button
			style="background-color: {hex}"
			class="border border-gray-400 hover:ring-gray flex h-5 w-5 items-center justify-center rounded-full p-0 ring-offset-2 transition-all hover:ring-2"
		></Button>
	</Popover.Trigger>
	<Popover.Content>
		<Card.Root>
			<Card.Header>
				<Card.Title>Swatches</Card.Title>
			</Card.Header>
			<Card.Content>
				<!-- <div class="flex  flex-col gap-2"> -->
					<div class="flex flex-wrap gap-1">
						{#each swatchHexs as value}
							<Button
								style="background-color: {value}"
								class="border border-gray-400 hover:ring-gray flex h-5 w-5 items-center justify-center rounded-full p-1 ring-offset-2 transition-all hover:ring-2"
								onclick={() => onColorSelection(value)}
							/>
						{/each}
                        <Popover.Root>
                            <Popover.Trigger>
                                <Button title="Add a new color swatch" variant="outline" class='border border-gray-400 hover:ring-gray flex h-5 w-5 items-center justify-center rounded-full p-1 ring-offset-2 transition-all hover:ring-2'>
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
                                    <Button onclick={() => addSwatch()}>
                                        Add Swatch
                                    </Button>
                                </div>
                            </Popover.Content>
                        </Popover.Root>
					</div>
			</Card.Content>
		</Card.Root>
	</Popover.Content>
</Popover.Root>
