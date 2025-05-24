<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Slider } from '$lib/components/ui/slider';
    import { Toggle } from '$lib/components/ui/toggle';
    import Lock from '@lucide/svelte/icons/lock';

    let {
		zoom,
        upp = 1,
        unit = 'px',
	} = $props();

    function findNextLowerValue(sortedList, value) {
        for (let i = 0; i < sortedList.length; i++) {
            if (sortedList[i] < value) {
            return sortedList[i];
            }
        }
        return sortedList[0]; 
    }


    // let imageUnitsPerBar = $derived(resolution * barPixelWidth);

    function getScaleBar(resolution, Upp, maxPixelWidth, steps) {
        const uppResolution = resolution * Upp; // real-world units per screen pixel

        for (let i = 0; i < steps.length; i++) {
            const step = steps[i]; // in real-world units
            const pixelWidth = step / uppResolution; // pixels wide on screen

            if (pixelWidth <= maxPixelWidth) {
            return {
                label: `${step} ${unit}`,
                width: pixelWidth,
                value: step
            };
            }
        }

        // fallback: largest step (last one in list)
        const fallback = steps[steps.length - 1];
        return {
            label: `${fallback} ${unit}`,
            width: fallback / uppResolution,
            value: fallback
        };
    }

    // const resolution = map.getView().getResolution();
    const steps = [10000, 5000, 2000, 1000, 500, 200, 100, 50, 20, 10, 5, 2, 1]; // descending order
    const obj = getScaleBar(zoom, upp, 50, steps);

</script>

<div class="flex flex-col items-center">
  <span class="mb-1 text-sm text-white">{obj.label}</span>
  <div class="h-[2px] bg-white" style="width: {obj.width}px;"></div>
</div>
