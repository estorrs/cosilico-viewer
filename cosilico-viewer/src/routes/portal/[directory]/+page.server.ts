// import type { PageServerLoad } from '../$types.js'
// import { PageServerLoad } from './$types.js';
import type { PageServerLoad } from "./$types.js";
import type { DirectoryEntityRow } from "$lib/directories/columns.js";
import type { ViewSettingRow } from "$lib/view-settings/columns.js";
import { getPermissions } from "$lib/server/supabase/permission.js";

export const load: PageServerLoad = async ({ params, depends, locals: { supabase, user } }) => {
  depends('supabase:db:re')
  let directory_entities;
  if (params.directory != 'root') {
    const response = await supabase.from('directory_entities').select('*').eq('parent_id', params.directory).order('name');
    directory_entities = response.data
  } else {
    const response = await supabase.from('directory_entities').select('*').is('parent_id', null).order('name');
    directory_entities = response.data
  }

  const permissionMap = await getPermissions(supabase, directory_entities?.map((v) => v.id));

  const created_bys = [...new Set(directory_entities?.map((v) => v.created_by))];
  const { data: profiles } = await supabase.from('profiles').select('id,name').in('id', created_bys);
  const idToName = new Map(profiles.map((item) => [item.id, item.name]));

  const directories = directory_entities?.filter((v) => v.entity_type == 'directory');

  const exp_entities = directory_entities?.filter((v) => v.entity_type == 'experiment');
  const ids = exp_entities?.map((v) => v.id);
  const { data: experiments } = await supabase.from('experiments').select('*').in('directory_entity_id', ids).order('name');


  let idToRowData = new Map();

  for (const entity of directory_entities) {
    const row: DirectoryEntityRow = {
      id: entity.id,
      type: entity.entity_type,
      name: entity.name,
      created_by: idToName.get(entity.created_by),
      created_on: entity.created_at,
      permission: permissionMap.get(entity.id),
      experiment_id: '',
      platform: '',
      view_setting_id: '',
    }
    idToRowData.set(entity.id, row);
  }

  for (const exp of experiments) {
    let row = idToRowData.get(exp.directory_entity_id);
    row.experiment_id = exp.id;
    row.platform = exp.platform;
    row.view_setting_id = exp.view_setting_id;
  }

  const rowData = [...idToRowData.values()];


  const response = await supabase.from('view_settings').select('id,name,created_by,created_at,is_exported').eq('is_exported', true).order('name');
  const view_settings = response.data;
  let viewSettingData = [];
  for (const entity of view_settings) {
    const row: ViewSettingRow = {
      id: entity.id,
      name: entity.name,
      created_by: idToName.get(entity.created_by),
      created_on: entity.created_at,
    }
    viewSettingData.push(row);
  }


  return { 
    rowData: rowData,
    viewSettingsData: viewSettingData
    // directories: directories ?? [],
    // experiments: experiments ?? []
  };
}