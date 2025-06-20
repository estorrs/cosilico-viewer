// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

// supabase/functions/get_directory_permissions.ts
// import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

Deno.serve(async (req) => {
  const supabase = createClient(
    SUPABASE_URL!,
    SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
  );

  const { directory_ids } = await req.json();

  if (!Array.isArray(directory_ids)) {
    return new Response(
      JSON.stringify({ error: 'Missing or invalid directory_ids' }),
      { status: 400 }
    );
  }

  const permissions = await Promise.all(
    directory_ids.map(async (dir_id: string) => {
      const checks = await Promise.all([
        supabase.rpc('has_directory_access', { start_id: dir_id, access_type: 'read' }),
        supabase.rpc('has_directory_access', { start_id: dir_id, access_type: 'write' }),
        supabase.rpc('has_directory_access', { start_id: dir_id, access_type: 'delete' }),
      ]);

      if (checks.some(c => c.error)) {
        console.error(`Access check failed for ${dir_id}`, checks.map(c => c.error));
        return { id: dir_id, permission: '' };
      }

      const [read, write, del] = checks.map(c => c.data as boolean);
      let perm = '';
      if (read) perm += 'r';
      if (write) perm += 'w';
      if (del) perm += 'd';

      return { id: dir_id, permission: perm };
    })
  );

  return new Response(JSON.stringify(permissions), {
    headers: { 'Content-Type': 'application/json' }
  });
});
