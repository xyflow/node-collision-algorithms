import { naive } from '@/algorithms/naive';
import { rbush } from '@/algorithms/rbush';
import { flatbush } from '@/algorithms/flatbush';
import { datasets, getNodesFromDataset } from '@/datasets';
import { bench, describe } from 'vitest';
import { naiveOptimized } from '@/algorithms/naiveOptimized';
import { rbushReplace } from '@/algorithms/rbushReplace';

const options = { iterations: Infinity, overlapThreshold: 0.5, margin: 0 };

// Create benchmarks for each dataset, comparing all algorithms
Object.keys(datasets).forEach((datasetKey) => {
	const dataset = datasetKey as keyof typeof datasets;
	const nodes = getNodesFromDataset(dataset);

	describe(dataset, () => {
		bench(
			'naiveOptimized',
			() => {
				naiveOptimized(nodes, options);
			},
			{ iterations: 1000, warmupIterations: 50 }
		);

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
	});
});
