import * as React from "react";
import {ForkModuleDataConfirmation} from "./ForkModuleDataConfirmation";
import {ModuleDataDetailedView} from "./moduledatadetail/ModuleDataDetailedView";
import {
    ModuleData,
    forkModule,
    forkModuleFork
} from "./moduledatadetail/ModuleData";
import {DeleteModuleDataConfirmation} from "./DeleteModuleDataConfirmation";
import {Module} from "../module/Module";
import {getModuleGateway} from "../module/ModuleGateway";
import {Part} from "./moduledatadetail/part/Part";
import {getCadSourceGateway} from "./moduledatadetail/cadsource/CadSourceGateway";
import {BusTemplate} from "../module/custom/BusTemplate";
import * as Config from "Config";
import {CpuGateway} from "./moduledatadetail/cpu/CpuGateway";
import {TabNavigation} from "../view/TabNavigation";
import * as Backbone from "backbone";
import {ReactNode, ReactNodeArray} from "react";
import {getCustomerModuleGateway} from "../module/custom/CustomerModuleGateway";
import events from "../utils/events";
import {CUSTOMIZED_MODULE_DELETE, ModulePlacementEvent} from "../module/events";
import errorHandler from "../controller/ErrorHandler";


interface ModuleDataViewProps {
    initialSelectedFork?: Module | null
    savedForkModules: Module[];

    /**
     * All bus templates for the user to choose from. TODO the current BusTemplate interface lacks signals
     * TODO we probably want to pass in callbacks/use gateway to query these things when they become relevant, rather
     * than right away
     */
    availableBusTemplates: BusTemplate[];

    cpuGateway: CpuGateway;
}

interface ModuleDataViewState {
    // If none are selected, we are browsing modules for their default CAD data.
    selectedFork: ModuleData | null;
    savedForkModules: Module[];
    dataToFork: ModuleData | null;
    dataToDelete: Module | null;
    isLoading: boolean;
}

export class ModuleDataEdit extends React.Component<ModuleDataViewProps, ModuleDataViewState> {

    constructor(props: ModuleDataViewProps) {
        super(props);
        this.state = {
            selectedFork: null,
            savedForkModules: props.savedForkModules,
            dataToFork: null,
            dataToDelete: null,
            isLoading: false,
        };
    }

    componentDidMount(): void {
        if (this.props.initialSelectedFork) {
            this.onSelect(this.props.initialSelectedFork);
        }
    }

    render(): JSX.Element {
        return (
            <main className="module-data-viewer-container">
                {this.moduleDataTitle}
                {this.moduleDataUserLibrary}
                {this.state.selectedFork && this.forkView}
                {this.state.dataToFork && this.forkConfirmationWindow}
                {this.state.dataToDelete && this.forkDeletionWindow}
                {this.state.isLoading && this.loader}
            </main>
        );
    }

    private get moduleDataTitle(): JSX.Element {
        return (
            <div className="module-data-viewer-header">
                {this.state.selectedFork &&
                <h2>{this.state.selectedFork.name}</h2>}
                {!this.state.selectedFork &&
                <h2>Customized Module Library</h2>}
            </div>
        )
    }

    private get moduleDataUserLibrary(): JSX.Element {
        const profileClassNames = module =>
            'profile' + (this.isSelected(module) ? ' profile-selected' : '');
        return (
            <section className="module-data-library-container">
                <div className="cad-data-editor__profile-picker">
                    <div className="header-container">
                        <h3>Your Library ({this.state.savedForkModules.length})</h3>

                        <div className="header-container-functions">
                            <button onClick={() => TabNavigation.openWorkspace()}>Workspace</button>
                        </div>
                    </div>
                    <ul className="cad-data-editor__profile-list">
                        {
                            this.state.savedForkModules.map(m =>
                                <li className={`row ${profileClassNames(m)}`}
                                    onClick={() => this.onSelect(m)}
                                    key={m.id}>
                                    <div className="profile-svg-container">{this.moduleSVG(m)}</div>
                                    <div className="profile-content-container">
                                        <h5>{m.name}</h5>
                                        <button className="delete-profile-icon"
                                                onClick={event => this.onClickDeleteFork(event, m)}/>
                                    </div>
                                </li>
                            )
                        }
                    </ul>
                    {
                        this.state.savedForkModules.length === 0 &&
                        <div className="create-profile-message">
                            No forks yet. Fork a module to customize its Nets and Buses.
                        </div>
                    }
                </div>
            </section>
        );
    }

    private get loader(): JSX.Element {
        return (
            <div className="module-data-view__loader">
                <div>
                    <img src={`${Config.STATIC_URL}/image/geppetto-shutter.png`}
                         className="blink load-icon"
                         alt="Geppetto Logo"/>
                </div>
            </div>
        )
    }

    private get forkView(): JSX.Element {
        return <ModuleDataDetailedView data={this.state.selectedFork}
                                       availableBusTemplates={this.props.availableBusTemplates}
                                       isReadonly={false}
                                       onClickSyncData={() => this.syncData()}
                                       onClickFork={data => this.setState({dataToFork: data})}
                                       cpuGateway={this.props.cpuGateway}
                                       closeDialog={() => {
                                       }}
                                       onModuleEditTab={true}/>
    }

