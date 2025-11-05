import { naive } from '@/algorithms/naive';
import { rbush } from '@/algorithms/rbush';
import { flatbush } from '@/algorithms/flatbush';
import { datasets, getNodesFromDataset } from '@/datasets';
import { bench, describe, beforeAll } from 'vitest';
import { rbushReplace } from '@/algorithms/rbushReplace';
import { naiveWasm } from '@/algorithms/naiveWasm';
import { initSync } from '../wasm/pkg/wasm';

/**
 * Initialize WASM for benchmarks
 */
import wasmUrl from '../wasm/pkg/wasm_bg.wasm?url';
import { readFile } from 'node:fs/promises';

beforeAll(async () => {
	try {
		const wasmBuffer = await readFile('.' + wasmUrl);
		initSync({ module: wasmBuffer });
	} catch (error) {
		console.warn('WASM not available for benchmarks:', error);
	}
});

const options = { iterations: Infinity, overlapThreshold: 0.5, margin: 0 };
// Create benchmarks for each dataset, comparing all algorithms
Object.keys(datasets).forEach((datasetKey) => {
	const dataset = datasetKey as keyof typeof datasets;
	const nodes = getNodesFromDataset(dataset);

	describe(dataset, () => {
		bench(
			'naive',
			() => {
				naive(nodes, options);
			},
			{ iterations: 1000, warmupIterations: 50 }
		);

		bench(
			'rbush',
			() => {
				rbush(nodes, options);
			},
			{ iterations: 1000, warmupIterations: 50 }
		);

		bench(
			'rbushReplace',
			() => {
				rbushReplace(nodes, options);
			},
			{ iterations: 1000, warmupIterations: 50 }
		);

		bench(
			'flatbush',
			() => {
				flatbush(nodes, options);
			},
			{ iterations: 1000, warmupIterations: 50 }
		);

		bench(
			'naiveWasm',
			() => {
				naiveWasm(nodes, options);
			},
			{ iterations: 1000, warmupIterations: 50 }
		);
	});
});
