import * as React from "react";
import {ForkModuleDataConfirmation} from "./ForkModuleDataConfirmation";
import {ModuleDataDetailedView} from "./moduledatadetail/ModuleDataDetailedView";
import {ModuleData} from "./moduledatadetail/ModuleData";
import {Module} from "../module/Module";
import * as Config from "Config";
import {CpuGateway} from "./moduledatadetail/cpu/CpuGateway";
import * as Backbone from "backbone";


interface ModuleDataViewProps {
    editableModuleData?: ModuleData | null;
    savedForkModules: Module[];

    cpuGateway: CpuGateway;

    closeDialog: () => void;

    isForkedModule: boolean;
    forkConfirmation: boolean; //check if the user fork the module directly
    isLoading: boolean;
}

interface ModuleDataViewState {
    savedForkModules: Module[];
    dataToFork: ModuleData | null;
    isLoading: boolean;
}

export class ModuleDataView extends React.Component<ModuleDataViewProps, ModuleDataViewState> {

    constructor(props: ModuleDataViewProps) {
        super(props);
        this.state = {
            savedForkModules: props.savedForkModules,
            dataToFork: this.props.forkConfirmation ? this.props.editableModuleData : null,
            isLoading: this.props.isLoading,
        };
    }

    componentWillReceiveProps(nextProps: Readonly<ModuleDataViewProps>, nextContext: any) {
        if (nextProps.forkConfirmation && !this.state.dataToFork) {
            this.setState({dataToFork: nextProps.editableModuleData});
        }
        this.setState({isLoading: nextProps.isLoading});
    }

    componentDidMount() {
        if (this.props.forkConfirmation && !this.state.dataToFork) {
            this.setState({dataToFork: this.props.editableModuleData});
        }
    }

    render(): JSX.Element {

        return (
            <main className="row">
                {!this.state.isLoading && this.readonlyModuleDataView}
                {this.state.dataToFork && this.forkConfirmationWindow}
                {this.state.isLoading && this.loader}
            </main>
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

    private get readonlyModuleDataView(): JSX.Element {
        return (
            <ModuleDataDetailedView data={this.props.editableModuleData}
                                    availableBusTemplates={[]}
                                    isReadonly={true}
                                    onClickSyncData={() => {
                                    }}
                                    onClickFork={() => this.setState({dataToFork: this.props.editableModuleData})}
                                    cpuGateway={this.props.cpuGateway}
                                    closeDialog={() => this.props.closeDialog()}
                                    onModuleEditTab={false}/>
        );
    }

    private get forkConfirmationWindow(): JSX.Element {
        return (
            <div className="profile-creation-window-container"
                 onClick={() => this.onClickCloseWindow()}>
                <div onClick={event => event.stopPropagation()}>
                    <ForkModuleDataConfirmation
                        baseModuleId={this.props.editableModuleData.id}
                        moduleName={this.props.editableModuleData.name}
                        onForkCreated={(name, module) => this.onForkCreated(name, module)}
                        onClickClose={() => this.onClickCloseWindow()}
                        existingForkNames={this.props.savedForkModules.map(f => f.name)}
                        isForkedModule={this.props.isForkedModule}/>
                </div>
            </div>
        )
    }

    private onClickCloseWindow(): void {
        this.setState({
            dataToFork: null,
        });
    }

    private onForkCreated(name: string, module: Module): void {
        this.state.savedForkModules.push(module);
        this.props.closeDialog();
        this.setState({
            dataToFork: null
        });
        Backbone.history.navigate(`!/module-edit/${this.state.savedForkModules.slice(-1)[0].revisionId}`, true);
    }
}
