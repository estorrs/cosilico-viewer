import type { PageServerLoad } from './$types.js'

export const load: PageServerLoad = async ({ depends, locals: { supabase, user } }) => {
  depends('supabase:db:re')
  // const { data: notes } = await supabase.from('notes').select('id,note').order('id')
  const { data: directory_entities } = await supabase.from('directory_entities').select('*').order('id');

  return { 
    directory_entities: directory_entities ?? []
  };
}