<script lang="ts">
    import { Button } from "$lib/components/ui/button/index.js";
    import Camera from "@lucide/svelte/icons/camera";

    import ViewSettingsDialog from "./ViewSettingsDialog.svelte";

    let {
        onSaveViewSettings = () => null,
        onExportViewSettings = (name) => null,
        onCaptureScreen = () => null,
    } = $props();
</script>

<div class="absolute left-4 top-4 right-96 z-50">
    <div class="w-full">
        <ViewSettingsDialog 
          {onSaveViewSettings}
          {onExportViewSettings}
          />
        <Button title='Screenshot' class='hover:bg-yellow-500' onclick={() => onCaptureScreen()}>
            <Camera color="#ffffff" />
        </Button>
    </div>
</div>