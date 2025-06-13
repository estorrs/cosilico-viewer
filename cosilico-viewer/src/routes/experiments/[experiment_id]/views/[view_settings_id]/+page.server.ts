import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types'

import { populateExperiment } from '$lib/server/supabase/experiment';

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

  // fetch image/layers
  experiment = await populateExperiment(experiment, supabase);

  let view_settings = {};

  console.log('experiment', experiment);

  return { experiment: experiment, view_settings: view_settings }
}