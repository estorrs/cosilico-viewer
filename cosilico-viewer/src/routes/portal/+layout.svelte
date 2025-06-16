<script>
  // import AppSidebar from "$lib/components/app-sidebar.svelte";
  // import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  
  let { data, children } = $props()
  let { supabase } = $derived(data)

  const logout = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error(error)
    }
  }
</script>

<header>
  <nav>
    <a href="/">Home</a>
  </nav>
  <button onclick={logout}>Logout</button>
</header>
<main>
  {@render children()}
</main>

<!-- 
<Sidebar.Provider>
  <AppSidebar />
  <main>
    <Sidebar.Trigger />
    {@render children?.()}
  </main>
</Sidebar.Provider>
 -->
