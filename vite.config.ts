import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	server: {
		fs: {
			allow: ['..'] // Allow access to files outside of src (for wasm/pkg)
		}
	},
	build: {
		sourcemap: true
	},
	optimizeDeps: {
		exclude: ['wasm'] // Don't pre-bundle WASM
	},
	assetsInclude: ['**/*.wasm'], // Ensure WASM files are served correctly
	test: {
		expect: { requireAssertions: true },
		benchmark: {
			outputJson: './bench-results.json'
		},
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	},
	base: 'https://node-collision-algorithms.vercel.app/'
});
