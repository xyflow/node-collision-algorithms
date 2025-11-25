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

		// Group benchmarks by dataset
		const datasets = new Map<string, Map<string, BenchmarkResult>>();

		for (const file of results.files) {
			for (const group of file.groups) {
				// Group fullName format: "src/performance.bench.ts > dataset"
				const parts = group.fullName.split(' > ');
				if (parts.length < 2) continue;
				const dataset = parts[1];

				if (!datasets.has(dataset)) {
					datasets.set(dataset, new Map());
				}

				const datasetMap = datasets.get(dataset)!;
				for (const benchmark of group.benchmarks) {
					datasetMap.set(benchmark.name, benchmark);
				}
			}
		}

		// Helper function to detect if we need a broken axis
		function needsBrokenAxis(values: number[]): {
			needsBreak: boolean;
			breakThreshold: number;
			maxValue: number;
		} {
			if (values.length === 0) return { needsBreak: false, breakThreshold: 0, maxValue: 0 };

			const sorted = [...values].sort((a, b) => a - b);
			const q1 = sorted[Math.floor(sorted.length * 0.25)];
			const q3 = sorted[Math.floor(sorted.length * 0.75)];
			const iqr = q3 - q1;
			const outlierThreshold = q3 + 1.5 * iqr;

			const maxValue = Math.max(...values);
			const needsBreak = maxValue > outlierThreshold * 1.5; // Only break if significantly larger

			return {
				needsBreak,
				breakThreshold: needsBreak ? outlierThreshold : maxValue,
				maxValue
			};
		}

		// Generate a chart for each dataset
		for (const [dataset, algorithms] of datasets) {
			const algorithmNames: string[] = [];
			const meanValues: number[] = [];

			// Sort algorithms by performance (lowest mean ms first = fastest)
			const sortedAlgorithms = Array.from(algorithms.entries()).sort(
				(a, b) => a[1].mean - b[1].mean
			);

			for (const [algorithm, result] of sortedAlgorithms) {
				algorithmNames.push(algorithm);
				meanValues.push(result.mean);
			}

			// Check if we need a broken axis
			const axisInfo = needsBrokenAxis(meanValues);

			// Create canvas and chart
			const width = 1200;
			const height = 600;
			const canvas = new Canvas(width, height);
			const ctx = canvas.getContext('2d');

			// Set white background
			ctx.fillStyle = 'white';
			ctx.fillRect(0, 0, width, height);

			// Prepare data with clipped values for display if needed
			const displayValues = meanValues.map((val) =>
				axisInfo.needsBreak && val > axisInfo.breakThreshold ? axisInfo.breakThreshold : val
			);

			// Create a wrapper object that Chart.js expects
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const chartElement = { canvas: canvas as any };

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const chart = new Chart(chartElement as any, {
				type: 'bar',
				data: {
					labels: algorithmNames,
					datasets: [
						{
							label: 'Mean Time (ms)',
							data: displayValues,
							backgroundColor: meanValues.map((val) =>
								axisInfo.needsBreak && val > axisInfo.breakThreshold
									? 'rgba(255, 99, 132, 0.6)' // Red for clipped values
									: 'rgba(54, 162, 235, 0.6)'
							),
							borderColor: meanValues.map((val) =>
								axisInfo.needsBreak && val > axisInfo.breakThreshold
									? 'rgba(255, 99, 132, 1)'
									: 'rgba(54, 162, 235, 1)'
							),
							borderWidth: 1
						}
					]
				},
				options: {
					responsive: false,
					maintainAspectRatio: false,
					plugins: {
						title: {
							display: true,
							text: `Benchmark Results: ${dataset}${axisInfo.needsBreak ? ' (with axis break)' : ''}`,
							font: {
								size: 18,
								weight: 'bold'
							}
						},
						legend: {
							display: true,
							position: 'top'
						},
						tooltip: {
							callbacks: {
								label: function (context) {
									const index = context.dataIndex;
									const actualValue = meanValues[index];
									const displayValue = displayValues[index];
									const isClipped = axisInfo.needsBreak && actualValue > axisInfo.breakThreshold;

									return [
										`Mean: ${actualValue.toFixed(4)}ms${isClipped ? ' (clipped)' : ''}`,
										isClipped ? `Displayed: ${displayValue.toFixed(4)}ms` : ''
									].filter(Boolean);
								}
							}
						}
					},
					scales: {
						y: {
							beginAtZero: true,
							max: axisInfo.needsBreak ? axisInfo.breakThreshold * 1.1 : undefined,
							title: {
								display: true,
								text: 'Mean Time (ms)',
								font: {
									size: 14
								}
							},
							ticks: {
								callback: function (value) {
									if (axisInfo.needsBreak && Number(value) >= axisInfo.breakThreshold * 0.9) {
										return `~${axisInfo.breakThreshold.toFixed(2)}`;
									}
									return Number(value).toFixed(2);
								}
							}
						},
						x: {
							title: {
								display: true,
								text: 'Algorithm',
								font: {
									size: 14
								}
							}
						}
					}
				},
				plugins: axisInfo.needsBreak
					? [
							{
								id: 'breakIndicator',
								afterDraw: (chart) => {
									const ctx = chart.ctx;
									const yScale = chart.scales.y;
									const breakY = yScale.getPixelForValue(axisInfo.breakThreshold);

									// Draw break symbol (zigzag)
									ctx.save();
									ctx.strokeStyle = 'rgba(200, 0, 0, 0.8)';
									ctx.lineWidth = 2;
									ctx.beginPath();
									const breakX = 50;
									const breakWidth = 30;
									ctx.moveTo(breakX, breakY - 5);
									ctx.lineTo(breakX + breakWidth / 3, breakY);
									ctx.lineTo(breakX + (breakWidth * 2) / 3, breakY - 5);
									ctx.lineTo(breakX + breakWidth, breakY);
									ctx.stroke();

									// Draw text indicating break
									ctx.fillStyle = 'rgba(200, 0, 0, 0.8)';
									ctx.font = '12px Arial';
									ctx.fillText(
										`Max: ${axisInfo.maxValue.toFixed(2)}ms`,
										breakX + breakWidth + 10,
										breakY + 4
									);
									ctx.restore();
								}
							}
						]
					: []
			});

			// Wait for chart to render and generate image
			await new Promise((resolve) => setTimeout(resolve, 100));
			const imageBuffer = await canvas.toBuffer('png');
			const imagePath = join(outputDir, `${dataset.toLowerCase().replace(/\s+/g, '-')}.png`);
			await writeFile(imagePath, imageBuffer);
			chart.destroy();

			console.log(`Generated chart for ${dataset}: ${imagePath}`);
		}

		// Generate a combined chart showing all datasets
		const allDatasets = Array.from(datasets.keys());
		const allAlgorithms = new Set<string>();
		for (const algorithms of datasets.values()) {
			for (const algorithm of algorithms.keys()) {
				allAlgorithms.add(algorithm);
			}
		}

		const algorithmList = Array.from(allAlgorithms);
		const combinedData: { [key: string]: number[] } = {};

		for (const algorithm of algorithmList) {
			combinedData[algorithm] = [];
			for (const dataset of allDatasets) {
				const result = datasets.get(dataset)?.get(algorithm);
				combinedData[algorithm].push(result?.mean || 0);
			}
		}

		// Create combined chart
		const combinedWidth = 1400;
		const combinedHeight = 700;
		const combinedCanvas = new Canvas(combinedWidth, combinedHeight);
		const combinedCtx = combinedCanvas.getContext('2d');

		// Set white background
		combinedCtx.fillStyle = 'white';
		combinedCtx.fillRect(0, 0, combinedWidth, combinedHeight);

		// Create a wrapper object that Chart.js expects
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const combinedChartElement = { canvas: combinedCanvas as any };

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const combinedChart = new Chart(combinedChartElement as any, {
			type: 'bar',
			data: {
				labels: allDatasets,
				datasets: algorithmList.map((algorithm, index) => {
					const colors = [
						'rgba(54, 162, 235, 0.6)',
						'rgba(255, 99, 132, 0.6)',
						'rgba(75, 192, 192, 0.6)',
						'rgba(255, 206, 86, 0.6)',
						'rgba(153, 102, 255, 0.6)',
						'rgba(255, 159, 64, 0.6)',
						'rgba(199, 199, 199, 0.6)'
					];
					return {
						label: algorithm,
						data: combinedData[algorithm],
						backgroundColor: colors[index % colors.length],
						borderColor: colors[index % colors.length].replace('0.6', '1'),
						borderWidth: 1
					};
				})
			},
			options: {
				responsive: false,
				maintainAspectRatio: false,
				plugins: {
					title: {
						display: true,
						text: 'Benchmark Results: All Datasets',
						font: {
							size: 18,
							weight: 'bold'
						}
					},
					legend: {
						display: true,
						position: 'top'
					}
				},
				scales: {
					y: {
						beginAtZero: true,
						title: {
							display: true,
							text: 'Mean Time (ms)',
							font: {
								size: 14
							}
						},
						ticks: {
							callback: function (value) {
								return Number(value).toFixed(2);
							}
						}
					},
					x: {
						title: {
							display: true,
							text: 'Dataset',
							font: {
								size: 14
							}
						}
					}
				}
			}
		});

		// Wait for chart to render and generate image
		await new Promise((resolve) => setTimeout(resolve, 100));
		const combinedImageBuffer = await combinedCanvas.toBuffer('png');
		const combinedImagePath = join(outputDir, 'all-datasets.png');
		await writeFile(combinedImagePath, combinedImageBuffer);
		combinedChart.destroy();

		console.log(`Generated combined chart: ${combinedImagePath}`);

		// Generate charts grouped by dataset type with logarithmic scale
		// Group by dataset type (packed, separated, clustered)
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

		// Helper function to generate a chart for a dataset type with a specific scale
		async function generateDatasetTypeChart(
			datasetType: string,
			sizes: Map<string, Map<string, BenchmarkResult>>,
			scaleType: 'logarithmic' | 'linear'
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

			const colors = [
				'rgba(54, 162, 235, 0.8)',
				'rgba(255, 99, 132, 0.8)',
				'rgba(75, 192, 192, 0.8)',
				'rgba(255, 206, 86, 0.8)',
				'rgba(153, 102, 255, 0.8)',
				'rgba(255, 159, 64, 0.8)',
				'rgba(199, 199, 199, 0.8)'
			];

			const scaleLabel = scaleType === 'logarithmic' ? 'Logarithmic Scale' : 'Linear Scale';
			const titleText = `Benchmark Results: ${datasetType.charAt(0).toUpperCase() + datasetType.slice(1)} (${scaleLabel})`;

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const chart = new Chart(chartElement as any, {
				type: 'line',
				data: {
					labels: sizeList,
					datasets: algorithmList.map((algorithm, index) => ({
						label: algorithm,
						data: algorithmData[algorithm],
						backgroundColor: colors[index % colors.length],
						borderColor: colors[index % colors.length].replace('0.8', '1'),
						borderWidth: 2,
						fill: false,
						tension: 0.1,
						pointRadius: 5,
						pointHoverRadius: 7
					}))
				},
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
								size: 20,
								weight: 'bold'
							}
						},
						legend: {
							display: true,
							position: 'top'
						},
						tooltip: {
							callbacks: {
								label: function (context) {
									const value = context.parsed.y;
									return `${context.dataset.label}: ${value !== null ? value.toFixed(4) : 'N/A'}ms`;
								}
							}
						}
					},
					scales: {
						y: {
							type: scaleType,
							beginAtZero: scaleType === 'linear',
							title: {
								display: true,
								text: `Mean Time (ms) - ${scaleLabel}`,
								font: {
									size: 14
								}
							},
							ticks: {
								callback: function (value) {
									if (typeof value === 'number') {
										return value.toFixed(4);
									}
									return value;
								}
							}
						},
						x: {
							title: {
								display: true,
								text: 'Dataset Size',
								font: {
									size: 14
								}
							}
						}
					}
				}
			});

			// Wait for chart to render and generate image
			await new Promise((resolve) => setTimeout(resolve, 100));
			const imageBuffer = await canvas.toBuffer('png');
			const suffix = scaleType === 'logarithmic' ? '-log' : '';
			const imagePath = join(outputDir, `${datasetType.toLowerCase()}${suffix}.png`);
			await writeFile(imagePath, imageBuffer);
			chart.destroy();

			return imagePath;
		}

		// Generate a chart for each dataset type (both logarithmic and linear)
		for (const [datasetType, sizes] of datasetTypes) {
			// Generate logarithmic version
			const logPath = await generateDatasetTypeChart(datasetType, sizes, 'logarithmic');
			console.log(`Generated ${datasetType} chart with logarithmic scale: ${logPath}`);

			// Generate linear version
			const linearPath = await generateDatasetTypeChart(datasetType, sizes, 'linear');
			console.log(`Generated ${datasetType} chart with linear scale: ${linearPath}`);
		}

		console.log('Benchmark images generated successfully!');
	} catch (error) {
		console.error('Error generating benchmark images:', error);
		process.exit(1);
	}
}

generateBenchImages();
