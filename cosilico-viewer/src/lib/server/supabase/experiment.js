import { error } from "@sveltejs/kit";



export async function populateExperiment(experiment, supabase) {
    const { data: images, error: e } = await supabase
        .from('images')
        .select('*')
        .in('id', experiment.image_ids);

    for (const image of images) {
        const { data, error } = await supabase.functions.invoke('generate-download-url', {
            body: { filename: image.path }
        })
        image.path = data.url;
        console.log(data.url);
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
            layer.path = data.url;
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
            lm.path = data.url;
        }

        layer.layer_metadatas = layer_metadatas ?? [];
    }

    experiment.images = images;
    experiment.layers = experiment_layers;
    
    return experiment;
}