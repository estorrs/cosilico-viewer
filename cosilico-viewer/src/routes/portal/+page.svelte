<script lang="ts">
  import { invalidate } from '$app/navigation'
  import type { EventHandler } from 'svelte/elements'

  import type { PageData } from './$types.js'

  let { data } = $props()
  let { directory_entities, profile, supabase, user } = $derived(data)

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
</script>

<h1>Directories user: {user?.email}</h1>
<h2>Directories</h2>
<ul>
  {#each directory_entities as entity}
    <li>{entity.name}</li>
  {/each}
</ul>
<!-- <form onsubmit={handleSubmit}>
  <label>
    Add a note
    <input name="note" type="text" />
  </label>
</form> -->


