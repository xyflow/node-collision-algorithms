<script lang="ts">
	import { useNodes, useSvelteFlow } from '@xyflow/svelte';
	import * as Select from '$lib/components/ui/select';
	import { datasets, getNodesFromDataset, type SelectOptions } from '$lib/datasets';

	let { selectedDataset = $bindable() }: { selectedDataset: SelectOptions } = $props();
</script>

<Select.Root type="single" bind:value={selectedDataset}>
	<Select.Trigger class="w-[200px] bg-background">
		{selectedDataset}
	</Select.Trigger>
	<Select.Content>
		<Select.Item value="Introduction">Introduction</Select.Item>
		{#each Object.keys(datasets) as dataset}
			<Select.Item value={dataset}>
				<div class="flex w-full items-center justify-between">
					{dataset}
					<span class="font-mono text-[0.7em] text-muted-foreground"
						>{datasets[dataset as keyof typeof datasets].length}n</span
					>
				</div>
			</Select.Item>
		{/each}
		{#if import.meta.env.DEV}
			<Select.Item value="Create New">Create New</Select.Item>
		{/if}
	</Select.Content>
</Select.Root>
