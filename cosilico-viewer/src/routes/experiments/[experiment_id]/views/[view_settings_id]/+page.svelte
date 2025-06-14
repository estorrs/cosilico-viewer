<script>
  import ZarrTileViewer from "$lib/ZarrTileViewer.svelte";
  import { initZarr } from "$lib/openlayers/ZarrHelpers.js";
  import { onMount } from "svelte";

	// let { experiment, view_settings } = $props();
	let { data } = $props();
	let { experiment, view_settings } = $derived(data);

	$effect(() => {
		console.log(experiment);
		console.log(view_settings);

    // const getUrl = 'https://s3.us-east-1.amazonaws.com/cosilico-test/test.zarr.zip?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=AKIA5PAY7YA3JZM3JJZF%2F20250614%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20250614T151214Z&X-Amz-Expires=86400&X-Amz-Signature=0fb72ad18d340303b9bbccd4ddb7531a547d1ceecef821b0a60d99f838e0350d&X-Amz-SignedHeaders=host&x-id=GetObject';
    // const headUrl = 'https://s3.us-east-1.amazonaws.com/cosilico-test/test.zarr.zip?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=AKIA5PAY7YA3JZM3JJZF%2F20250614%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20250614T151214Z&X-Amz-Expires=86400&X-Amz-Signature=153b037c9b39ad2187ada05eaa9dbe4a261628f32128c2735202714289af6343&X-Amz-SignedHeaders=host';

    // let x = initZarr({ getUrl, headUrl });
    // // root = await initZarr({ getUrl, headUrl });
    // // let x = initZarr('https://s3.us-east-1.amazonaws.com/cosilico-test/test.zarr.zip?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=AKIA5PAY7YA3JZM3JJZF%2F20250613%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20250613T194007Z&X-Amz-Expires=86400&X-Amz-Signature=d7bd837f385d26fd3943e2aa0370261c5b66d10d83f28e0b8207b4e52b423417&X-Amz-SignedHeaders=host&x-id=GetObject');
    // console.log(x);

	});

  // onMount(async () => {
  //   const getUrl = 'https://s3.us-east-1.amazonaws.com/cosilico-test/test.zarr.zip?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=AKIA5PAY7YA3JZM3JJZF%2F20250614%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20250614T151214Z&X-Amz-Expires=86400&X-Amz-Signature=0fb72ad18d340303b9bbccd4ddb7531a547d1ceecef821b0a60d99f838e0350d&X-Amz-SignedHeaders=host&x-id=GetObject';
  //   const headUrl = 'https://s3.us-east-1.amazonaws.com/cosilico-test/test.zarr.zip?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=AKIA5PAY7YA3JZM3JJZF%2F20250614%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20250614T151214Z&X-Amz-Expires=86400&X-Amz-Signature=153b037c9b39ad2187ada05eaa9dbe4a261628f32128c2735202714289af6343&X-Amz-SignedHeaders=host';

  //   let x = await initZarr({ getUrl, headUrl });
  //   // root = await initZarr({ getUrl, headUrl });
  //   // let x = initZarr('https://s3.us-east-1.amazonaws.com/cosilico-test/test.zarr.zip?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=AKIA5PAY7YA3JZM3JJZF%2F20250613%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20250613T194007Z&X-Amz-Expires=86400&X-Amz-Signature=d7bd837f385d26fd3943e2aa0370261c5b66d10d83f28e0b8207b4e52b423417&X-Amz-SignedHeaders=host&x-id=GetObject');
  //   console.log('node', x);
  // })
</script>

{#if experiment}
 <div class='h-screen'>
  <ZarrTileViewer
    experimentObj={experiment}
    />
 </div>
{/if}


