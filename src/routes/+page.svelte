<script lang="ts">
	import {
		Background,
		Panel,
		SvelteFlow,
		useSvelteFlow,
		type Edge,
		type Node
	} from '@xyflow/svelte';

	import '@xyflow/svelte/dist/style.css';

	import { getNodesFromDataset, datasets, type SelectOptions, initialDataset } from '@/datasets';
	import { getRandomEmoji } from '@/emojis';
	import useCollisionLayout from '@/hooks/useCollisionLayout.svelte';

	import { Button } from '@/components/ui/button';
	import SelectDataset from '@/components/SelectDataset.svelte';

	import CopyIcon from '@/icons/CopyIcon.svelte';
	import EditIcon from '@/icons/EditIcon.svelte';
	import SortIcon from '@/icons/SortIcon.svelte';

	import CustomNode from '@/nodes/CustomNode.svelte';
	import { algorithms } from '@/algorithms';
	import SelectAlgorithm from '@/components/SelectAlgorithm.svelte';
	import ReloadIcon from '@/icons/ReloadIcon.svelte';
	import LightningBoltIcon from '@/icons/LightningBoltIcon.svelte';

	const { resolveCollisions } = useCollisionLayout({ margin: 10 });

	const { screenToFlowPosition } = useSvelteFlow();

	let selectedDataset = $state.raw<SelectOptions>(initialDataset);
	let selectedAlgorithm = $state<keyof typeof algorithms>('naive');
	let algorithm = $derived(algorithms[selectedAlgorithm]);
	let layoutDirectly = $state(false);

	let measurements = $state<{ numIterations: number; time: number } | undefined>(undefined);

	const selectedData = $derived(
		selectedDataset === 'Create New'
			? []
			: [...getNodesFromDataset(selectedDataset as keyof typeof datasets)]
	);

	$effect(() => {
		algorithm;
		selectedData;
		setTimeout(() => {
			measurements = resolveCollisions({ dryRun: true, algorithm, nodes: selectedData });
		}, 50);
	});

	$effect(() => {
		if (layoutDirectly) {
			resolveCollisions({ algorithm, nodes: selectedData, iterations: Infinity });
		} else {
			if (selectedDataset !== 'Create New') {
				nodes = [...selectedData];
			}
		}
	});

	let nodes = $state.raw<Node[]>([...getNodesFromDataset(initialDataset)]);

	let edges = $state.raw<Edge[]>([]);

	const nodeTypes = {
		custom: CustomNode
	};

	// Copy-paste state
	let copiedNodes = $state<Node[]>([]);

	// Get selected nodes
	const selectedNodes = $derived(nodes.filter((node) => node.selected));

	// Copy selected nodes
	function copySelectedNodes() {
		if (selectedNodes.length === 0) return;
		copiedNodes = selectedNodes.map((node) => ({ ...node }));
	}

	// Paste copied nodes
	function pasteNodes() {
		if (copiedNodes.length === 0) return;

		// Calculate offset based on first copied node's position
		const offsetX = 50;
		const offsetY = 50;

		// Create new nodes with new IDs and offset positions
		const newNodes = copiedNodes.map((node) => ({
			...node,
			id: crypto.randomUUID(),
			selected: true, // Select the newly pasted nodes
			position: {
				x: node.position.x + offsetX,
				y: node.position.y + offsetY
			}
		}));

		// Deselect all existing nodes first
		const updatedNodes = nodes.map((node) => ({ ...node, selected: false }));

		// Add new nodes to the existing nodes array
		nodes = [...updatedNodes, ...newNodes];
	}

	// Handle keyboard shortcuts
	function handleKeyDown(event: KeyboardEvent) {
		const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
		const modKey = isMac ? event.metaKey : event.ctrlKey;

		// Check if we're in a text input or textarea to avoid interfering with normal text copy/paste
		const target = event.target as HTMLElement;
		if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
			return;
		}

		if (modKey && event.key === 'c') {
			// Get current selected nodes at the time of the event
			const currentlySelected = nodes.filter((node) => node.selected);
			if (currentlySelected.length > 0) {
				event.preventDefault();
				copiedNodes = currentlySelected.map((node) => ({ ...node }));
			}
		} else if (modKey && event.key === 'v' && copiedNodes.length > 0) {
			event.preventDefault();
			pasteNodes();
		}
	}

	// Set up global keyboard listener
	$effect(() => {
		window.addEventListener('keydown', handleKeyDown);
		return () => {
			window.removeEventListener('keydown', handleKeyDown);
		};
	});
</script>

<div class="h-screen w-full">
	<SvelteFlow
		bind:nodes
		bind:edges
		fitView
		paneClickDistance={1}
		selectionOnDrag={false}
		proOptions={{
			hideAttribution: true
		}}
		{nodeTypes}
		onnodedragstop={() => {
			if (selectedDataset !== 'Create New') {
				resolveCollisions({ algorithm });
			}
		}}
		onpaneclick={({ event }) => {
			if (selectedDataset === 'Create New') {
				const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
				nodes = [
					...nodes,
					{
						id: crypto.randomUUID(),
						type: 'custom',
						position: {
							x: position.x - 25,
							y: position.y - 25
						},
						data: {
							label: getRandomEmoji()
						}
					}
				];
			}
		}}
	>
		<Panel position="bottom-right" class="flex gap-2">
			{#if selectedDataset !== 'Create New'}
				<Button
					variant="ghost"
					class="mt-5"
					onclick={() => {
						nodes = [...getNodesFromDataset(selectedDataset as keyof typeof datasets)];
						selectedDataset = 'Create New';
					}}
				>
					<EditIcon />
				</Button>
			{:else}
				<Button
					variant="ghost"
					class="mt-5"
					onclick={() => {
						navigator.clipboard.writeText(
							JSON.stringify(
								nodes.map((node) => ({
									position: node.position,
									width: node.width === 50 ? undefined : node.width,
									height: node.height === 50 ? undefined : node.height
								}))
							)
						);
					}}
				>
					<CopyIcon />
				</Button>
			{/if}
			<Button
				variant="ghost"
				class="mt-5"
				disabled={layoutDirectly}
				onclick={() => resolveCollisions({ algorithm })}
			>
				<SortIcon />
			</Button>
			<Button
				variant="ghost"
				class="mt-5"
				disabled={layoutDirectly}
				onclick={() => {
					nodes = [...getNodesFromDataset(selectedDataset as keyof typeof datasets)];
				}}
			>
				<ReloadIcon />
			</Button>
			<Button
				variant={layoutDirectly ? 'default' : 'ghost'}
				class="mt-5"
				onclick={() => {
					layoutDirectly = !layoutDirectly;
				}}
			>
				<LightningBoltIcon />
			</Button>
			<div>
				<p class="mb-1 font-mono text-[0.7em] text-muted-foreground">algorithm</p>
				<SelectAlgorithm bind:selectedAlgorithm />
			</div>
			<div>
				<p class="mb-1 font-mono text-[0.7em] text-muted-foreground">dataset</p>
				<SelectDataset bind:selectedDataset />
			</div>
			{#if measurements !== undefined}
				<div
					class="mt-5 flex w-20 flex-col bg-background px-1 text-right font-mono text-[0.7em] text-muted-foreground"
				>
					<p>{measurements.numIterations} iter</p>
					<p>~{measurements.time.toFixed(2)} ms</p>
				</div>
			{/if}
		</Panel>
		<Panel position="top-left"></Panel>
		<Background />
	</SvelteFlow>
</div>
