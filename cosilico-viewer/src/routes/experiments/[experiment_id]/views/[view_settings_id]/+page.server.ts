import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types.js'

import { populateExperiment } from '$lib/server/supabase/experiment.js';

export const load: PageServerLoad = async ({ depends, params, locals: { supabase } }) => {
  const { experiment_id, view_settings_id } = params;

  depends('supabase:db:directory_entities')
  depends('supabase:db:experiments')
//   const { data: directory_entities } = await supabase.from('directory_entities').select('*');
  let { data: experiment, error: e } = await supabase
    .from('experiments')
    .select('*')
    .eq('id', experiment_id)
    .single();

  if (e || !experiment) {
    throw error(404, `Experiment ${experiment_id} not found.`);
  }

  let { data: view_settings, error: e } = await supabase
    .from('view_settings')
    .select('*')
    .eq('id', view_settings_id)
    .single();

  if (e || !view_settings) {
    throw error(404, `View setting ${view_settings_id} not found.`);
  }

  // fetch image/layers
  experiment = await populateExperiment(experiment, view_settings, supabase);

  return { experiment: experiment }
}