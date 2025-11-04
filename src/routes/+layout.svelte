<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { SvelteFlowProvider } from '@xyflow/svelte';
	import { onMount } from 'svelte';
	import { initNaiveWasm } from '@/algorithms/naiveWasm';

	let { children } = $props();

	// Initialize WASM only in the browser (not during SSR)
	onMount(() => {
		initNaiveWasm().catch(console.error);
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<SvelteFlowProvider>
	{@render children()}
</SvelteFlowProvider>
