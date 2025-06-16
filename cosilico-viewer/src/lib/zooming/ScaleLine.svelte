<script lang="ts">

    import { getScaleBar } from '$lib/openlayers/OpenlayersHelpers.js';

    let {
		zoom,
        upp = 1,
        unit = 'px',
	} = $props();

    const obj = getScaleBar(zoom, upp, 100, unit);

</script>

<div class="flex flex-col items-center">
  <span class="mb-1 text-sm text-white">{obj.label}</span>
  <div class="h-[2px] bg-white" style="width: {obj.width}px;"></div>
</div>
