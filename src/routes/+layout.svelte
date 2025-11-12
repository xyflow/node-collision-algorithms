<script lang="ts">
	import '@xyflow/svelte/dist/style.css';
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { SvelteFlowProvider } from '@xyflow/svelte';
	import { onMount } from 'svelte';
	import { initWasm } from '@/algorithms';

	let { children } = $props();

	onMount(() => {
		initWasm();
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<SvelteFlowProvider>
	{@render children()}
</SvelteFlowProvider>
