

export async function getDirectoryPath(supabase, directory_entity_id) {
    const { data, error } = await supabase.functions.invoke('get-directory-path', {
        body: { directory_entity_id: directory_entity_id }
    })

    return data;
}