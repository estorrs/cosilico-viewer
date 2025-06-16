import type { PageServerLoad } from './$types.js'

export const load: PageServerLoad = async ({ depends, locals: { supabase } }) => {
  depends('supabase:db:notes')
  const { data: notes } = await supabase.from('notes').select('id,note').order('id')
  return { notes: notes ?? [] } 
}