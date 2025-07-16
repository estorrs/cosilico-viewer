import "jsr:@supabase/functions-js/edge-runtime.d.ts"

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

Deno.serve(async (req) => {
  const supabase = createClient(
    SUPABASE_URL!,
    SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
  );

  const { directory_entity_id } = await req.json();

  if (!directory_entity_id || typeof directory_entity_id !== "string") {
    return new Response(
      JSON.stringify({ error: "Missing or invalid directory_entity_id" }),
      { status: 400 }
    );
  }

  const { data, error } = await supabase.rpc("get_directory_path", {
    dir_uuid: directory_entity_id,
  });

  if (error) {
    console.error("RPC error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to get directory path", detail: error.message }),
      { status: 500 }
    );
  }

  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" },
  });

})