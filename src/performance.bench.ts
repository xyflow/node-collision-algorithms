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
import { geoIndexWasm } from '@/algorithms/geoIndex';
import { quadtree } from '@/algorithms/quadtree';

beforeAll(async () => {
	try {
		const wasmBuffer = await readFile('.' + wasmUrl);
		initSync({ module: wasmBuffer });
	} catch (error) {
		console.warn('WASM not available for benchmarks:', error);
	}
});

const options = { iterations: Infinity, overlapThreshold: 0.5, margin: 0 };

const baseBenchOptions = { iterations: 100, warmupIterations: 10 };
// Create benchmarks for each dataset, comparing all algorithms
Object.keys(datasets).forEach((datasetKey) => {
	const dataset = datasetKey as keyof typeof datasets;
	const nodes = getNodesFromDataset(dataset);

	const benchOptions = {
		...baseBenchOptions,
		iterations: nodes.length > 100 ? 25 : baseBenchOptions.iterations
	};

	describe.concurrent(dataset, () => {
		bench(
			'naive',
			() => {
				naive(nodes, options);
			},
			benchOptions
		);

		bench(
			'rbush',
			() => {
				rbush(nodes, options);
			},
			benchOptions
		);

		bench(
			'rbushReplace',
			() => {
				rbushReplace(nodes, options);
			},
			benchOptions
		);

		bench(
			'flatbush',
			() => {
				flatbush(nodes, options);
			},
			benchOptions
		);

		bench(
			'naiveWasm',
			() => {
				naiveWasm(nodes, options);
			},
			benchOptions
		);

		bench(
			'geoIndexWasm',
			() => {
				geoIndexWasm(nodes, options);
			},
			benchOptions
		);

		bench(
			'quadtree',
			() => {
				quadtree(nodes, options);
			},
			benchOptions
		);
	});
});
