<script lang="ts">
	import { Slider as SliderPrimitive, type WithoutChildrenOrChild } from "bits-ui";
	import { cn } from "$lib/utils.js";

	let {
		ref = $bindable(null),
		value = $bindable(),
		orientation = "horizontal",
        primaryHex = '#ffffff',
        secondaryHex = '#ffffff',
        primaryHexBorder = '#dddddd',
		class: className,
		...restProps
	}: WithoutChildrenOrChild<SliderPrimitive.RootProps> = $props();
</script>

<!--
Discriminated Unions + Destructing (required for bindable) do not
get along, so we shut typescript up by casting `value` to `never`.
-->
<SliderPrimitive.Root
	bind:ref
	bind:value={value as never}
	{orientation}
	class={cn(
		"relative flex touch-none select-none items-center data-[orientation='vertical']:h-full data-[orientation='vertical']:min-h-44 data-[orientation='horizontal']:w-full data-[orientation='vertical']:w-auto data-[orientation='vertical']:flex-col",
		className
	)}
	{...restProps}
>
	{#snippet children({ thumbs })}
		<span
			data-orientation={orientation}
			class="bg-secondary relative grow overflow-hidden rounded-full data-[orientation='horizontal']:h-2 data-[orientation='vertical']:h-full data-[orientation='horizontal']:w-full data-[orientation='vertical']:w-2"
            style="background-color: {secondaryHex};"
		>
			<SliderPrimitive.Range
				class="bg-primary absolute data-[orientation='horizontal']:h-full data-[orientation='vertical']:w-full"
                style="background-color: {primaryHex};"
			/>
		</span>
		{#each thumbs as thumb (thumb)}
			<SliderPrimitive.Thumb
				index={thumb}
				class="border-primary bg-background ring-offset-background focus-visible:ring-ring block size-5 rounded-full border-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
                style="border-color: {primaryHexBorder}; --tw-ring-color: {primaryHexBorder};"
			/>
		{/each}
	{/snippet}
</SliderPrimitive.Root>
