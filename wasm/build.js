import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const wasmDir = __dirname;

console.log('🔨 Building WASM module...\n');

try {
	// Step 1: Build Rust to WASM
	console.log('Step 1/3: Compiling Rust to WASM...');
	execSync('cargo build --target wasm32-unknown-unknown --release', {
		cwd: wasmDir,
		stdio: 'inherit'
	});

	// Step 2: Generate JS bindings with wasm-bindgen
	console.log('\nStep 2/3: Generating JS bindings...');
	const wasmFile = 'target/wasm32-unknown-unknown/release/wasm.wasm';

	if (!existsSync(join(wasmDir, wasmFile))) {
		throw new Error(`WASM file not found: ${wasmFile}`);
	}

	execSync(
		`wasm-bindgen \
    --target web \
    --out-dir pkg \
    --out-name wasm \
    ${wasmFile}`,
		{
			cwd: wasmDir,
			stdio: 'inherit',
			shell: true
		}
	);

	// Step 3: Optimize with wasm-opt
	console.log('\nStep 3/3: Optimizing WASM binary...');
	const pkgWasm = 'pkg/wasm_bg.wasm';

	if (!existsSync(join(wasmDir, pkgWasm))) {
		console.warn('⚠️  wasm_bg.wasm not found, skipping optimization');
	} else {
		try {
			execSync(`wasm-opt -O3 --enable-bulk-memory ${pkgWasm} -o ${pkgWasm}`, {
				cwd: wasmDir,
				stdio: 'inherit',
				shell: true
			});
		} catch (error) {
			console.warn('⚠️  wasm-opt not found, skipping optimization');
			console.warn(
				'   Install with: brew install binaryen (macOS) or download from https://github.com/WebAssembly/binaryen/releases'
			);
		}
	}

	console.log('\n✅ WASM build complete!');
	console.log(`   Output: ${join(wasmDir, 'pkg')}`);
} catch (error) {
	console.error('\n❌ Build failed:', error.message);
	process.exit(1);
}
