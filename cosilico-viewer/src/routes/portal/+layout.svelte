<script lang="ts">
  import AppSidebar from "$lib/components/app-sidebar.svelte";
  import * as Breadcrumb from "$lib/components/ui/breadcrumb/index.js";
  import { Separator } from "$lib/components/ui/separator/index.js";
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  // import 
  // ./[directory]/$types.js

  let { data, children } = $props();
  let { supabase, user, profile, names, ids } = $derived(data);

</script>

<Sidebar.Provider>
  <AppSidebar {user} {profile}/>
  <Sidebar.Inset>
    <header
      class="group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear"
    >
      <div class="flex items-center gap-2 px-4">
        <Sidebar.Trigger class="-ml-1" />
        <Separator orientation="vertical" class="mr-2 data-[orientation=vertical]:h-4" />
        <Breadcrumb.Root>
           <Breadcrumb.List>
            <Breadcrumb.Item class="hidden md:block">
               <Breadcrumb.Link href="/portal/root" onclick={(event) => event.stopPropagation()}>/</Breadcrumb.Link>
            </Breadcrumb.Item>
            {#if names.length > 0}
              <Breadcrumb.Separator class="hidden md:block" />
            {/if}
            {#each names as name, i}
              {#if i < names.length - 1}
                <Breadcrumb.Item class="hidden md:block">
                  <Breadcrumb.Link href={`/portal/${ids[i]}`} onclick={(event) => event.stopPropagation()}>{name}</Breadcrumb.Link>
                </Breadcrumb.Item>
                <Breadcrumb.Separator class="hidden md:block" />
              {/if}
              {#if i == names.length - 1}
                <Breadcrumb.Item class="hidden md:block">
                  {name}
                </Breadcrumb.Item>
              {/if}
            {/each}
          </Breadcrumb.List>
        </Breadcrumb.Root>
      </div>
    </header>
    {@render children?.()}
  </Sidebar.Inset>
</Sidebar.Provider>