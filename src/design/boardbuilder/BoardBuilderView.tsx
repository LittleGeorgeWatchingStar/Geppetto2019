import {DataDependencyFinder} from "./DataDependencyFinder";
import {Module} from "../../module/Module";
import * as React from "react";
import {SUGGESTED_COMS_PROCESSORS} from "./suggestions";
import {AUDIO} from "../../module/Category";
import eventDispatcher from "../../utils/events";
import {BUILD_BOARD, BuildBoardEvent} from "../../workspace/events";
import {DesignRevision} from "../DesignRevision";
import * as _ from "underscore";
import {StringComparer} from "../../connection/BusMapper";
import {BoardBuilderCategory} from "./BoardBuilderCategory";


interface BoardBuilderViewProps {
    dependencyFinder: DataDependencyFinder;
    designRevision: DesignRevision;
    categories: { [category: string]: BoardBuilderCategory };
    mountingHoles: Module[];
    isLoading: boolean;
    onClose: () => void;
}

interface BoardBuilderViewState {
    isHelpOpen: boolean;
    searchInput: string;
    selectedMountingHole: Module | null;
    selectedCategory: string | null;
    selectedModules: { [category: string]: Module[] };
    boardDimensions: { width: number | null, height: number | null };

    /** Maps modules to automatically-generated data providers, if applicable. */
    dataDependencyMap: { [moduleName: string]: Module[] };

    /** A list of module names that are incompatible with the chosen processor, if applicable. */
    incompatibleModules: string[];

    /** Data dependencies that have been unchecked by the user. */
    excludedDependencies: string[];

    isLoadingDependencies: boolean;
}

export class BoardBuilderView extends React.Component<BoardBuilderViewProps, BoardBuilderViewState> {
    private MAX_NUM_MODULES = 50;
    private suggestionsBoxRef;
    private selectedCategoryRef;

    constructor(props) {
        super(props);

        let selectedCategory: BoardBuilderCategory | null = null;
        for (const name in this.props.categories) {
            const category = this.props.categories[name];
            if (!selectedCategory) {
                selectedCategory = category
            } else if (category.position < selectedCategory.position) {
                selectedCategory = category
            }
        }

        this.state = {
            isHelpOpen: false,
            searchInput: '',
            selectedMountingHole: null,
            selectedCategory: selectedCategory ? selectedCategory.name : null,
            selectedModules: this.initPreselectedModules(this.props.categories),
            boardDimensions: {
                width: null,
                height: null
            },
            dataDependencyMap: {},
            incompatibleModules: [],
            excludedDependencies: [],
            isLoadingDependencies: false
        };
        this.suggestionsBoxRef = React.createRef();
        this.selectedCategoryRef = React.createRef();
    }

    private initPreselectedModules(categories: { [category: string]: BoardBuilderCategory }): { [category: string]: Module[] } {
        const map = {};
        for (const categoryName in categories) {
            map[categoryName] = categories[categoryName].preselectedModules.slice();
        }
        return map;
    }

    componentWillReceiveProps(nextProps: Readonly<BoardBuilderViewProps>): void {
        if (this.props.isLoading && !nextProps.isLoading) {
            this.setState({
                selectedModules: this.initPreselectedModules(nextProps.categories)
            });
        }
    }

    render(): JSX.Element {
        return (
            <div>
                {this.suggestionsBox}
                <div className="module-options">
                    <div className="board-builder-heading">
                        <div className="board-img"/>
                        Choose your functionality
                        <button onClick={() => {
                            this.setState({isHelpOpen: !this.state.isHelpOpen})
                        }}
                                className={`help ${this.state.isHelpOpen ? 'active' : ''}`}/>
                    </div>
                    <div className="categories">
                        <div className="category-container">
                            {this.categoryViews()}
                        </div>
                        {this.boardSize}
                        {this.mountingHolesView}
                    </div>
                </div>
                {this.previewColumn}
                {this.helpView}
            </div>
        );
    }

