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
      if (error.message.toLowerCase().includes('email')) {
        return setError(form, 'email', error.message);
      } else {
        return setError(form, 'password', error.message);
      }
    }
    return {
      form,
    };
  },
};
// const { data, error } = await supabase.auth.admin.createUser({
//   email: 'test@example.com',
//   password: 'testpassword',
//   email_confirm: true,
// })

// export async function load() {
//   const { data, error } = await supabase.from('profiles').select('*')
//   return { profiles: data }
// }

// export const actions = {
// 	create: async ({ cookies, request }) => {
// 		const data = await request.formData();

//         // can do error checking
//         // return fail(422, {
//         //     description: data.get('description'),
//         //     error: error.message
//         // });

// 		db.createTodo(cookies.get('userid'), data.get('description'));
// 	},

// 	delete: async ({ cookies, request }) => {
// 		const data = await request.formData();
// 		db.deleteTodo(cookies.get('userid'), data.get('id'));
// 	}
// };
