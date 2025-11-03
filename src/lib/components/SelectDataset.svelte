<script lang="ts">
	import { useNodes, useSvelteFlow } from '@xyflow/svelte';
	import * as Select from '$lib/components/ui/select';
	import { datasets, getNodesFromDataset } from '$lib/datasets';

	let { selectedDataset = $bindable() }: { selectedDataset: keyof typeof datasets | 'Create New' } =
		$props();

	const { fitView } = useSvelteFlow();

	const nodes = useNodes();
</script>

<Select.Root
	type="single"
	bind:value={selectedDataset}
	onValueChange={(value) => {
		if (value === 'Create New') {
			nodes.set([]);
		} else {
			nodes.set([...getNodesFromDataset(value as keyof typeof datasets)]);
			fitView();
		}
	}}
>
	<Select.Trigger class="w-[240px] bg-background">
		{selectedDataset}
	</Select.Trigger>
	<Select.Content>
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
		<Select.Item value="Create New">Create New</Select.Item>
	</Select.Content>
</Select.Root>