    private categoryViews(): JSX.Element[] {
        const onClickRemoveModule = (index: number, category: string) => {
            const selectedModules = this.state.selectedModules;
            /** TODO: Don't mutate this? */
            selectedModules[category].splice(index, 1);
            this.setState({
                selectedModules: selectedModules
            });
            this.checkDataDependencies();
        };

        const onClickClearAllModules = (category: string) => {
            const selectedModules = this.state.selectedModules;
            selectedModules[category] = [];
            this.setState({
                selectedModules: selectedModules
            });
            this.checkDataDependencies();
        };

        return Object.keys(this.props.categories).map(categoryName => {
            const locked = this.props.categories[categoryName].isLocked;
            const disabledMessage = this.reasonForCategoryDisabled(categoryName);
            const disabled = disabledMessage !== null;
            const selectedModules = this.state.selectedModules[categoryName];
            const onClickCategory = category => this.setState({selectedCategory: category});
            return (
                <div key={categoryName}
                     data-disabled={locked || disabled}
                     onClick={(locked || disabled) ? null : () => onClickCategory(categoryName)}
                     className={this.state.selectedCategory === categoryName ? 'selected-js' : ''}>
                    <div className="category-name">
                        <b>{categoryName}</b>
                        <span
                            onClick={(selectedModules.length > 0) ? () => onClickClearAllModules(categoryName) : null}>Reset</span>
                    </div>
                    {locked && '(Locked)'}
                    {
                        (!disabled ||
                            (disabled && selectedModules.length !== 0)) &&
                        <ul ref={this.state.selectedCategory === categoryName ? this.selectedCategoryRef : null}>
                            {selectedModules.map((module, i) =>
                                <li key={i}>{module.name}
                                    <button className="remove-btn"
                                            disabled={locked}
                                            onClick={() => onClickRemoveModule(i, categoryName)}/>
                                </li>)}
                        </ul>
                    }
                    {disabledMessage && <div className="incompatible"><i>{disabledMessage}</i></div>}
                </div>
            )
        });
    }

    private reasonForCategoryDisabled(category: string): string | null {
        if (category.toLowerCase().indexOf(AUDIO) >= 0) {
            const modulesToSearch = this.serializeSelectedModules().concat(this.serializeDataProviders());
            const incompatible = modulesToSearch.find(module => {
                const id = module.moduleId.toString();
                return id === SUGGESTED_COMS_PROCESSORS.ATSAMW25.toString() ||
                    id === SUGGESTED_COMS_PROCESSORS.ST_MICROCORTEX.toString();
            });
            if (incompatible) {
                return `Not supported by ${incompatible.name}.`
            }
        }
        return null;
    }

    private get suggestionsBox(): JSX.Element {
        if (!this.state.selectedCategory) {
            return null;
        }
        return (
            <div className="suggestions-box"
                 ref={this.suggestionsBoxRef}>
                <div className="suggestions-container">
                    <strong className="suggestions-heading">
                        Choose {this.state.selectedCategory}
                        <span className="search-icon"/>
                    </strong>
                    <div className="search-container">
                        <input type="search"
                               placeholder="Search..."
                               onChange={event => this.setState({searchInput: event.target.value})}
                               value={this.state.searchInput}/>
                        <span className="search-icon"/>
                        {this.state.searchInput.length > 0 &&
                        <span className="reset-icon" onClick={() => this.setState({searchInput: ''})}/>}
                    </div>
                    <ul className="suggestions">
                        {this.getModulesList()}
                    </ul>
                </div>
            </div>
        );
    }

    private getModulesList(): JSX.Element | JSX.Element[] {
        if (this.props.isLoading) {
            return <li className="suggestions-message">Loading modules, please wait...</li>;
        }
        if (this.serializeSelectedModules().length >= this.MAX_NUM_MODULES) {
            return <li className="suggestions-message">
                You've reached the maximum number of modules ({this.MAX_NUM_MODULES}).
            </li>;
        }
        const getIconNode = module => {
            const icon = module.getMarketing().find(i => undefined != i.image_uri);
            if (icon) {
                return <img src={icon.image_uri} alt=''/>;
            }
            return null;
        };
        const onClickAddModule = module => {
            if (!this.state.selectedCategory) {
                return;
            }
            this.state.selectedModules[this.state.selectedCategory].push(module);
            this.setState({}); // Force rerender
            this.checkDependencies();
        };
        return this.getModules().map(
            module => (
                <li key={module.id}>
                    <button title={module.name}
                            onClick={() => onClickAddModule(module)}>
                        {getIconNode(module)} {module.name}
                    </button>
                </li>
            )
        );
    }

