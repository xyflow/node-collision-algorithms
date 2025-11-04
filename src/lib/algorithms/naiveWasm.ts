import type { Node } from '@xyflow/svelte';
import type { CollisionAlgorithm } from '.';

// Lazy-loaded WASM module (initialized on first use)
let wasmModule: typeof import('../../../wasm/pkg/wasm.js') | null = null;
let wasmInitPromise: Promise<void> | null = null;
let wasmReady = false;

/**
 * Universal WASM loader that works in both Node.js and browser environments
 * Uses the pattern: Node.js reads file with fs, Browser uses fetch
 */
async function loadWasm(): Promise<typeof import('../../../wasm/pkg/wasm.js')> {
	// Import the WASM module bindings
	const wasmBindings = await import('../../../wasm/pkg/wasm.js');

	// Check if we're in Node.js environment
	const isNode = typeof process !== 'undefined' && process.versions?.node;

	if (isNode) {
		// Node.js: Read the WASM file from filesystem and use initSync
		const { readFile } = await import('node:fs/promises');
		const { fileURLToPath } = await import('url');
		const { dirname, join } = await import('path');

		// Resolve the WASM file path relative to this module
		const __filename = fileURLToPath(import.meta.url);
		const __dirname = dirname(__filename);
		const wasmPath = join(__dirname, '../../../wasm/pkg/wasm_bg.wasm');

		// Read the WASM binary file
		const wasmBuffer = await readFile(wasmPath);

		// Initialize synchronously with the buffer
		if (wasmBindings.initSync) {
			wasmBindings.initSync({ module: wasmBuffer });
		} else {
			throw new Error('WASM module does not have initSync method');
		}
	} else {
		// Browser: Use wasm-bindgen's default async init (which uses fetch)
		// Try to get the WASM file URL using Vite's asset handling, fallback to auto-resolve
		try {
			// In Vite, we can import the WASM file as a URL
			const wasmUrl = (await import('../../../wasm/pkg/wasm_bg.wasm?url')).default;
			if (wasmBindings.default && typeof wasmBindings.default === 'function') {
				await wasmBindings.default(wasmUrl);
			} else {
				throw new Error('WASM module does not have default init function');
			}
		} catch {
			// Fallback: let wasm-bindgen auto-resolve the WASM file path
			// It will look for wasm_bg.wasm relative to wasm.js
			if (wasmBindings.default && typeof wasmBindings.default === 'function') {
				await wasmBindings.default();
			} else {
				throw new Error('WASM module does not have default init function');
			}
		}
	}

	// Verify the module is actually ready by checking if CollisionState exists
	if (!wasmBindings || !wasmBindings.CollisionState) {
		throw new Error('WASM module loaded but CollisionState class not found');
	}

	return wasmBindings;
}

/**
 * Initialize the WASM module (called automatically on first use)
 * Works in both browser and Node.js environments (if WebAssembly is available)
 */
async function initWasm(): Promise<void> {
	// Check if WebAssembly is available (works in both browser and Node.js)
	if (typeof WebAssembly === 'undefined') {
		throw new Error('WebAssembly is not available in this environment');
	}

	if (wasmReady && wasmModule) return;

	if (wasmInitPromise) {
		await wasmInitPromise;
		return;
	}

	wasmInitPromise = (async () => {
		try {
			wasmModule = await loadWasm();
			wasmReady = true;
		} catch (error) {
			wasmInitPromise = null;
			wasmReady = false;
			console.error('Failed to load WASM module:', error);
			throw error;
		}
	})();

	await wasmInitPromise;
}

/**
 * WASM-accelerated collision resolution using naive algorithm
 * Uses Struct of Arrays (SoA) layout for maximum cache performance
 *
 * Note: This function is synchronous but WASM must be initialized first.
 * The WASM module will be loaded on first call (async), so the first call
 * may take longer. Consider calling initNaiveWasm() early.
 */
export const naiveWasm: CollisionAlgorithm = (
	nodes,
	{ iterations = 50, overlapThreshold = 0.5, margin = 0 }
) => {
	if (!wasmReady || !wasmModule) {
		// Synchronous fallback: throw error with helpful message
		// In practice, you should call initNaiveWasm() before using this
		throw new Error('WASM module not ready. Call initNaiveWasm() first, or use the async version.');
	}

	const { CollisionState } = wasmModule;

	// Convert nodes to flat arrays (Struct of Arrays layout)
	const xs = new Float64Array(nodes.length);
	const ys = new Float64Array(nodes.length);
	const widths = new Float64Array(nodes.length);
	const heights = new Float64Array(nodes.length);

	for (let i = 0; i < nodes.length; i++) {
		const node = nodes[i];
		xs[i] = node.position.x - margin;
		ys[i] = node.position.y - margin;
		widths[i] = (node.width ?? 0) + margin * 2;
		heights[i] = (node.height ?? 0) + margin * 2;
	}

	// Create WASM collision state
	const state = new CollisionState(xs, ys, widths, heights);

	// Convert Infinity to u32::MAX for Rust (Rust u32 can't represent Infinity)
	const rustIterations = iterations === Infinity ? 0xffffffff : iterations;

	// Run collision resolution
	const numIterations = state.resolve(rustIterations, overlapThreshold);

	// Get results (these are properties, not methods)
	const resultXs = state.xs;
	const resultYs = state.ys;
	const movedFlags = state.moved; // Returns Vec<u8> where 0 = false, 1 = true

	// Convert back to nodes
	const newNodes = nodes.map((node, i) => {
		if (movedFlags[i] === 1) {
			return {
				...node,
				position: {
					x: resultXs[i] + margin,
					y: resultYs[i] + margin
				}
			};
		}
		return node;
	});

	return { newNodes, numIterations };
};

/**
 * Initialize WASM module (call this before first use of naiveWasm)
 * This is safe to call multiple times.
 */
export async function initNaiveWasm(): Promise<void> {
	await initWasm();
}

/**
 * Async version that handles initialization automatically
 * Use this if you want automatic initialization on first call
 */
export function naiveWasmAsync(nodes: Node[], options: Parameters<CollisionAlgorithm>[1]) {
	// await initWasm();
	return naiveWasm(nodes, options);
}
