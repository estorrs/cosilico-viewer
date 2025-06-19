// import type { PageServerLoad } from '../$types.js'
// import { PageServerLoad } from './$types.js';
import type { PageServerLoad } from "./$types.js";
import type { DirectoryEntityRow } from "$lib/directories/columns.js";

export const load: PageServerLoad = async ({ params, depends, locals: { supabase, user } }) => {
  depends('supabase:db:re')
  // const { data: notes } = await supabase.from('notes').select('id,note').order('id')
  let directory_entities;
  if (params.directory != 'root') {
    const response = await supabase.from('directory_entities').select('*').eq('parent_id', params.directory).order('name');
    directory_entities = response.data
  } else {
    const response = await supabase.from('directory_entities').select('*').is('parent_id', null).order('name');
    directory_entities = response.data
  }

  const directories = directory_entities?.filter((v) => v.entity_type == 'directory');

  const exp_entities = directory_entities?.filter((v) => v.entity_type == 'experiment');
  const ids = exp_entities?.map((v) => v.id);
  const { data: experiments } = await supabase.from('experiments').select('id,name,platform,platform_version,experiment_date,directory_entity_id').in('directory_entity_id', ids).order('name');


  let idToRowData = new Map();

  for (const entity of directory_entities) {
    const row: DirectoryEntityRow = {
      id: entity.id,
      // parent_id: entity.parent_id,
      type: entity.entity_type,
      name: entity.name,
      created_by: entity.created_by,
      created_on: entity.created_at,
      permission: 'Read',
      // platform: '',
      // experiment_date: ''
    }
    idToRowData.set(entity.id, row);
  }

  for (const exp of experiments) {
    // let row = idToRowData.get(exp.directory_entity_id);
    // row.platform = exp.platform;
    // row.experiment_date = exp.experiment_date;
  }

  const rowData = [...idToRowData.values()];

  console.log('row data', rowData);


  // type DirectoryEntityRow = {
  //   id: string;
  //   parent_id: string;
  //   type: string;
  //   name: string;
  //   created_by: string;
  //   created_on: string;
  //   permission: 'Read | Write | Delete';
  //   platform: string;
  //   experiment_date: string;
  // };



  return { 
    rowData: rowData
    // directories: directories ?? [],
    // experiments: experiments ?? []
  };
}