    private getModules(): Module[] {
        if (!this.state.selectedCategory) {
            return [];
        }
        const category = this.props.categories[this.state.selectedCategory];
        const modules = category.includedModules;
        if (this.state.searchInput) {
            const searchedModules = findClosestByName(this.state.searchInput, modules) as Module[];
            return searchedModules.filter(value => !value.isExpired());
        }
        return modules.filter(module => !module.isExpired());
    }

    private get boardSize(): JSX.Element {
        const parseDimension = (input: string) => {
            const value = parseInt(input);
            if (!input.trim() || isNaN(value) || value <= 0) {
                return null;
            }
            return value;
        };
        const onInput = (width: string,
                         height: string) => {
            this.setState({
                boardDimensions: {
                    width: parseDimension(width),
                    height: parseDimension(height)
                }
            });
        };
        return (
            <form className="board-size">
                <b>Board size (mm)</b>
                <div className="inputs">
                    <label>
                        <span>Width</span>
                        <input type="number" placeholder="(Auto)" min="10"
                               onInput={event => onInput(event.currentTarget.value, '')}/>
                    </label>
                    <label>
                        <span>Height</span>
                        <input type="number" placeholder="(Auto)" min="10"
                               onInput={event => onInput('', event.currentTarget.value)}/>
                    </label>
                </div>
            </form>
        );
    }

    private get mountingHolesView(): JSX.Element {
        const onSelectMountingHole = (hole: Module) => {
            if (this.state.selectedMountingHole === hole) {
                this.setState({selectedMountingHole: null});
            } else {
                this.setState({selectedMountingHole: hole});
            }
        };
        if (!this.props.mountingHoles.length) {
            return null;
        }
        return (
            <form className="mounting-holes">
                <p><b>Add Mounting Holes (x4)?</b></p>
                {this.props.mountingHoles.map(hole =>
                    <label key={hole.id}>
                        <input type="checkbox"
                               checked={this.state.selectedMountingHole === hole}
                               onChange={() => onSelectMountingHole(hole)}/>
                        {this.shortenMountingHoleName(hole.name)}
                    </label>)}
            </form>
        );
    }

    private shortenMountingHoleName(name: string): string {
        const matchesTemplate = /^(M|m)ounting (H|h)ole \(\d+\.\d+(mm|MM)\)$/.test(name);
        if (!matchesTemplate) {
            return name;
        }
        return name.match(/\d+\.\d+(mm|MM)/)[0];
    }

    /**
     * @return Data providers which have been checked under the data dependencies section.
     */
    private serializeDataProviders(): Module[] {
        const providers = [];
        const dataDependencyMap = this.state.dataDependencyMap;
        for (const moduleName in dataDependencyMap) {
            for (const provider of dataDependencyMap[moduleName]) {
                const isUnique = providers.indexOf(provider) === -1;
                const isNotExcluded = this.state.excludedDependencies.indexOf(provider.name) === -1;
                if (isUnique && isNotExcluded) {
                    providers.push(provider);
                }
            }
        }
        return providers;
    }

    private get previewColumn(): JSX.Element {
        const isBuildDisabled = this.props.isLoading || this.state.isLoadingDependencies ||
            (this.serializeSelectedModules().length === 0 && !this.state.selectedMountingHole);
        return (
            <div className="preview">
                <div className="preview-board-img"/>
                <span className="heading">Your board will contain:</span>
                {this.modulePreviewItems()}
                {this.dataDependenciesView()}
                <div className="pointer"/>
                <div className="build-board-container">
                    <button className="build-board cta"
                            disabled={isBuildDisabled}
                            onClick={() => this.buildBoard()}>
                        Start Build
                    </button>
                    <p>After board is designed, Geppetto will suggest power sources for your board.</p>
                </div>
            </div>
        );
    }

