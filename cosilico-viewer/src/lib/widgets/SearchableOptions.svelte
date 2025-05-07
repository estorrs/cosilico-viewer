<script lang="ts">
	import Check from '@lucide/svelte/icons/check';
	import ChevronsUpDown from '@lucide/svelte/icons/chevrons-up-down';
	import { onMount, tick } from 'svelte';
	import * as Command from '$lib/components/ui/command/index.js';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { computeCommandScore } from 'bits-ui';
	import { cn } from '$lib/utils.js';

	let {
		names,
		displayNFields = 100,
		onSelection = (name) => null,
		entityName = 'options'
	} = $props();

	// let names = $state(['opt a', 'optb', 'optc', 'optd'])
	let fields = $state([]);

	let search = $state('');
	let filteredFields = $derived(filterFields(search));

	let open = $state(false);
	let name = $state('');
	let triggerRef = $state<HTMLButtonElement>(null!);

	let selectedField = $state({ name: null, isDisabled: null, isSelected: null });

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
		const n = objs.length - displayNFields;
		objs = objs.slice(0, displayNFields);
		if (n > 0) {
			objs.push({
				name: `${n} additional ${entityName}`,
				isSelected: false,
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

	function onFieldSelection(field) {
		closeAndFocusTrigger();
		selectedField = field;
		field.isSelected = true;
		onSelection(field.name);
	}

	onMount(() => {
		for (let name of names) {
			let field = {
				name: name,
				isDisabeled: false,
				isSelected: false
			};
			fields.push(field);
		}
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
				{selectedField.name || `Select an option...`}
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
						<Command.Item
							value={field.name}
							disabled={field.isDisabeled}
							onSelect={() => onFieldSelection(field)}
						>
							<Check class={cn(selectedField.name !== field.name && 'text-transparent')} />
							{field.name}
						</Command.Item>
					{/each}
				</Command.Group>
			</Command.List>
		</Command.Root>
	</Popover.Content>
</Popover.Root>
