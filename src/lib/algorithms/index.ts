import type { Node } from '@xyflow/svelte';
import init from '../../../wasm/pkg/wasm.js';

import { naive } from './naive';
import { rbush } from './rbush';
import { flatbush } from './flatbush';
import { rbushReplace } from './rbushReplace';
import { naiveWasm } from './naiveWasm';
import { geoIndexWasm } from './geoIndex';
import { quadtree } from './quadtree.js';

export type CollisionAlgorithmOptions = {
	iterations: number;
	overlapThreshold: number;
	margin: number;
};

export type CollisionAlgorithm = (
	nodes: Node[],
	options: CollisionAlgorithmOptions
) => { newNodes: Node[]; numIterations: number };

export const algorithms = {
	naive,
	naiveWasm,
	geoIndexWasm,
	rbush,
	rbushReplace,
	flatbush,
	quadtree
} as const;

export async function initWasm() {
	await init();
}
