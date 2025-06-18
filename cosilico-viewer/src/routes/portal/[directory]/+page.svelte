<script lang="ts">
  import { invalidate } from '$app/navigation'
  import type { EventHandler } from 'svelte/elements'
  import DirectoryTable from '$lib/directories/directory-table.svelte'
  import { columns } from '$lib/directories/columns.js'

  // import type {PageData }
  // import type { PageData } from '../$types.js'

  let { data } = $props()
  let { directories, experiments, profile, supabase, user } = $derived(data)

  // const handleSubmit: EventHandler<SubmitEvent, HTMLFormElement> = async (evt) => {
  //   evt.preventDefault()
  //   if (!evt.target) return
  //   const form = evt.target as HTMLFormElement
  //   const note = (new FormData(form).get('note') ?? '') as string
  //   if (!note) return
  //   const { error } = await supabase.from('notes').insert({ note })
  //   if (error) console.error(error)
  //   invalidate('supabase:db:notes')
  //   form.reset()
  // }

  $effect(() => {
    console.log('directories', directories);
    console.log('experiments', experiments);
  })

</script>


<DirectoryTable  />

<!-- <form onsubmit={handleSubmit}>
  <label>
    Add a note
    <input name="note" type="text" />
  </label>
</form> -->
