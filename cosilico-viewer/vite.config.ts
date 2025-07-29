import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	build:{
		minify:'terser',
		terserOptions:{
			keep_fnames:true,
			mangle:{
				keep_fnames:true,
				reserved:[
					'minMaxRangePixelTransform',
					'applyPseudocolorToPixel'
				]
			}
		}
	}
});
