<script>
//   export let data;
  export let params; // if you're using client-side navigation and need access

  // For RSC / Svelte 5, `data` will contain the results of your load function (if defined)
</script>

<h1>Experiment: {params.experiment_id}</h1>
<h2>View Settings: {params.view_settings_id}</h2>
