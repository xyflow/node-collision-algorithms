import { algorithms } from '../algorithms';
import { datasets, getNodesFromDataset, initialDataset, type SelectOptions } from '../datasets';

export class Store {
	selectedDataset = $state.raw<SelectOptions>(initialDataset);
	isCreateNew = $derived(this.selectedDataset === 'Create New');

	selectedAlgorithm = $state<keyof typeof algorithms>('naive');
	algorithm = $derived(algorithms[this.selectedAlgorithm]);

	selectedData = $derived(
		this.isCreateNew ? [] : [...getNodesFromDataset(this.selectedDataset as keyof typeof datasets)]
	);

	layoutDirectly = $state(true);
}
