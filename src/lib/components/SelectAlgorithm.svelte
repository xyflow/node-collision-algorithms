<script lang="ts">
	import * as Select from '$lib/components/ui/select';
	import { algorithms } from '@/algorithms';

	let { selectedAlgorithm = $bindable() }: { selectedAlgorithm: keyof typeof algorithms } =
		$props();
</script>

<Select.Root type="single" bind:value={selectedAlgorithm}>
	<Select.Trigger class="w-[150px] bg-background">
		{selectedAlgorithm}
	</Select.Trigger>
	<Select.Content>
		{#each Object.keys(algorithms) as dataset}
			<Select.Item value={dataset}>
				{dataset}
			</Select.Item>
		{/each}
	</Select.Content>
</Select.Root>
