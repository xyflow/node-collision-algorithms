import { geo_index } from '../../../wasm/pkg/wasm.js';
import type { CollisionAlgorithm } from './index.js';

export const geoIndexWasm: CollisionAlgorithm = (
	nodes,
	{ iterations = 50, overlapThreshold = 0.5, margin = 0 }
) => {
	// Convert nodes to flat arrays (Struct of Arrays layout)
	const xs = new Float64Array(nodes.length);
	const ys = new Float64Array(nodes.length);
	const widths = new Float64Array(nodes.length);
	const heights = new Float64Array(nodes.length);
	const moved = new Uint8Array(nodes.length);

	for (let i = 0; i < nodes.length; i++) {
		const node = nodes[i];
		xs[i] = node.position.x - margin;
		ys[i] = node.position.y - margin;
		widths[i] = (node.width ?? 0) + margin * 2;
		heights[i] = (node.height ?? 0) + margin * 2;
		moved[i] = 0;
	}

	// Convert Infinity to u32::MAX for Rust
	const rustIterations = iterations === Infinity ? 0xffffffff : iterations;

	const numIterations = geo_index(xs, ys, widths, heights, moved, rustIterations, overlapThreshold);

	// Convert back to nodes
	const newNodes = nodes.map((node, i) => {
		if (moved[i] === 1) {
			return {
				...node,
				position: {
					x: xs[i] + margin,
					y: ys[i] + margin
				}
			};
		}
		return node;
	});

	return { newNodes, numIterations };
};
