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
        fieldSnippet,
		displayNFields = 20,
		displayNFieldsSearch = 100,
		onFieldSelection = (field) => null,
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
	let search = $state('');
	let filteredFields = $derived(filterFields(search));

	let open = $state(false);
	let name = $state('');
	let triggerRef = $state<HTMLButtonElement>(null!);

	const selectedValue = $derived(fields.find((f) => f.name === name)?.name);

	function filterFields(search) {
		let scores = [];
		for (const field of fields) {
			const score = computeCommandScore(field.name, search);
			scores.push(score);
		}
		let objs = fields.map((f, i) => ({ entity: f, score: scores[i] }));
		objs = objs.sort((a, b) => b.score - a.score);
		objs = objs.filter((f) => f.score > 0);
		objs = objs.map((f) => f.entity);
		const n = objs.length - displayNFieldsSearch;
		objs = objs.slice(0, displayNFieldsSearch);
		if (n > 0) {
			objs.push({
				name: `${n} additional ${entityName}`,
				isDisabeled: true
			});
		}
		return objs;
	}

	function closeAndFocusTrigger() {
		open = false;
		tick().then(() => {
			triggerRef.focus();
		});
	}

	function onAddField(field) {
		closeAndFocusTrigger();
		selectedFields.push(field);
		field.isSelected = true;
        onFieldSelection(field);

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

<Popover.Root bind:open>
	<Popover.Trigger bind:ref={triggerRef}>
		{#snippet child({ props })}
			<Button
				variant="outline"
				class="w-[200px] justify-between"
				{...props}
				role="combobox"
				aria-expanded={open}
			>
				{selectedValue || 'Select a field...'}
				<ChevronsUpDown class="opacity-50" />
			</Button>
		{/snippet}
	</Popover.Trigger>
	<Popover.Content class="w-[200px] p-0">
		<Command.Root shouldFilter={false}>
			<Command.Input bind:value={search} placeholder={`Search ${entityName}...`} />
			<Command.List>
				<Command.Empty>{`No ${entityName} found.`}</Command.Empty>
				<Command.Group>
					{#each filteredFields as field (field.name)}
						{#if !field.isSelected}
							<Command.Item
								value={field.name}
								disabled={field.isDisabeled}
								onSelect={() => onAddField(field)}
							>
								{field.name}
							</Command.Item>
						{/if}
					{/each}
				</Command.Group>
			</Command.List>
		</Command.Root>
	</Popover.Content>
</Popover.Root>
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
<!-- 

<div class="flex items-center gap-2 pt-1 w-full">
    <div class="flex items-center gap-2 pt-1">
        <Checkbox
            title="Field visibility"
            checked={field.isVisible}
            onCheckedChange={(v) => onFieldVisibilityChange(field, v)}
        />
        {#if areCategorical && getCurrentObjectType() == 'point'}
            <SwatchSelector
                title="Select field color and symbol"
                hex={field.hex}
                {swatchHexs}
                includeSymbols={true}
                onColorSelection={(value) => onFieldColorSelection(field, value)}
                onSymbolSelection={(value) => onFieldSymbolSelection(field, value)}
            />
            <p>{field.name}</p>
        {/if}
        {#if areCategorical && getCurrentObjectType() == 'polygon'}
            <SwatchSelector
                title="Select field color"
                hex={field.hex}
                {swatchHexs}
                includeSymbols={false}
                onColorSelection={(value) => onFieldColorSelection(field, value)}
            />
            <p>{field.name}</p>
        {/if}
        {#if !areCategorical}
            <p>{field.name}</p>
        {/if}
    </div>
    <div class="ml-auto">
        {#if !areCategorical}
            <ContinuousOptions
                vMin={field.vMin}
                vMax={field.vMax}
                absoluteVMin={field.absoluteVMin}
                absoluteVMax={field.absoluteVMax}
                vCenter={field.vCenter}
                vStepSize={field.vStepSize}
                onVMinChange={(v) => onFieldVMinChange(field, v)}
                onVMaxChange={(v) => onFieldVMaxChange(field, v)}
                onVCenterChange={(v) => onFieldVCenterChange(field, v)}
            />
        {/if}
        <Button
            title="Remove field"
            variant="outline"
            onclick={() => onFieldDeselection(field)}
        >
            <Trash2 />
        </Button>
    </div>
</div> -->
