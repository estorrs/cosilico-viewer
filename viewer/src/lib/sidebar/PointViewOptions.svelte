<script>
    import * as Accordion from '$lib/components/ui/accordion';
    import { Button } from "$lib/components/ui/button/index.js";
	import * as Card from '$lib/components/ui/card';
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
    import { Input } from "$lib/components/ui/input";
	import { Label } from '$lib/components/ui/label/index.js';
    import * as Popover from "$lib/components/ui/popover/index.js";
    import { Separator } from "$lib/components/ui/separator";
    import { Slider } from "$lib/components/ui/slider";
    import * as Tabs from "$lib/components/ui/tabs/index.js";
    import * as Tooltip from "$lib/components/ui/tooltip/index.js";
    import SwatchSelector from '$lib/components/ui/swatch-selector/SwatchSelector.svelte';
    import Regex from "lucide-svelte/icons/regex";

</script>


<Popover.Root>
	<Popover.Trigger>
        <Tooltip.Root>
            <Tooltip.Trigger asChild let:builder>
              <!-- <Button builders={[builder]} variant="outline">Hover</Button> -->
              <Button builders={[builder]} variant="outline">
                <Regex />
                </Button>
            </Tooltip.Trigger>
            <Tooltip.Content>
              <p>Point view options</p>
            </Tooltip.Content>
          </Tooltip.Root>
	</Popover.Trigger>
	<Popover.Content>
		<Card.Root>
			<Card.Header>
				<Card.Title>Point view options</Card.Title>
                <Card.Description>Set view options for point-level features</Card.Description>
			</Card.Header>
			<Card.Content>
                <div>
                    <div class="flex flex-col items-center gap-0">
                    <p>View features as</p>
                    <Tabs.Root value="point">
                        <Tabs.List class="grid w-full grid-cols-2">
                          <Tabs.Trigger value="point">Points</Tabs.Trigger>
                          <Tabs.Trigger value="density">Density Map</Tabs.Trigger>
                        </Tabs.List>
                        <Tabs.Content value="point">
                        </Tabs.Content>
                        <Tabs.Content value="density">
                        </Tabs.Content>
                    </Tabs.Root>
                    </div>
                    <Separator />
                </div>
            </Card.Content>
        </Card.Root>
    </Popover.Content>
</Popover.Root>