    private modulePreviewItems(): JSX.Element {
        const countedModules = this.countSelectedModulesMap;
        const numModulesLabel = moduleName => countedModules[moduleName] > 1 ? `x${countedModules[moduleName]}` : '';
        const hasRemoveButton = moduleName => false; // TODO
        const makeModulePreviewItem = moduleName => {
            if (this.state.incompatibleModules.indexOf(moduleName) > -1) {
                return (
                    <li className="incompatible"
                        title="This module is incompatible with your chosen COM/processor."
                        key={moduleName}>
                        <span>{moduleName} (incompatible) {numModulesLabel(moduleName)}</span>
                        <button className="remove-btn" onClick={() => this.removeModules(moduleName)}/>
                    </li>
                );
            }
            return (
                <li key={moduleName}>
                    <span>{moduleName} {numModulesLabel(moduleName)}</span>
                    {hasRemoveButton(moduleName) &&
                    <button className="remove-btn" onClick={() => this.removeModules(moduleName)}/>
                    }
                </li>
            );
        };
        const moduleNames = Object.keys(countedModules);
        return (
            <div className="selected-items">
                <ul>
                    {moduleNames.length === 0 && this.state.selectedMountingHole === null &&
                    <li><i>(No modules yet)</i></li>
                    }
                    {moduleNames.map(makeModulePreviewItem)}
                    {this.state.selectedMountingHole !== null && <li>Mounting Hole x4</li>}
                </ul>
            </div>
        );
    }

    private removeModules(moduleName: string): void {
        for (const category in this.state.selectedModules) {
            this.state.selectedModules[category] = this.state.selectedModules[category]
                .filter(module => module.name !== (moduleName));
        }
        this.checkDependencies();
    }

    private dataDependenciesView(): JSX.Element | null {
        const dependenciesMap = this.dataProvideNamesMap;
        const providerNames = Object.keys(dependenciesMap);
        if (providerNames.length === 0) {
            return null;
        }
        return (
            <div className="data-dependencies">
                <ul>
                    {providerNames.map(providerName => {
                        const requirerNames = truncateStringList(dependenciesMap[providerName]);
                        return this.getDependencyCheckbox(providerName, requirerNames);
                    })}
                </ul>
            </div>
        );
    }

    private get helpView(): JSX.Element | null {
        if (!this.state.isHelpOpen) {
            return null;
        }
        return (
            <div className="help-box ui-dialog">
                <div className="help-heading">
                    <h3>Quickly Generate a Design with the Builder</h3>
                    <button className="remove-btn"
                            onClick={() => this.setState({isHelpOpen: false})}/>
                </div>
                <p>1. <b>Choose module functions</b> from the left box. If you don't see one you want, use search.
                    <i>Note that BoardBuilder lets you choose group by group, e.g., Sensors, then USB, then
                        Networks.</i></p>
                <p>2. <b>Click the [Start Build] button.</b> BoardBuilder will place and add your functions on the
                    board.</p>
                <p>3. <b>Add Power</b> by following the on-screen prompt after the board is designed.</p>
                <p>4. <b>Finalize module layout and board size</b> in Geppetto.</p>
                <br/>
                <p>Video tutorial (0:42):</p>
                <div className="video">
                    <iframe width="560"
                            height="315"
                            src="https://www.youtube.com/embed/9DdwQw99tQs?rel=0"
                            allowFullScreen/>
                </div>
            </div>
        );
    }

    private checkDependencies = _.debounce(() => {
        const prevSelections = this.serializeSelectedModules();
        if (prevSelections.length === 0) {
            this.setState({
                dataDependencyMap: {},
                incompatibleModules: []
            });
            return;
        }
        const toFetch = prevSelections.concat(this.serializeDataProviders());
        this.setState({isLoadingDependencies: true});
        this.props.dependencyFinder.fetch(toFetch).then(() => {
            if (!this.haveSelectionsChanged(prevSelections)) {
                this.checkDataDependencies();
            }
        });
    }, 100);

    private checkDataDependencies(): void {
        const modules = this.serializeSelectedModules();
        if (modules.length === 0) {
            this.setState({
                dataDependencyMap: {},
                incompatibleModules: []
            });
            return;
        }
        this.props.dependencyFinder.getCompatibility(modules).then(results => {
            if (!this.haveSelectionsChanged(modules)) {
                this.setState({
                    dataDependencyMap: results.compatible,
                    incompatibleModules: results.incompatible,
                    isLoadingDependencies: false
                });
            }
        });
    }

