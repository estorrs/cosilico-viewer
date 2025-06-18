// import type { PageServerLoad } from '../$types.js'
// import { PageServerLoad } from './$types.js';
import type { PageServerLoad } from "./$types.js";

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
  console.log('exp entities', exp_entities);
  const ids = exp_entities?.map((v) => v.id);
  console.log('exp ids', ids);
  const { data: experiments } = await supabase.from('experiments').select('id,name,platform,platform_version,experiment_date').in('directory_entity_id', ids).order('name');
  console.log('experiments', experiments);

  return { 
    directories: directories ?? [],
    experiments: experiments ?? []
  };
}