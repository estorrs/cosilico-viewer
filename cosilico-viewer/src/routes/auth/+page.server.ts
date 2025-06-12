import { redirect } from '@sveltejs/kit'
import { fail } from "@sveltejs/kit";
import { setError, superValidate, message } from "sveltekit-superforms";
import { formSchema } from './schema.js';
import { zod } from "sveltekit-superforms/adapters";

import type { Actions } from './$types'

// export const actions: Actions = {
//     default: async ({ request, locals: { supabase } }) => {
//         const form = await superValidate(request, zod(formSchema));
//         if (!form.valid) {
//           return fail(400, {
//             form,
//           });
//         }
        
//         const { data, error } = await supabase.auth.signInWithPassword({
//             email: form.data.email,
//             password: form.data.password,
//         })
    
//         if (error) {
//             return message(form, error.message);
//         }
    
//         throw redirect(303, '/private');
        
//         return {
//           form,
//         };
//       },
//     }
export const actions: Actions = {
  signup: async ({ request, locals: { supabase } }) => {
    const formData = await request.formData()
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    const { error } = await supabase.auth.signUp({ email, password })
    if (error) {
      console.error(error)
      redirect(303, '/auth/error')
    } else {
      redirect(303, '/')
    }
  },
  login: async ({ request, locals: { supabase } }) => {
    const formData = await request.formData()
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      console.error(error)
      redirect(303, '/auth/error')
    } else {
      redirect(303, '/private')
    }
  },
}