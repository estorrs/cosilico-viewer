import { redirect } from '@sveltejs/kit'
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
//   default: async (event) => {
  default: async ({ request, locals: { supabase } }) => {
    const form = await superValidate(request, zod(formSchema));
    if (!form.valid) {
      return fail(400, {
        form,
      });
    }    
    const { data, error } = await supabase.auth.signInWithPassword({
        email: form.data.email,
        password: form.data.password,
    })

    if (error) {
        return message(form, error.message);
    }

    throw redirect(303, '/portal/root');
    
    return {
      form,
    };
  },
};