import type { Node } from '@xyflow/svelte';
import type { CollisionAlgorithm } from '.';
import { Quadtree, Rectangle } from '@timohausmann/quadtree-ts';

type Rect = Rectangle<{
	id: string;
	node: Node;
	moved: boolean;
}>;

const quadtreeMargin = 25;

function getBoxesFromNodes(nodes: Node[], margin: number = 0) {
	const rects: Rect[] = new Array(nodes.length);

	let minX = Infinity;
	let minY = Infinity;
	let maxX = -Infinity;
	let maxY = -Infinity;

	for (let i = 0; i < nodes.length; i++) {
		const node = nodes[i];
		const x = node.position.x - margin;
		const y = node.position.y - margin;
		const width = node.width! + margin * 2;
		const height = node.height! + margin * 2;

		minX = Math.min(minX, x);
		minY = Math.min(minY, y);
		maxX = Math.max(maxX, x + width);
		maxY = Math.max(maxY, y + height);

		rects[i] = new Rectangle({
			x: node.position.x - margin,
			y: node.position.y - margin,
			width: node.width! + margin * 2,
			height: node.height! + margin * 2,
			data: { id: node.id, node, moved: false }
		});
	}

	return {
		rects,
		quadtreeSize: {
			width: maxX - minX + quadtreeMargin * 2,
			height: maxY - minY + quadtreeMargin * 2,
			x: minX - quadtreeMargin,
			y: minY - quadtreeMargin
		}
	};
}

export const quadtree: CollisionAlgorithm = (
	nodes,
	{ iterations = 50, overlapThreshold = 0.5, margin = 0 }
) => {
	const { rects, quadtreeSize: initialQuadtreeSize } = getBoxesFromNodes(nodes, margin);

	let quadtreeSize = { ...initialQuadtreeSize };
	let quadtree = new Quadtree({ ...quadtreeSize });

	for (const rect of rects) {
		quadtree.insert(rect);
	}

	let numIterations = 0;

	for (let iter = 0; iter <= iterations; iter++) {
		let moved = false;

		for (let i = 0; i < rects.length; i++) {
			const A = rects[i];
			const candidates = quadtree.retrieve(A) as Rect[];

			for (const B of candidates) {
				if (A.data!.id === B.data!.id) continue;

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
					A.data!.moved = B.data!.moved = moved = true;

					// Resolve along the smallest overlap axis
					if (px < py) {
						// Move along x-axis
						const sx = dx > 0 ? 1 : -1;
						const moveAmount = (px / 2) * sx;
						A.x += moveAmount;
						B.x -= moveAmount;
					} else {
						// Move along y-axis
						const sy = dy > 0 ? 1 : -1;
						const moveAmount = (py / 2) * sy;
						A.y += moveAmount;
						B.y -= moveAmount;
					}

					quadtreeSize = {
						width: Math.max(
							quadtreeSize.width,
							A.x + A.width + quadtreeMargin * 2,
							B.x + B.width + quadtreeMargin * 2
						),
						height: Math.max(
							quadtreeSize.height,
							A.y + A.height + quadtreeMargin * 2,
							B.y + B.height + quadtreeMargin * 2
						),
						x: Math.min(quadtreeSize.x, A.x - quadtreeMargin, B.x - quadtreeMargin),
						y: Math.min(quadtreeSize.y, A.y - quadtreeMargin, B.y - quadtreeMargin)
					};
				}
			}
		}
		numIterations++;

		// Early exit if no overlaps were found
		if (!moved) {
			break;
		}

		quadtree = new Quadtree({ ...quadtreeSize });
		for (const rect of rects) {
			quadtree.insert(rect);
		}
	}

	const newNodes = rects.map((rect) => {
		if (rect.data!.moved) {
			return {
				...rect.data!.node,
				position: {
					x: rect.x + margin,
					y: rect.y + margin
				}
			};
		}
		return rect.data!.node;
	});

	return { newNodes, numIterations };
};
