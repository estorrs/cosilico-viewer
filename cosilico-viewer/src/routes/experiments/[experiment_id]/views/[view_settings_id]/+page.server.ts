import { supabase } from "$lib/server/supabase/supabaseClient";
 
export const load = async () => {
 const { data, error } = await supabase.from('profiles').select('*')

 console.log('returning', {profiles: data});

 return {
  profiles: data
 };
};
