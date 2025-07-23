<script lang="ts">
  import { invalidate } from '$app/navigation'
  import type { EventHandler } from 'svelte/elements'
  import DirectoryTable from '$lib/directories/directory-table.svelte'
  import { columns } from '$lib/directories/columns.js'

  let { data } = $props()
  let { rowData, viewSettingsData, profile, supabase, user } = $derived(data);
  
</script>

<div class='p-2'>
  <DirectoryTable  data={rowData} {columns} {profile} {viewSettingsData} onViewSettingsImport={async (experimentId, importId) => {
    let response = await supabase.from('view_settings').select('id,settings').eq('id', importId).single();
    const settings = response.data.settings;

    console.log('experimentID', experimentId);
    response = await supabase.from('experiments').select('id,view_setting_id').eq('id', experimentId).single();
    const viewSettingId = response.data.view_setting_id;

    console.log('updating', viewSettingId, 'with', importId);

    const { error } = await supabase
              .from('view_settings')
              .update({ settings: settings })
              .eq('id', viewSettingId)

  }}/>
</div>