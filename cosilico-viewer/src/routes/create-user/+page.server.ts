import { supabase } from "$lib/server/supabase/supabaseClient";
import type { PageServerLoad, Actions } from "./$types.js";
import { fail } from "@sveltejs/kit";
import { setError, superValidate, message } from "sveltekit-superforms";
import { formSchema } from "./schema.js";
import { zod } from "sveltekit-superforms/adapters";
 
export const load = async () => {

 return {
  form: await superValidate(zod(formSchema)),
 };
};

export const actions: Actions = {
  default: async (event) => {
    const form = await superValidate(event, zod(formSchema));
    if (!form.valid) {
      return fail(400, {
        form,
      });
    }
    
    const { data, error } = await supabase.auth.signUp({
      email: form.data.email,
      password: form.data.password,
      options: {
        data: {
          display_name: form.data.name
        }
      }
    })

    if (error) {
        return message(form, error.message);
    }

    // if (error) {
    //   if (error.message.toLowerCase().includes('email')) {
    //     return setError(form, 'email', error.message);
    //   } else {
    //     return setError(form, 'password', error.message);
    //   }
    // }
    return {
      form,
    };
  },
};
