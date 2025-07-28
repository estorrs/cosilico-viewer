import type { LayoutServerLoad } from "../$types.js";
import { getDirectoryPath } from "$lib/server/supabase/structure.js";
import { redirect } from "@sveltejs/kit";

export const load: LayoutServerLoad = async ({ params, depends, locals: { supabase, user } }) => {
    // this is for demo
    if (params.directory?.includes('demo_directory')) {
        redirect(303, '/portal/root')
    } else if (params.directory?.includes('demo')) {
        redirect(303, '/experiments/429ed69f-28e9-4663-8e71-222a7fbc7533/views/c2fd6ee5-940e-407b-90a1-2cf98b9df89b')
    }

    let names;
    let ids;
    if (params.directory != 'root') {
        const data = await getDirectoryPath(supabase, params.directory);
        names = data.names;
        ids = data.ids;
    } else {
        names = [];
        ids = [];
    }

	return {
		'names': names,
        'ids': ids
	};
};