import { describe, it, expect } from 'vitest';
import { datasets, getNodesFromDataset } from '@/datasets';

import { naive } from '@/algorithms/naive';
import { rbush } from '@/algorithms/rbush';
import { flatbush } from '@/algorithms/flatbush';
import { rbushReplace } from '@/algorithms/rbushReplace';

const data = Object.keys(datasets).map((dataset) =>
	getNodesFromDataset(dataset as keyof typeof datasets)
);

const options = { iterations: Infinity, overlapThreshold: 0.5, margin: 0 };

describe('do the algorithms resolve the collisions?', () => {
	const rbushData = data.map((nodes) => rbush(nodes, options));
	const flatbushData = data.map((nodes) => flatbush(nodes, options));
	const rbushReplaceData = data.map((nodes) => rbushReplace(nodes, options));

	for (const [index, datasetName] of Object.keys(datasets).entries()) {
		it(`should produce idempotent results for ${datasetName}`, () => {
			const naiveResult = naive(rbushData[index].newNodes, options);
			expect(naiveResult.newNodes).toEqual(rbushData[index].newNodes);
		});

		it(`should produce idempotent results for ${datasetName} with flatbush`, () => {
			const naiveResult = naive(flatbushData[index].newNodes, options);
			expect(naiveResult.newNodes).toEqual(flatbushData[index].newNodes);
		});

		it(`should produce idempotent results for ${datasetName} with rbushReplace`, () => {
			const naiveResult = naive(rbushReplaceData[index].newNodes, options);
			expect(naiveResult.newNodes).toEqual(rbushReplaceData[index].newNodes);
		});
	}
});
