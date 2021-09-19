export class ModuleFilterController {
    private static instance: ModuleFilterController;

    private static queryParamName = 'moduleFilter';
    private static comQueryParamName = 'comModuleFilter'; // Filter that applies to COMs only.

    private filtersSet: Set<string> = new Set<string>();
    private comFiltersSet: Set<string> = new Set<string>();

    private constructor() {
    }

    public static getInstance(): ModuleFilterController {
        if (!this.instance) {
            this.instance = new ModuleFilterController();
        }
        return this.instance;
    }

    public get filter(): string[] {
        return Array.from(this.filtersSet);
    }

    public get comFilter(): string[] {
        return Array.from(this.comFiltersSet);
    }

    public setByUrlSearchParams(params: URLSearchParams) {
        if (params.has(ModuleFilterController.queryParamName)) {
            const filterString = params.get(ModuleFilterController.queryParamName);
            this.filtersSet = new Set<string>(
                filterString.split(',').map(flag => flag.trim())
            );
        } else {
            this.filtersSet = new Set<string>();
        }

        if (params.has(ModuleFilterController.comQueryParamName)) {
            const filterString = params.get(ModuleFilterController.comQueryParamName);
            this.comFiltersSet = new Set<string>(
                filterString.split(',').map(flag => flag.trim())
            );
        } else {
            this.comFiltersSet = new Set<string>();
        }
    }

    public addFilter(filter: string): void {
        this.filtersSet.add(filter);
    }

    public addComFilter(comFilter: string): void {
        this.filtersSet.add(comFilter);
    }
}