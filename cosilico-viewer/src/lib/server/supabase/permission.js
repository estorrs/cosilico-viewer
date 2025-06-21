

export async function getPermissions(supabase, directory_entity_ids) {
    const { data, error } = await supabase.functions.invoke('get-directory-permissions', {
        body: { directory_ids: directory_entity_ids }
    })

    let permissionMap = new Map();
    for (const entry of data) {
        permissionMap.set(entry.id, entry.permission);
    }
    return permissionMap;
}