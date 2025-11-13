# Node Collision Algorithms

A playground to explore, develop, and benchmark algorithms that resolve overlapping nodes in browser environments.

> [!NOTE]
> Fiddle with the [demo](https://node-collision-algorithms.vercel.app/) or read our [blog post](https://xyflow.com/blog/node-collision-algorithms).

![Title](static/title.gif)

### Features

- **Playground** for comparing and developing algorithms & datasets
- **WebAssembly Toolchain via Rust** to easily test out non-Javascript solutions
- **Benchmark** for comparing the performance on different datasets

### Algorithms

Each algorithm implements the same interface (nodes in, nodes out) but uses different strategies for collision detection.

- **Naive**: Simple nested loop checking all node pairs - O(n²) complexity
- **NaiveWasm**: Same as the JS version, except [SoA instead of AoS](https://en.wikipedia.org/wiki/AoS_and_SoA)

#### Using different spatial index implementations

- **[Rbush](https://github.com/mourner/rbush)**: R-tree based spatial index
- **[Flatbush](https://github.com/mourner/flatbush)**: Memory-efficient flat and static R-tree implementation
- **[geo-index](https://github.com/kylebarron/geo-index)**: Rust based R-tree index with same data structure as flatbush
- **[quadtree-ts](https://github.com/timohausmann/quadtree-js)**: Recursive spatial partitioning into quadrants for fast lookups

## About this project

Although this project may appear complete, please consider it to be in an early stage. We are pleased with the current architecture and functionality of the playground and toolchain; nevertheless, numerous optimizations are yet to be implemented and bugs remain to be found.

### Future Work

#### Optimizations

- [ ] Rebuild spatial indexes more sparsely
- [ ] Skip initial iteration by building required datastracture in the main loop
- [ ] Investigate more performant use of libraries
- [ ] Investigate baseline overhead for calling WASM

#### Features

- [ ] Gather more realistic datasets
- [ ] Visualize and investigate reasons for differences in results
  - Possible causes: querying of stale indexes, stale values within single iterations, bug or incorrect use of library
- [ ] Compare different overlap resolution strategies
  - Lock position of dropped node

#### Benchmark

- [ ] Measure memory usage
- [ ] Run benchmark automatically in isolated environment
- [ ] Investigate influence of GC settings
- [ ] Compare JS runtimes

## Benchmark Results

> [!IMPORTANT]  
> Every benchmark is incomplete. Always expect flaws in either the implementation or in the measurement of results!

TBD

## Setup

### Prerequisites

1. **Rust/Rustup** (required to build WebAssembly algorithms)

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

2. **Binaryen** (required for WASM optimization)

```bash
# macOS
brew install binaryen

# Debian/Ubuntu
sudo apt install binaryen

# Arch Linux
sudo pacman -S binaryen
```

3. **Node.js** (v22 or higher)

4. **pnpm**

```bash
npm install -g pnpm
```

### Installation

1. Clone the repository:

```bash
git clone https://github.com/xyflow/node-collision-algorithms.git
cd node-collision-algorithms
```

2. Install dependencies:

```bash
pnpm install
```

3. Build WebAssembly modules:

```bash
pnpm run build:wasm
```

4. Start the development server:

```bash
pnpm run dev
```

The application will be available at `http://localhost:5173`

## Development

TBD
