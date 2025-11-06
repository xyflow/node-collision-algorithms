import type { CollisionAlgorithm } from '@/algorithms';
import { useNodes, type Node } from '@xyflow/svelte';

function useCollisionLayout({
	margin = 0,
	overlapThreshold = 0.5
}: { margin?: number; overlapThreshold?: number } = {}) {
	// const store = $derived(useStore());
	const nodes = useNodes();

	const resolveCollisions = ({
		algorithm,
		dryRun = false,
		iterations = Infinity,
		nodes: nodesToResolve
	}: {
		algorithm: CollisionAlgorithm;
		dryRun?: boolean;
		nodes?: Node[];
		iterations?: number;
	}) => {
		const timeStart = performance.now();

		const { newNodes, numIterations } = algorithm(nodesToResolve ?? nodes.current, {
			iterations: dryRun ? Infinity : iterations,
			overlapThreshold,
			margin
		});

		if (!dryRun && numIterations > 0) {
			nodes.set(newNodes);
		}

		return { numIterations, time: performance.now() - timeStart };
	};

	return {
		resolveCollisions
	};
}

export default useCollisionLayout;