    private get forkConfirmationWindow(): JSX.Element {
        return (
            <div className="profile-creation-window-container"
                 onClick={() => this.onClickCloseWindow()}>
                <div onClick={event => event.stopPropagation()}>
                    <ForkModuleDataConfirmation
                        baseModuleId={this.state.selectedFork.id}
                        moduleName={this.state.selectedFork.name}
                        onForkCreated={(name, module) => this.onForkCreated(name, module)}
                        onClickClose={() => this.onClickCloseWindow()}
                        existingForkNames={this.state.savedForkModules.map(f => f.name)}
                        isForkedModule={true}/>
                </div>
            </div>
        )
    }

    private get forkDeletionWindow(): JSX.Element {
        return (
            <div className="profile-creation-window-container"
                 onClick={() => this.onClickCloseWindow()}>
                <div onClick={event => event.stopPropagation()}>
                    <DeleteModuleDataConfirmation
                        onClickConfirm={() => this.onConfirmDeleteFork()}
                        onClickClose={() => this.onClickCloseWindow()}
                        dataToDelete={this.state.dataToDelete}/>
                </div>
            </div>
        );
    }

    private onSelect(fork: Module): void {
        const cadSourceGateway = getCadSourceGateway();
        this.setState({
            isLoading: true
        });
        fork.loadDetails(getModuleGateway())
            .then(() => {
                return cadSourceGateway.getUpverterCadSource(fork.revisionId)
            })
            .then(cadSource => {
                Promise.all([
                    cadSourceGateway.getNetList(cadSource.id),
                    cadSourceGateway.getPartList(cadSource.id)
                ]).then(results => {
                    const nets: string[] = results[0];
                    const parts: Part[] = results[1];

                    const editableModuleData = forkModule(fork, cadSource, nets, parts);

                    this.setState({
                        selectedFork: editableModuleData,
                        isLoading: false
                    });

                    Backbone.history.navigate(`!/module-edit/${editableModuleData.id}`)
                });
            });
    }

    private isSelected(fork: Module): boolean {
        return this.state.selectedFork && this.state.selectedFork.id === fork.id;
    }

    /**
     * Syncs data for selected fork.
     */
    private syncData(): void {
        this.setState({isLoading: true});
        const cadSourceGateway = getCadSourceGateway(); // TODO DI
        cadSourceGateway.refreshCache(this.state.selectedFork.cadSource.id)
            .then(data => {
                const fork = this.state.selectedFork;
                fork.nets = data.nets;
                fork.parts = data.parts;
                this.setState({
                    selectedFork: fork,
                    isLoading: false
                });
            });
    }

    private onClickCloseWindow(): void {
        this.setState({
            dataToFork: null,
            dataToDelete: null
        });
    }

    private onForkCreated(name: string, module: Module): void {
        const fork = forkModuleFork(name, this.state.dataToFork);
        this.state.savedForkModules.push(module);
        this.setState({
            selectedFork: fork,
            dataToFork: null
        });
    }

    private onClickDeleteFork(event, data: Module): void {
        this.setState({
            dataToDelete: data
        });
        event.stopPropagation(); // Do not select this
    }

    private onConfirmDeleteFork(): void {
        // Gateway call
        const gateway = getCustomerModuleGateway();
        const deleteModule = gateway.deleteCustomizedModule(this.state.dataToDelete.moduleId);
        deleteModule.done(() => {
            events.publishEvent(CUSTOMIZED_MODULE_DELETE, {
                model: this.state.dataToDelete
            } as ModulePlacementEvent);
            const toDelete = this.state.dataToDelete;
            const updated = this.state.savedForkModules.filter(p => p.id !== toDelete.id);
            this.setState({
                savedForkModules: updated,
                dataToDelete: null,
            });
            if (this.isSelected(toDelete)) {
                const index = this.state.savedForkModules.indexOf(toDelete);
                const module = updated[index - 1] ? updated[index - 1] : null;
                if (module) {
                    this.onSelect(module)
                } else {
                    this.setState({
                        selectedFork: null,
                    })
                }
            }
        }).fail(errorHandler.onFail);
    }

    private moduleSVG(module: Module): ReactNode {
        const outline = module.outline;
        const largeModule = outline.width > 300 || outline.height > 250 ? "large-module-svg" : ""; //the value is selected temporarily
        const pathD = module.getFootprintPolylines().map(polyline => polyline.svgPath()).join(' ');
        return <div title={module.summary}
                    className={`module-svg-container ${largeModule}`}>
            <svg xmlns="http://www.w3.org/2000/svg"
                 viewBox={`${outline.xmin} ${outline.ymin} ${outline.width} ${outline.height}`}
                 preserveAspectRatio="xMinYMin meet">
                <g transform={`translate(0, ${outline.mirror}) scale(1, -1)`}>
                    <path className="footprint" d={pathD}/>
                    {this.features(module)}
                </g>
            </svg>
        </div>
    }

    private features(module: Module): ReactNodeArray {
        return module.features.map(f =>
            <line className={f.type}
                  key={f.id}
                  x1={f.points[0].x}
                  y1={f.points[0].y}
                  x2={f.points[1].x}
                  y2={f.points[1].y}/>);
    }
}
