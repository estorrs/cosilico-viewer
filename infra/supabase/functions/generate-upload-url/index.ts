
// import { PutObjectCommand, S3Client } from 'npm:@aws-sdk/client-s3@3.264.0';
// import { getSignedUrl } from 'npm:@aws-sdk/s3-request-presigner@3.264.0';

// const STORAGE_ACCESS_KEY_ID = Deno.env.get("STORAGE_ACCESS_KEY_ID")!;
// const STORAGE_SECRET_ACCESS_KEY = Deno.env.get("STORAGE_SECRET_ACCESS_KEY")!;
// const STORAGE_ENDPOINT_URL = Deno.env.get("STORAGE_ENDPOINT_URL")!;
// const STORAGE_REGION_NAME = Deno.env.get("STORAGE_REGION_NAME")!;
// const STORAGE_BUCKET_NAME = Deno.env.get("STORAGE_BUCKET_NAME")!;

// const s3 = new S3Client({
//   endpoint: STORAGE_ENDPOINT_URL,
//   forcePathStyle: true,
//   region: STORAGE_REGION_NAME,
//   credentials: {
//     accessKeyId: STORAGE_ACCESS_KEY_ID,
//     secretAccessKey: STORAGE_SECRET_ACCESS_KEY,
//   },
// });

// Deno.serve(async (req) => {
//   const { filename } = await req.json();

//   const command = new PutObjectCommand({
//     Bucket: STORAGE_BUCKET_NAME,
//     Key: filename,
//     ContentType: "application/zip",
//   });

//   const url = await getSignedUrl(s3, command, {
//     expiresIn: 60 * 10, // 10 minutes
//   });

//   return new Response(
//     JSON.stringify({ url }),
//     { headers: { "Content-Type": "application/json" } }
//   );
// });



// // index.ts
// import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
// import { S3Client, PutObjectCommand, GetObjectCommand } from "npm:@aws-sdk/client-s3@3.264.0";
// import { getSignedUrl } from "npm:@aws-sdk/s3-request-presigner@3.264.0";

// // Constants from env
// const STORAGE_BUCKET_NAME = Deno.env.get("STORAGE_BUCKET_NAME")!;
// const STORAGE_ENDPOINT_URL = Deno.env.get("STORAGE_ENDPOINT_URL")!;
// const STORAGE_REGION_NAME = Deno.env.get("STORAGE_REGION_NAME") ?? "us-east-1";
// const STORAGE_ACCESS_KEY_ID = Deno.env.get("STORAGE_ACCESS_KEY_ID")!;
// const STORAGE_SECRET_ACCESS_KEY = Deno.env.get("STORAGE_SECRET_ACCESS_KEY")!;

// // S3 client setup
// const s3 = new S3Client({
//   endpoint: STORAGE_ENDPOINT_URL,
//   forcePathStyle: true,
//   region: STORAGE_REGION_NAME,
//   credentials: {
//     accessKeyId: STORAGE_ACCESS_KEY_ID,
//     secretAccessKey: STORAGE_SECRET_ACCESS_KEY,
//   },
// });

// // Main request router
// serve(async (req: Request) => {
//   const url = new URL(req.url);

//   if (req.method === "POST" && url.pathname === "/generate-upload-url") {
//     const { filename } = await req.json();

//     if (!filename) {
//       return new Response(JSON.stringify({ error: "Missing filename" }), {
//         status: 400,
//       });
//     }

//     const command = new PutObjectCommand({
//       Bucket: STORAGE_BUCKET_NAME,
//       Key: filename,
//       ContentType: "application/zip",
//     });

//     const signedUrl = await getSignedUrl(s3, command, { expiresIn: 60 * 10 });

//     return new Response(JSON.stringify({ url: signedUrl }), {
//       headers: { "Content-Type": "application/json" },
//     });
//   }

//   if (req.method === "POST" && url.pathname === "/generate-download-url") {
//     const { filename } = await req.json();

//     if (!filename) {
//       return new Response(JSON.stringify({ error: "Missing filename" }), {
//         status: 400,
//       });
//     }

//     const command = new GetObjectCommand({
//       Bucket: STORAGE_BUCKET_NAME,
//       Key: filename,
//     });

//     const signedUrl = await getSignedUrl(s3, command, { expiresIn: 60 * 10 });

//     return new Response(JSON.stringify({ url: signedUrl }), {
//       headers: { "Content-Type": "application/json" },
//     });
//   }

//   return new Response("Not found", { status: 404 });
// });

// import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { PutObjectCommand, S3Client } from 'npm:@aws-sdk/client-s3@3.264.0';
import { getSignedUrl } from 'npm:@aws-sdk/s3-request-presigner@3.264.0';

const STORAGE_BUCKET_NAME = Deno.env.get("STORAGE_BUCKET_NAME")!;
const STORAGE_ENDPOINT_URL = Deno.env.get("STORAGE_ENDPOINT_URL")!;
const STORAGE_REGION_NAME = Deno.env.get("STORAGE_REGION_NAME")!;
const STORAGE_ACCESS_KEY_ID = Deno.env.get("STORAGE_ACCESS_KEY_ID")!;
const STORAGE_SECRET_ACCESS_KEY = Deno.env.get("STORAGE_SECRET_ACCESS_KEY")!;

const s3 = new S3Client({
  endpoint: STORAGE_ENDPOINT_URL,
  forcePathStyle: true,
  region: STORAGE_REGION_NAME,
  credentials: {
    accessKeyId: STORAGE_ACCESS_KEY_ID,
    secretAccessKey: STORAGE_SECRET_ACCESS_KEY,
  },
});

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const { filename } = await req.json();

  if (!filename) {
    return new Response(JSON.stringify({ error: "Missing filename" }), {
      status: 400,
    });
  }

  const command = new PutObjectCommand({
    Bucket: STORAGE_BUCKET_NAME,
    Key: filename,
    ContentType: "application/zip",
  });

  const signedUrl = await getSignedUrl(s3, command, { expiresIn: 60 * 10 });

  return new Response(JSON.stringify({ url: signedUrl }), {
    headers: { "Content-Type": "application/json" },
  });
});
