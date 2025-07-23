import { error } from "@sveltejs/kit";

export async function populateExperiment(experiment, view_settings, supabase) {
    const { data: images, error: e } = await supabase
        .from('images')
        .select('*')
        .in('id', experiment.image_ids);
    

    for (const image of images) {
        const { data, error } = await supabase.functions.invoke('generate-download-url', {
            body: { filename: image.path }
        })
        image.path = data.getUrl;
        image.path_presigned_head = data.headUrl;

        const view = view_settings?.settings?.image_views?.[image.id] ?? {};

        image.view_settings = view;
    }

    let experiment_layers = [];
    if (experiment.layer_ids.length > 0) {
        let { data: layers, error: e } = await supabase
            .from('layers')
            .select('*')
            .in('id', experiment.layer_ids);
        
        for (const layer of layers) {
            const { data, error } = await supabase.functions.invoke('generate-download-url', {
                body: { filename: layer.path }
            })
            layer.path = data.getUrl;
            layer.path_presigned_head = data.headUrl;

            const view = view_settings?.settings?.layer_views?.[layer.id] ?? {};
            layer.view_settings = view;
        }

        experiment_layers = [...layers];
    } else {
        experiment_layers = [];
    }

    for (let layer of experiment_layers) {
        const { data: layer_metadatas, error: e } = await supabase
            .from('layer_metadata')
            .select('*')
            .eq('layer_id', layer.id);
        
        for (const lm of layer_metadatas) {
            const { data, error } = await supabase.functions.invoke('generate-download-url', {
                body: { filename: lm.path }
            })
            lm.path = data.getUrl;
            lm.path_presigned_head = data.headUrl;

            const view = view_settings?.settings?.layer_metadata_views?.[lm.id] ?? {};
            lm.view_settings = view;
        }

        layer.layer_metadatas = layer_metadatas ?? [];
    }

    experiment.images = images;
    experiment.layers = experiment_layers;

    experiment.view_settings = view_settings
    
    return experiment;
}