<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';

	import ChevronsUpDown from '@lucide/svelte/icons/chevrons-up-down';

	import { onMount, tick } from 'svelte';
	import * as Command from '$lib/components/ui/command/index.js';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { ScrollArea } from '$lib/components/ui/scroll-area/index.js';
	import { computeCommandScore } from 'bits-ui';

	let {
        fields,
        popoverSnippet,
        fieldSnippet,
		displayNFields = 20,
        entityName = 'fields',
	} = $props();

    // fields = [
    //     {
    //         name: 'blah a',
    //         isSelected: false,
    //         ... // rest can be custom, must work with given snippet

    //     }
    // ];

	let rerenderActive = $state(false);

	let selectedFields = $state([]);

	function onAddField(field) {
		selectedFields.push(field);
		field.isSelected = true;

		rerenderActive = !rerenderActive;
	}

	function onDeleteField(field) {
		selectedFields = selectedFields.filter((item) => item.name !== field.name);
		field.isSelected = false;

		rerenderActive = !rerenderActive;
	}

	onMount(() => {
		for (let field of fields) {
			field.isDisabeled = false;
			if (field.isSelected){
				selectedFields.push(field);
			} else if (fields.length < displayNFields) {
				field.isSelected = true;
				selectedFields.push(field);
			} else {
				field.isSelected = false;
			}
		}
		rerenderActive = !rerenderActive;

	});
</script>

<!-- <Popover.Root bind:open>
	<Popover.Trigger>

		<!-- {#snippet child({ props })}
			<Button
				variant="outline"
			    >
				{selectedValue || 'Select a field...'}
				<ChevronsUpDown class="opacity-50" />
			</Button>
		{/snippet} -->
	</Popover.Trigger>
	<Popover.Content class="w-[200px] p-0">
		
	</Popover.Content>
</Popover.Root> -->
{#key rerenderActive}
	<Card.Root>
		<Card.Header class="p-1">
			<Card.Title class="text-md">{`Active ${entityName}`}</Card.Title>
		</Card.Header>
		<Card.Content class="p-1 pt-0">
			<ScrollArea class="rounded-md border p-2">
				{#each selectedFields as field (field.name)}
                    {@render fieldSnippet(field, onDeleteField)}
				{/each}
			</ScrollArea>
		</Card.Content>
	</Card.Root>
{/key}
