import type { LayoutServerLoad } from "../$types.js";
import { getDirectoryPath } from "$lib/server/supabase/structure.js";

export const load: LayoutServerLoad = async ({ params, depends, locals: { supabase, user } }) => {
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