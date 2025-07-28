// import adapter from '@sveltejs/adapter-auto';

// import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

// /** @type {import('@sveltejs/kit').Config} */
// const config = {
// 	// Consult https://svelte.dev/docs/kit/integrations
// 	// for more information about preprocessors
// 	preprocess: vitePreprocess(),

// 	kit: {
// 		// adapter-auto only supports some environments, see https://svelte.dev/docs/kit/adapter-auto for a list.
// 		// If your environment is not supported, or you settled on a specific environment, switch out the adapter.
// 		// See https://svelte.dev/docs/kit/adapters for more information about adapters.
// 		adapter: adapter()
// 	}
// };

// export default config;


import adapter from '@sveltejs/adapter-netlify';

export default {
	kit: {
		// default options are shown
		adapter: adapter({
			// if true, will create a Netlify Edge Function rather
			// than using standard Node-based functions
			edge: false,

			// if true, will split your app into multiple functions
			// instead of creating a single one for the entire app.
			// if `edge` is true, this option cannot be used
			split: false
		})
	}
};



// import adapter from '@sveltejs/adapter-cloudflare';

// export default {
// 	kit: {
// 		adapter: adapter({
// 			// See below for an explanation of these options
// 			config: undefined,
// 			platformProxy: {
// 				configPath: undefined,
// 				environment: undefined,
// 				persist: undefined
// 			},
// 			fallback: 'plaintext',
// 			routes: {
// 				include: ['/*'],
// 				exclude: ['<all>']
// 			}
// 		})
// 	}
// };

// import adapter from '@sveltejs/adapter-vercel';

// export default {
// 	kit: {
// 		adapter: adapter({
// 			// see below for options that can be set here
// 		})
// 	}
// };