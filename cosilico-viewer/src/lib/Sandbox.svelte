<script lang="ts">
	import Addable from './widgets/SearchAddable.svelte';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import { Button } from '$lib/components/ui/button/index.js';

	let fields = $state([
		{
			name: 'blah a',
			isSelected: false
		},
		{
			name: 'blah c',
			isSelected: false
		},
		{
			name: 'blah aaa',
			isSelected: false
		},
		{
			name: 'blah za',
			isSelected: false
		}
	]);

	function onFieldSelection(field) {
		// do some internal stuff
	}

	function onFieldDeletion(field, childOnDeleteField) {
		// do some internal stuff
		childOnDeleteField(field);
	}
</script>

<Addable {fields} {onFieldSelection} displayNFields={0}>
	{#snippet fieldSnippet(field, childOnDeleteField)}
		<div class="flex items-center gap-2 pt-1">
			<p>{field.name}</p>
			<Button
				title="Remove field"
				variant="outline"
				onclick={() => onFieldDeletion(field, childOnDeleteField)}
			>
				<Trash2 />
			</Button>
		</div>
	{/snippet}
</Addable>
