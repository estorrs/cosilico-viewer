import { supabase } from "$lib/server/supabase/supabaseClient";
 
export const load = async () => {
 const { data, error } = await supabase.from('profiles').select('*')

 return {
  profiles: data
 };
};