    private get countSelectedModulesMap(): { [moduleName: string]: number } {
        const map = {};
        for (const module of this.serializeSelectedModules()) {
            const currentCount = map[module.name];
            map[module.name] = currentCount ? currentCount + 1 : 1;
        }
        return map;
    }

    /**
     * Returns a structure for presenting automatically-chosen data providers to the user.
     * { providerName: requireName[] }
     */
    private get dataProvideNamesMap(): { [providerName: string]: string[] } {
        const provideNameMap = {};
        for (const requirerName in this.state.dataDependencyMap) {
            this.state.dataDependencyMap[requirerName].forEach(provider => {
                if (!provideNameMap[provider.name]) {
                    provideNameMap[provider.name] = [];
                }
                provideNameMap[provider.name].push(requirerName);
            });
        }
        return provideNameMap;
    }

    private haveSelectionsChanged(oldSelections: Module[]): boolean {
        const unique = (value, i, self) => self.indexOf(value) === i;
        return oldSelections.filter(unique).length !==
            this.serializeSelectedModules().filter(unique).length;
    }

    private serializeSelectedModules(): Module[] {
        const modules = [];
        Object.keys(this.state.selectedModules).forEach(categoryName =>
            modules.push(...this.state.selectedModules[categoryName]));
        return modules;
    }

    private getDependencyCheckbox(providerName: string, requirerNames: string): JSX.Element {
        const onChangeDependency = providerName => {
            const index = this.state.excludedDependencies.indexOf(providerName);
            if (index === -1) {
                this.state.excludedDependencies.push(providerName);
            } else {
                this.state.excludedDependencies.splice(index, 1);
            }
            this.setState({}); // Force rerender
        };
        return (
            <li key={providerName}>
                <label>
                    <input value={providerName}
                           type="checkbox"
                           checked={this.state.excludedDependencies.indexOf(providerName) === -1}
                           onChange={() => onChangeDependency(providerName)}/>
                    Add {providerName}</label>
                <br/>
                <i><small>Needed by {requirerNames}</small></i>
            </li>
        );
    }

    private buildBoard(): void {
        const modules = this.serializeSelectedModules().concat(this.serializeDataProviders());
        if (this.state.selectedMountingHole) {
            for (let i = 0; i < 4; ++i) {
                modules.push(this.state.selectedMountingHole);
            }
        }
        this.props.onClose();
        // Utilize the cache built in dependencyFinder so that we can cut down the server pings at build time.
        const fetchPromise = this.props.dependencyFinder.fetchModuleDetails(modules) as Promise<Module[]>;
        fetchPromise.then(detailedModules => {
            eventDispatcher.publishEvent(BUILD_BOARD, {
                modules: detailedModules,
                designRevision: this.props.designRevision,
                width: this.state.boardDimensions.width,
                height: this.state.boardDimensions.height,
            } as BuildBoardEvent);
        });
    }
}


/**
 * Eg. Input: ['Dual Audio', 'Speaker', 'Microphone', 'Boo']
 * Output: 'Dual Audio, Speaker, Microphone... +1 more'
 */
function truncateStringList(list: string[]): string {
    const maxDisplayed = 3;
    if (list.length <= maxDisplayed) {
        return list.join(', ');
    }
    const truncated = list.slice(0, maxDisplayed);
    return `${truncated.join(', ')}... +${list.length - maxDisplayed} more`;
}

/**
 * Sort items by relevance to a given name, then return the top n results.
 */
function findClosestByName(name: string, items: { name: string }[], numResults = 7) {
    const stringComparer = new StringComparer();
    items.sort((a, b) => {
        const aSimilarity = stringComparer.compareSimilarity(a.name.toLowerCase(), name.toLowerCase());
        const bSimilarity = stringComparer.compareSimilarity(b.name.toLowerCase(), name.toLowerCase());
        return bSimilarity - aSimilarity;
    });
    return items.slice(0, numResults);
}
