import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { Chart, registerables } from 'chart.js';
import { Canvas } from 'skia-canvas';

// Register Chart.js components
Chart.register(...registerables);

interface BenchmarkResult {
	name: string;
	mean: number;
	hz: number;
	rme: number;
}

interface BenchmarkGroup {
	fullName: string;
	benchmarks: BenchmarkResult[];
}

interface BenchResults {
	files: Array<{
		filepath: string;
		groups: BenchmarkGroup[];
	}>;
}

async function generateBenchImages() {
	try {
		// Read the benchmark results
		const resultsPath = join(process.cwd(), 'bench-results.json');
		const resultsData = await readFile(resultsPath, 'utf-8');
		const results: BenchResults = JSON.parse(resultsData);

		// Normalize filepaths to be relative to project root
		const projectRoot = process.cwd();
		for (const file of results.files) {
			if (file.filepath.startsWith(projectRoot)) {
				file.filepath = file.filepath.slice(projectRoot.length + 1); // +1 to remove leading slash
			}
		}

		// Write back the normalized results
		await writeFile(resultsPath, JSON.stringify(results, null, 2), 'utf-8');

		// Create static/benchmarks directory if it doesn't exist
		const outputDir = join(process.cwd(), 'static', 'benchmarks');
		await mkdir(outputDir, { recursive: true });

		// Group benchmarks by dataset type (packed, separated, clustered)
		const datasetTypes = new Map<string, Map<string, Map<string, BenchmarkResult>>>();

		for (const file of results.files) {
			for (const group of file.groups) {
				// Group fullName format: "src/performance.bench.ts > dataset size"
				const parts = group.fullName.split(' > ');
				if (parts.length < 2) continue;
				const datasetFull = parts[1];

				// Extract type and size (e.g., "packed 15" -> type: "packed", size: "15")
				const match = datasetFull.match(/^(\w+)\s+(\d+)$/);
				if (!match) continue;
				const [, type, size] = match;

				if (!datasetTypes.has(type)) {
					datasetTypes.set(type, new Map());
				}

				const typeMap = datasetTypes.get(type)!;
				if (!typeMap.has(size)) {
					typeMap.set(size, new Map());
				}

				const sizeMap = typeMap.get(size)!;
				for (const benchmark of group.benchmarks) {
					sizeMap.set(benchmark.name, benchmark);
				}
			}
		}

		// Helper function to generate a chart for a dataset type
		async function generateDatasetTypeChart(
			datasetType: string,
			sizes: Map<string, Map<string, BenchmarkResult>>
		) {
			// Get all sizes and sort them
			const sizeList = Array.from(sizes.keys()).sort((a, b) => parseInt(a) - parseInt(b));

			// Get all algorithms
			const allAlgorithms = new Set<string>();
			for (const sizeMap of sizes.values()) {
				for (const algorithm of sizeMap.keys()) {
					allAlgorithms.add(algorithm);
				}
			}

			const algorithmList = Array.from(allAlgorithms);

			// Prepare data: each algorithm is a series with values for each size
			const algorithmData: { [key: string]: number[] } = {};
			for (const algorithm of algorithmList) {
				algorithmData[algorithm] = [];
				for (const size of sizeList) {
					const result = sizes.get(size)?.get(algorithm);
					algorithmData[algorithm].push(result?.mean || 0);
				}
			}

			// Round up to next axis step (steps are 0.2, 2, 20, etc.)
			const roundUpToStep = (value: number): number => {
				if (value <= 0) return 0.2;
				// Find the appropriate step: 0.2, 2, 20, 200, etc.
				const step = 2 * Math.pow(10, Math.floor(Math.log10(value / 5)));
				return Math.ceil(value / step) * step;
			};

			// Calculate Y-axis max, excluding extreme outliers
			const allValues = Object.values(algorithmData)
				.flat()
				.filter((v) => v > 0);
			allValues.sort((a, b) => a - b);
			const maxValue = allValues[allValues.length - 1];
			const percentile90Index = Math.floor(allValues.length * 0.9);
			const percentile90 = allValues[percentile90Index] || maxValue;
			// Only limit Y-axis if max is more than 3x the 90th percentile (extreme outlier)
			const hasExtremeOutlier = maxValue > percentile90 * 3;
			const rawMax = hasExtremeOutlier ? percentile90 * 1.5 : maxValue * 1.1;
			const yAxisMax = roundUpToStep(rawMax);

			// Create canvas and chart
			const width = 1400;
			const height = 800;
			const canvas = new Canvas(width, height);
			const ctx = canvas.getContext('2d');

			// Set white background
			ctx.fillStyle = 'white';
			ctx.fillRect(0, 0, width, height);

			// Create a wrapper object that Chart.js expects
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const chartElement = { canvas: canvas as any };

			// Color map: colorblind-friendly palette (Okabe-Ito)
			const colorMap: { [key: string]: string } = {
				// Blue for rbush family
				rbush: 'rgba(0, 114, 178, 0.8)',
				rbushReplace: 'rgba(0, 114, 178, 0.8)',
				// Orange for naive family
				naive: 'rgba(230, 159, 0, 0.8)',
				naiveWasm: 'rgba(230, 159, 0, 0.8)',
				// Teal for flatbush/geoIndex family
				flatbush: 'rgba(0, 158, 115, 0.8)',
				geoIndexWasm: 'rgba(0, 158, 115, 0.8)',
				// Vermillion for quadtree
				quadtree: 'rgba(213, 94, 0, 0.8)'
			};
			// Dotted line for wasm/replace variants
			const dottedAlgorithms = new Set(['rbushReplace', 'naiveWasm', 'geoIndexWasm']);
			// Colorblind-friendly fallback colors
			const defaultColors = [
				'rgba(204, 121, 167, 0.8)', // Pink
				'rgba(86, 180, 233, 0.8)', // Sky blue
				'rgba(240, 228, 66, 0.8)' // Yellow
			];
			const getColor = (algorithm: string, index: number) =>
				colorMap[algorithm] || defaultColors[index % defaultColors.length];

			const titleText = datasetType.charAt(0).toUpperCase() + datasetType.slice(1);

			// Custom plugin for floating legend
			const floatingLegend = {
				id: 'floatingLegend',
				afterDraw: (chart: Chart) => {
					const ctx = chart.ctx;
					const datasets = chart.data.datasets;
					const chartArea = chart.chartArea;

					const legendX = chartArea.left + 20;
					const legendY = chartArea.top + 20;
					const lineHeight = 32;
					const boxWidth = 40;
					const boxHeight = 4;

					ctx.save();
					datasets.forEach((dataset, i) => {
						// eslint-disable-next-line @typescript-eslint/no-explicit-any
						const ds = dataset as any;
						const y = legendY + i * lineHeight;

						// Draw line (with dash if applicable)
						ctx.beginPath();
						ctx.strokeStyle = ds.borderColor as string;
						ctx.lineWidth = 3;
						if (ds.borderDash && ds.borderDash.length > 0) {
							ctx.setLineDash(ds.borderDash);
						} else {
							ctx.setLineDash([]);
						}
						ctx.moveTo(legendX, y + boxHeight);
						ctx.lineTo(legendX + boxWidth, y + boxHeight);
						ctx.stroke();

						// Draw label
						ctx.setLineDash([]);
						ctx.fillStyle = '#666';
						ctx.font = '18px sans-serif';
						ctx.textBaseline = 'middle';
						ctx.fillText(ds.label as string, legendX + boxWidth + 12, y + boxHeight);
					});
					ctx.restore();
				}
			};

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const chart = new Chart(chartElement as any, {
				type: 'line',
				data: {
					labels: sizeList,
					datasets: algorithmList.map((algorithm, index) => ({
						label: algorithm,
						data: algorithmData[algorithm],
						backgroundColor: getColor(algorithm, index),
						borderColor: getColor(algorithm, index).replace('0.8', '1'),
						borderWidth: 2,
						borderDash: dottedAlgorithms.has(algorithm) ? [5, 5] : [],
						fill: false,
						tension: 0.1,
						pointRadius: 5,
						pointHoverRadius: 7
					}))
				},
				plugins: [floatingLegend],
				options: {
					responsive: false,
					maintainAspectRatio: false,
					interaction: {
						mode: 'index',
						intersect: false
					},
					plugins: {
						title: {
							display: true,
							text: titleText,
							font: {
								size: 28,
								weight: 'bold'
							}
						},
						legend: {
							display: false
						},
						tooltip: {
							callbacks: {
								label: function (context) {
									const value = context.parsed.y;
									return `${context.dataset.label}: ${value !== null ? value.toFixed(1) : 'N/A'}ms`;
								}
							}
						}
					},
					scales: {
						y: {
							beginAtZero: true,
							max: yAxisMax,
							position: 'left',
							title: {
								display: true,
								text: 'Mean Time (ms)',
								font: {
									size: 20
								}
							},
							ticks: {
								font: {
									size: 16
								},
								callback: function (value) {
									if (typeof value === 'number') {
										return value.toFixed(1);
									}
									return value;
								}
							}
						},
						y1: {
							beginAtZero: true,
							max: yAxisMax,
							position: 'right',
							grid: {
								drawOnChartArea: false
							},
							ticks: {
								font: {
									size: 16
								},
								callback: function (value) {
									if (typeof value === 'number') {
										return value.toFixed(1);
									}
									return value;
								}
							}
						},
						x: {
							title: {
								display: true,
								text: 'Number of Nodes',
								font: {
									size: 20
								}
							},
							ticks: {
								font: {
									size: 16
								}
							}
						}
					}
				}
			});

			// Wait for chart to render and generate image
			await new Promise((resolve) => setTimeout(resolve, 100));
			const imageBuffer = await canvas.toBuffer('png');
			const imagePath = join(outputDir, `${datasetType.toLowerCase()}.png`);
			await writeFile(imagePath, imageBuffer);
			chart.destroy();

			return imagePath;
		}

		// Generate a chart for each dataset type
		for (const [datasetType, sizes] of datasetTypes) {
			const path = await generateDatasetTypeChart(datasetType, sizes);
			console.log(`Generated ${datasetType} chart: ${path}`);
		}

		console.log('Benchmark images generated successfully!');
	} catch (error) {
		console.error('Error generating benchmark images:', error);
		process.exit(1);
	}
}

generateBenchImages();
