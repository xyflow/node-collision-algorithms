import type { Node } from '@xyflow/svelte';
import type { CollisionAlgorithm } from '.';

type Box = {
	x: number;
	y: number;
	width: number;
	height: number;
	moved: boolean;
	node: Node;
};

/**
 * Converts nodes from nodeLookup to Box format for collision detection
 */
function getBoxesFromNodes(nodes: Node[], margin: number = 0): Box[] {
	const boxes: Box[] = new Array(nodes.length);

	for (let i = 0; i < nodes.length; i++) {
		const node = nodes[i];
		boxes[i] = {
			x: node.position.x - margin,
			y: node.position.y - margin,
			width: node.width! + margin * 2,
			height: node.height! + margin * 2,
			node,
			moved: false
		};
	}

	return boxes;
}

/**
 * Resolves overlaps between nodes using iterative separation
 * @param boxes Array of boxes with id, x, y, width, height
 * @param iterations Maximum number of iterations to run
 * @param overlapThreshold Acceptable overlap threshold in pixels (default: 0.5px)
 * @returns New positions for each box
 */
export const naiveOptimized: CollisionAlgorithm = (
	nodes,
	{ iterations = 50, overlapThreshold = 0.5, margin = 0 }
) => {
	const boxes = getBoxesFromNodes(nodes, margin);

	let numIterations = 0;

	for (let iter = 0; iter <= iterations; iter++) {
		let moved = false;

		for (let i = 0; i < boxes.length; i++) {
			for (let j = i + 1; j < boxes.length; j++) {
				const A = boxes[i];
				const B = boxes[j];

				// Calculate center positions
				const centerAX = A.x + A.width * 0.5;
				const centerAY = A.y + A.height * 0.5;
				const centerBX = B.x + B.width * 0.5;
				const centerBY = B.y + B.height * 0.5;

				// Calculate distance between centers
				const dx = centerAX - centerBX;
				const dy = centerAY - centerBY;

				// Calculate overlap along each axis
				const px = (A.width + B.width) * 0.5 - Math.abs(dx);
				const py = (A.height + B.height) * 0.5 - Math.abs(dy);

				// Check if there's significant overlap
				if (px > overlapThreshold && py > overlapThreshold) {
					moved = true;

					// Resolve along the smallest overlap axis
					if (px < py) {
						// Move along x-axis
						const sx = dx > 0 ? 1 : -1;
						const moveAmount = px / 2;

						A.x += moveAmount * sx;
						B.x -= moveAmount * sx;
						A.moved = true;
						B.moved = true;
					} else {
						// Move along y-axis
						const sy = dy > 0 ? 1 : -1;
						const moveAmount = py / 2;
						A.y += moveAmount * sy;
						B.y -= moveAmount * sy;
						A.moved = true;
						B.moved = true;
					}
				}
			}
		}
		numIterations = iter;

		// Early exit if no overlaps were found
		if (!moved) {
			break;
		}
	}

	const newNodes = boxes.map((box) => {
		if (box.moved) {
			return {
				...box.node,
				position: {
					x: box.x + margin,
					y: box.y + margin
				}
			};
		}
		return box.node;
	});

	return { newNodes, numIterations };
};
