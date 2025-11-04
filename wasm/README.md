# WASM Collision Algorithm

This directory contains the WebAssembly implementation of the `naiveOptimized` collision detection algorithm.

## Setup

### Prerequisites

1. **Rust toolchain**: Install from https://rustup.rs/
2. **WASM target**: `rustup target add wasm32-unknown-unknown`
3. **wasm-bindgen CLI**: `cargo install wasm-bindgen-cli`
4. **wasm-opt** (Binaryen): 
   - macOS: `brew install binaryen`
   - Or download from: https://github.com/WebAssembly/binaryen/releases

### Building

Run the build script:

```bash
npm run build:wasm
```

Or manually:

```bash
cd wasm
cargo build --target wasm32-unknown-unknown --release
wasm-bindgen --target bundler --out-dir pkg --out-name wasm target/wasm32-unknown-unknown/release/wasm.wasm
wasm-opt -O3 --enable-bulk-memory pkg/wasm_bg.wasm -o pkg/wasm_bg.wasm
```

The output will be in `wasm/pkg/`:
- `wasm.js` - JavaScript bindings
- `wasm_bg.wasm` - Optimized WASM binary
- `wasm.d.ts` - TypeScript definitions

## Performance

The WASM implementation uses:
- **Struct of Arrays (SoA)** layout for optimal cache performance
- **Maximum optimization** flags (`-O3`, LTO, single codegen unit)
- **wasm-opt** for binary size and performance optimization

Expected performance: 2-5x faster than the TypeScript implementation for large datasets.

## Usage

The WASM algorithm is available as `naiveWasm` in the algorithms list. 

**Important**: The WASM module must be initialized before first use:

```typescript
import { initNaiveWasm } from '@/algorithms/naiveWasm';

// Initialize early (e.g., in app startup)
await initNaiveWasm();

// Now you can use naiveWasm synchronously
const result = algorithms.naiveWasm(nodes, options);
```

Or use the async version that handles initialization automatically:

```typescript
import { naiveWasmAsync } from '@/algorithms/naiveWasm';

const result = await naiveWasmAsync(nodes, options);
```

