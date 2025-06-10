// // Follow this setup guide to integrate the Deno language server with your editor:
// // https://deno.land/manual/getting_started/setup_your_environment
// // This enables autocomplete, go to definition, etc.

// // Setup type definitions for built-in Supabase Runtime APIs
// import "jsr:@supabase/functions-js/edge-runtime.d.ts"

// console.log("Hello from Functions!")

// Deno.serve(async (req) => {
//   const { name } = await req.json()
//   const data = {
//     message: `Hello ${name}!`,
//   }

//   return new Response(
//     JSON.stringify(data),
//     { headers: { "Content-Type": "application/json" } },
//   )
// })

// /* To invoke locally:

//   1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
//   2. Make an HTTP request:

//   curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/generate-upload-url' \
//     --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
//     --header 'Content-Type: application/json' \
//     --data '{"name":"Functions"}'

// */


// import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
// import { createPresignedPost } from "https://deno.land/x/aws_s3_presigned_post@v0.3.0/mod.ts";
// import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// const AWS_REGION = Deno.env.get("AWS_REGION")!;
// const AWS_ACCESS_KEY_ID = Deno.env.get("AWS_ACCESS_KEY_ID")!;
// const AWS_SECRET_ACCESS_KEY = Deno.env.get("AWS_SECRET_ACCESS_KEY")!;
// const BUCKET_NAME = Deno.env.get("AWS_BUCKET_NAME")!;
// const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
// const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

// serve(async (req) => {
//   const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
//     global: { headers: { Authorization: req.headers.get("Authorization")! } },
//   });

//   const { data: { user } } = await supabaseClient.auth.getUser();
//   if (!user) {
//     return new Response("Unauthorized", { status: 401 });
//   }

//   const { fileName } = await req.json();
//   const key = `${fileName}`;

//   const presigned = await createPresignedPost({
//     accessKeyId: AWS_ACCESS_KEY_ID,
//     secretAccessKey: AWS_SECRET_ACCESS_KEY,
//     bucket: BUCKET_NAME,
//     key,
//     region: AWS_REGION,
//     expiresIn: 60 * 60, // 1 hour
//     conditions: [
//       ["starts-with", "$Content-Type", ""],
//       // ["content-length-range", 0, 10_000_000]
//     ],
//     fields: {
//       "Content-Type": 'application/zip',
//     }
//   });

//   return new Response(JSON.stringify({
//     url: presigned.url,
//     fields: presigned.fields,
//     key
//   }), {
//     headers: { "Content-Type": "application/json" }
//   });
// });




import { S3Client, PutObjectCommand } from 'https://esm.sh/@aws-sdk/client-s3';
import { getSignedUrl } from 'https://esm.sh/@aws-sdk/s3-request-presigner';

// const AWS_REGION = Deno.env.get("AWS_REGION")!;
// const AWS_ACCESS_KEY_ID = Deno.env.get("AWS_ACCESS_KEY_ID")!;
// const AWS_SECRET_ACCESS_KEY = Deno.env.get("AWS_SECRET_ACCESS_KEY")!;
// const BUCKET_NAME = Deno.env.get("AWS_BUCKET_NAME")!;
// const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
// const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const STORAGE_ACCESS_KEY_ID = "DO8019AHP777T2ZNMG6Q"
const STORAGE_SECRET_ACCESS_KEY = "VUO40UldmKJdWm7SnXtU+Dqwy6ZCTDCc7idMjMLqj/M"
const STORAGE_ENDPOINT_URL = "https://test-experiments-1.nyc3.digitaloceanspaces.com"
const STORAGE_REGION_NAME = "nyc3"
const STORAGE_BUCKET_NAME = "test-experiments-1"

const s3 = new S3Client({
  endpoint: "https://nyc3.digitaloceanspaces.com", // or your region
  forcePathStyle: true, // important for DO Spaces
  credentials: {
    accessKeyId: Deno.env.get("DO_SPACES_KEY")!,
    secretAccessKey: Deno.env.get("DO_SPACES_SECRET")!,
  },
});

Deno.serve(async (req) => {
  const { filename } = await req.json();

  const command = new PutObjectCommand({
    Bucket: "your-space-name",
    Key: `uploads/${filename}`,
    ContentType: "application/zip",
  });

  const url = await getSignedUrl(s3, command, {
    expiresIn: 60 * 10, // 10 minutes
  });

  return new Response(
    JSON.stringify({ url }),
    { headers: { "Content-Type": "application/json" } }
  );
});
