<script lang="ts">
	import { untrack } from 'svelte';
	import {
		Background,
		Panel,
		SvelteFlow,
		useSvelteFlow,
		type Edge,
		type Node
	} from '@xyflow/svelte';

	import { getNodesFromDataset, datasets, initialDataset } from '@/datasets';
	import useCollisionLayout from '@/hooks/useCollisionLayout.svelte';

	import * as Tooltip from '@/components/ui/tooltip';
	import { Button } from '@/components/ui/button';
	import SelectDataset from '@/components/SelectDataset.svelte';

	import CopyIcon from '@/icons/CopyIcon.svelte';
	import EditIcon from '@/icons/EditIcon.svelte';
	import SortIcon from '@/icons/SortIcon.svelte';

	import CustomNode from '@/nodes/CustomNode.svelte';
	import SelectAlgorithm from '@/components/SelectAlgorithm.svelte';
	import ReloadIcon from '@/icons/ReloadIcon.svelte';
	import LightningBoltIcon from '@/icons/LightningBoltIcon.svelte';
	import GithubIcon from '@/icons/GithubIcon.svelte';
	import { Badge } from '@/components/ui/badge';
	import LinkIcon from '@/icons/LinkIcon.svelte';
	import { store } from '@/store';
	import { page } from '$app/state';

	const { resolveCollisions } = useCollisionLayout({ margin: 10 });

	const { screenToFlowPosition, fitView } = useSvelteFlow();

	let measurements = $state<{ numIterations: number; time: number }>({
		numIterations: NaN,
		time: NaN
	});

	const hideUI = $derived(page.url.searchParams.get('hide-ui') === 'true');

	$effect(() => {
		store.algorithm;
		store.selectedData;
		setTimeout(() => {
			measurements = resolveCollisions({
				dryRun: true,
				algorithm: store.algorithm,
				nodes: store.selectedData
			});
		}, 50);
	});

	let initial = true;
	$effect(() => {
		store.selectedData;
		if (store.layoutDirectly) {
			resolveCollisions({
				algorithm: store.algorithm,
				nodes: store.isCreateNew ? untrack(() => nodes) : store.selectedData,
				iterations: Infinity
			});
			untrack(() => fitView());
		} else if (!store.isCreateNew && !initial) {
			// nodes = [...selectedData];
			nodes = store.selectedData.map((node) => ({ ...node }));
		}
		initial = false;
	});

	let nodes = $state.raw<Node[]>([...getNodesFromDataset(initialDataset)]);

	let edges = $state.raw<Edge[]>([]);

	const nodeTypes = {
		custom: CustomNode
	};

	// Copy-paste state
	let copiedNodes = $state<Node[]>([]);

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
	{#if !hideUI}
		<Panel position="top-left" class="pointer-events-none m-0! font-[NTDapper]">
			<div class="bg-linear-to-br from-white from-0% via-white via-70% to-transparent p-4 pb-6">
				<div class="pointer-events-auto">
					<span class="text-2xl font-bold">node collision algorithms</span>
					<a href="https://xyflow.com/blog/node-collision-algorithms" target="_blank">
						<Badge variant="secondary" class="bg-primary-100 text-primary-950 hover:underline">
							<LinkIcon />
							Read the blog post
						</Badge>
					</a>
					<a href="https://github.com/xyflow/node-collision-algorithms" target="_blank">
						<Badge variant="secondary" class="hover:underline">
							<GithubIcon />
							Github
						</Badge>
					</a>
				</div>
			</div>
		</Panel>
	{/if}
	<SvelteFlow
		bind:nodes
		bind:edges
		fitView
		paneClickDistance={1}
		selectionOnDrag={false}
		attributionPosition="bottom-left"
		{nodeTypes}
		onnodedragstop={() => {
			if (store.selectedDataset !== 'Create New' && store.layoutDirectly) {
				measurements = resolveCollisions({ algorithm: store.algorithm });
			}
		}}
		onpaneclick={({ event }) => {
			if (store.selectedDataset === 'Create New') {
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
						data: {}
					}
				];
			}
		}}
	>
		{#if !hideUI}
			<Panel position="bottom-right" class="flex gap-2">
				{#if import.meta.env.DEV}
					{#if store.selectedDataset !== 'Create New'}
						<Button
							variant="ghost"
							class="mt-5"
							onclick={() => {
								nodes = [...getNodesFromDataset(store.selectedDataset as keyof typeof datasets)];
								store.selectedDataset = 'Create New';
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
				{/if}

				<Tooltip.Provider>
					<Tooltip.Root delayDuration={0}>
						<Tooltip.Trigger class="mt-5 bg-background">
							{#snippet child({ props })}
								<Button
									{...props}
									class={[
										props.class,
										'shadow-md shadow-primary-950',
										{
											'bg-primary-950 shadow-md shadow-primary-950 hover:bg-primary-800 hover:shadow-primary-800':
												store.layoutDirectly,
											'bg-background text-primary-950 outline-1 outline-primary-950 outline-solid hover:bg-primary-100':
												!store.layoutDirectly
										}
									]}
									variant={store.layoutDirectly ? 'default' : 'default'}
									onclick={() => {
										store.layoutDirectly = !store.layoutDirectly;
									}}
								>
									<LightningBoltIcon />
								</Button>
							{/snippet}
						</Tooltip.Trigger>
						<Tooltip.Content>
							<p>Toggle node overlap resolution</p>
						</Tooltip.Content>
					</Tooltip.Root>
				</Tooltip.Provider>
				<Tooltip.Provider>
					<Tooltip.Root delayDuration={0}>
						<Tooltip.Trigger class="mt-5">
							{#snippet child({ props })}
								<Button
									{...props}
									variant="ghost"
									disabled={store.layoutDirectly}
									onclick={() => {
										measurements = resolveCollisions({ algorithm: store.algorithm });
									}}
								>
									<SortIcon />
								</Button>
							{/snippet}
						</Tooltip.Trigger>
						<Tooltip.Content>
							<p>Run algorithm</p>
						</Tooltip.Content>
					</Tooltip.Root>
				</Tooltip.Provider>
				<Tooltip.Provider>
					<Tooltip.Root delayDuration={0}>
						<Tooltip.Trigger class="mt-5">
							{#snippet child({ props })}
								<Button
									{...props}
									variant="ghost"
									disabled={store.layoutDirectly}
									onclick={() => {
										nodes = [
											...getNodesFromDataset(store.selectedDataset as keyof typeof datasets).map(
												(node) => ({ ...node })
											)
										];
										measurements = resolveCollisions({
											dryRun: true,
											algorithm: store.algorithm,
											nodes
										});
									}}
								>
									<ReloadIcon />
								</Button>
							{/snippet}
						</Tooltip.Trigger>
						<Tooltip.Content>
							<p>Reload dataset</p>
						</Tooltip.Content>
					</Tooltip.Root>
				</Tooltip.Provider>

				<div>
					<p class="mb-1 font-mono text-[0.7em] text-muted-foreground">algorithm</p>
					<SelectAlgorithm bind:selectedAlgorithm={store.selectedAlgorithm} />
				</div>
				<div>
					<p class="mb-1 font-mono text-[0.7em] text-muted-foreground">dataset</p>
					<SelectDataset bind:selectedDataset={store.selectedDataset} />
				</div>
				<div
					class="mt-5 flex w-20 flex-col bg-background px-1 text-right font-mono text-[0.7em] text-muted-foreground"
				>
					<p>{measurements.numIterations} iter</p>
					<p>
						~{measurements.time > 1000
							? `${(measurements.time / 1000).toFixed(1)} s`
							: `${measurements.time.toFixed(2)} ms`}
					</p>
				</div>
			</Panel>
		{/if}
		{#if hideUI}
			<Panel position="bottom-right">
				<Button
					variant="ghost"
					onclick={() => {
						nodes = [
							...getNodesFromDataset(store.selectedDataset as keyof typeof datasets).map(
								(node) => ({
									...node
								})
							)
						];
					}}
				>
					<ReloadIcon />
				</Button>
			</Panel>
		{/if}
		<Background />
	</SvelteFlow>
</div>
