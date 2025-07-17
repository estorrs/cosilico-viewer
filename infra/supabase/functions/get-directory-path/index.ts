import "jsr:@supabase/functions-js/edge-runtime.d.ts"

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

Deno.serve(async (req) => {
  console.log('supabase url', SUPABASE_URL);
  const supabase = createClient(
    SUPABASE_URL!,
    SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
  );

  const { directory_entity_id } = await req.json();

    if (!directory_entity_id) {
      return new Response(
        JSON.stringify({ error: "Missing directory_entity_id" }),
        { status: 400 }
      );
    }

    const ids: string[] = [];
    const names: string[] = [];

    let currentId: string | null = directory_entity_id;

    while (currentId) {
      const { data, error } = await supabase
        .from("directory_entities")
        .select("id, name, parent_id")
        .eq("id", currentId)
        .maybeSingle();

      if (error) {
        console.error("Supabase error:", error);
        return new Response(
          JSON.stringify({ error: "Failed to fetch directory entity", detail: error.message }),
          { status: 500 }
        );
      }

      if (!data) break;

      // prepend to maintain root → leaf order
      ids.unshift(data.id);
      names.unshift(data.name);
      currentId = data.parent_id;
    }

    return new Response(
      JSON.stringify({ ids, names }),
      { headers: { "Content-Type": "application/json" } }
    );

})