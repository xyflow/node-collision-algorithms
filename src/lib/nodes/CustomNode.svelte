<script lang="ts">
	import { defaultSize } from '@/datasets';
	import { store } from '@/store';
	import { NodeResizer, type Node, type NodeProps } from '@xyflow/svelte';

	let { data, selected }: NodeProps<Node<{ label: string }>> = $props();
</script>

<NodeResizer isVisible={selected} minWidth={defaultSize} minHeight={defaultSize} />

<div
	class="flex h-full min-h-[50px] w-full min-w-[50px] items-center justify-center rounded-lg bg-card shadow-sm"
>
	<div>{store.layoutDirectly ? '👊' : '🤙'}</div>
</div>
