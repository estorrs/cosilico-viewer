<script lang="ts">
    import Check from "@lucide/svelte/icons/check";
    import ChevronsUpDown from "@lucide/svelte/icons/chevrons-up-down";
    import { tick } from "svelte";
    import * as Command from "$lib/components/ui/command/index.js";
    import * as Popover from "$lib/components/ui/popover/index.js";
    import { Button } from "$lib/components/ui/button/index.js";
    import { cn } from "$lib/utils.js";
    import { computeCommandScore } from "bits-ui";
   
    // const frameworks = [
    //   {
    //     value: "sveltekit",
    //     label: "SvelteKit",
    //   },
    //   {
    //     value: "next.js",
    //     label: "Next.js",
    //   },
    //   {
    //     value: "nuxt.js",
    //     label: "Nuxt.js",
    //   },
    //   {
    //     value: "remix",
    //     label: "Remix",
    //   },
    //   {
    //     value: "astro",
    //     label: "Astro",
    //   },
    //   {
    //     value: "asveltekit",
    //     label: "SvelteKit",
    //   },
    //   {
    //     value: "bnext.js",
    //     label: "Next.js",
    //   },
    //   {
    //     value: "cnuxt.js",
    //     label: "Nuxt.js",
    //   },
    //   {
    //     value: "dremix",
    //     label: "Remix",
    //   },
    //   {
    //     value: "eastro",
    //     label: "Astro",
    //   },
    // ];
    // function getRandomSubstring(str: string, minLength = 1, maxLength = str.length): string {
    //     const start = Math.floor(Math.random() * (str.length - minLength + 1));
    //     const length = Math.floor(Math.random() * (Math.min(maxLength, str.length - start) - minLength + 1)) + minLength;
    //     return str.slice(start, start + length);
    // }
    function getRandomUint64(): bigint {
        const high = BigInt(Math.floor(Math.random() * 0x100000000)); // upper 32 bits
        const low = BigInt(Math.floor(Math.random() * 0x100000000));  // lower 32 bits
        return (high << 32n) | low;
    }
    let frameworks = [];
    for (let i = 0; i < 30000; i++) {
        // const sub = getRandomUint64().toString();
        frameworks.push({
            value: i.toString(),
            label: i.toString(),
            isDisabeled: false
        })
    }

    let displayMaxFieldN = 50;
   
    let open = $state(false);
    let value = $state("");
    let triggerRef = $state<HTMLButtonElement>(null!);
   
    const selectedValue = $derived(
      frameworks.find((f) => f.value === value)?.label
    );

    let search = $state('');
    let filteredFields = $derived(filterFields(search));
   
    // We want to refocus the trigger button when the user selects
    // an item from the list so users can continue navigating the
    // rest of the form with the keyboard.
    function closeAndFocusTrigger() {
      open = false;
      tick().then(() => {
        triggerRef.focus();
      });
    }

    // function customFilter(
	// 	commandValue: string,
	// 	search: string,
	// 	commandKeywords?: string[]
	// ): number {
    //     console.log('running', commandValue, search);
	// 	const score = computeCommandScore(commandValue, search, commandKeywords);
 
	// 	// Add custom logic here
	// 	return score;
	// }

    function filterFields(search) {
        let scores = [];
        for (const field of frameworks) {
            // console.log('here');
            const score = computeCommandScore(field.value, search);
            scores.push(score);
        }
        let objs = frameworks.map((f, i) => ({ entity: f, score: scores[i] }));
        objs = objs.sort((a, b) => b.score - a.score);
        objs = objs.filter((f) => f.score > 0);
        objs = objs.map((f) => f.entity);
        const n = objs.length - displayMaxFieldN;
        objs = objs.slice(0, displayMaxFieldN);
        if (n > 0) {
            objs.push({
            value: `${n} additional fields`,
            label: `${n} additional fields`,
            isDisabeled: true
            });
        }
        return objs;
       
    }

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
          {selectedValue || "Select a framework..."}
          <ChevronsUpDown class="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      {/snippet}
    </Popover.Trigger>
    <Popover.Content class="w-[200px] p-0">
      <Command.Root shouldFilter={false}>
        <Command.Input bind:value={search} placeholder="Search framework..." />
        <Command.List>
          <Command.Empty>No framework found.</Command.Empty>
          <Command.Group>
            {#each filteredFields as framework}
              <Command.Item
                value={framework.value}
                disabled={framework.isDisabeled}
                onSelect={() => {
                  value = framework.value;
                  closeAndFocusTrigger();
                }}
              >
                <Check
                  class={cn(
                    "mr-2 size-4",
                    value !== framework.value && "text-transparent"
                  )}
                />
                {framework.label}
              </Command.Item>
            {/each}
          </Command.Group>
        </Command.List>
      </Command.Root>
    </Popover.Content>
  </Popover.Root>