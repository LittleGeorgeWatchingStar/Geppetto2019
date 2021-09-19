import * as React from "react";
import {Workspace} from "../../workspace/Workspace";
import {DesignController} from "../DesignController";
import {DimensionToolbuttonLockTooltipController} from "../../toolbar/toolbutton/DimensionToolbuttonLockTooltipController";
import {DimensionCollectionEventsController} from "../../dimension/DimensionCollectionEventsController";
import {DimensionEventsController} from "../../dimension/DimensionEventsController";
import {Subscription} from "rxjs";
import {ReactNode} from "react";

export enum WorkspaceModes {
    SELECT = 'select',
    CONNECT = 'connect',
    DIMENSION = 'dimension'
}

interface WorkspaceModeProps {
    workspace: Workspace
}

interface WorkspaceModeState {
    isWidgetOpen: boolean;
    selectedMode: string;
    showLockIcon: boolean;
    showLockTooltip: boolean;
}

export class WorkspaceMode extends React.Component<WorkspaceModeProps, WorkspaceModeState> {
    private subscriptions: Subscription[] = [];

    constructor(props: WorkspaceModeProps) {
        super(props);
        this.state = {
            isWidgetOpen: true,
            selectedMode: WorkspaceModes.CONNECT,
            ...this.fetchDimensionLockState(),
            ...this.fetchDimensionLockTooltipState(),
        }
    }

    private fetchDimensionLockState(): Pick<WorkspaceModeState, 'showLockIcon'> {
        const designRev = DesignController.getCurrentDesign();

        const showLockIcon = designRev ?
            designRev.dimensions.some(dimension => {
                return dimension.isLockedByUser() ||
                    (!dimension.isLocked() && !dimension.canResize()); // Implicitly locked.
            }) :
            false;

        return {
            showLockIcon: showLockIcon,
        }
    }

    private fetchDimensionLockTooltipState(): Pick<WorkspaceModeState, 'showLockTooltip'> {
        return {
            showLockTooltip: DimensionToolbuttonLockTooltipController.getInstance().showLockTooltip,
        }
    }

    public componentDidMount(): void {
        this.subscriptions.push(
            DimensionCollectionEventsController.getInstance()
                .subscribe(() => {
                    this.setState(this.fetchDimensionLockState);
                })
        );

        this.subscriptions.push(
            DimensionEventsController.getInstance()
                .subscribeAll(() => {
                    this.setState(this.fetchDimensionLockState);
                })
        );

        this.subscriptions.push(
            DimensionToolbuttonLockTooltipController.getInstance()
                .subscribe(() => {
                    this.setState(this.fetchDimensionLockTooltipState);
                })
        );
    }

    public componentWillUnmount(): void {
        this.subscriptions.forEach(
            subscription => subscription.unsubscribe());
        this.subscriptions = [];
    }

    render(): ReactNode {
        const isCollapsed = !this.state.isWidgetOpen ? 'workspace-mode-collapsed' : '';

        return (
            <div className={`workspace-mode workspace-widget ${isCollapsed}`}>
                <div className='header'>
                    <span>Mode Selection</span>
                    <button onClick={() => this.setOpen(false)}
                            className='widget-close-button'
                            title='Minimizing Workspace Selection'>
                    </button>
                </div>
                <div className='container'>
                    <div id='select-mode'
                         className={`mode-toggle ${this.state.selectedMode === WorkspaceModes.SELECT ? 'mode-toggle-on' : ''}`}
                         title='Changing the select mode'
                         onClick={() => this.onClick(WorkspaceModes.SELECT)}>
                        <span className='icon'/>
                        <p>Select<br/>Mode</p>
                    </div>
                    <div id='connect-mode'
                         className={`mode-toggle ${this.state.selectedMode === WorkspaceModes.CONNECT ? 'mode-toggle-on' : ''}`}
                         title='Changing the connect mode'
                         onClick={() => this.onClick(WorkspaceModes.CONNECT)}>
                        <span className='icon'/>
                        <p>Connect<br/>Mode</p>
                    </div>
                    <div id='dimension-mode'
                         className={`mode-toggle ${this.state.selectedMode === WorkspaceModes.DIMENSION ? 'mode-toggle-on' : ''}`}
                         title='Changing the dimension mode'
                         onClick={() => this.onClick(WorkspaceModes.DIMENSION)}>
                        <span className='icon'/>
                        <p>Dimension<br/>Mode</p>
                        {this.state.showLockIcon && <span className="lock-icon"/>}
                        {this.state.showLockTooltip && this.state.selectedMode !== WorkspaceModes.DIMENSION &&
                        <div className='dimension-warning'>
                            Locked
                        </div>
                        }
                    </div>
                    {!this.state.isWidgetOpen &&
                    <button className="expand-icon" title="Expand to detail mode view"
                            onClick={() => this.setState({isWidgetOpen: true})}/>
                    }
                </div>
            </div>
        );
    }

    private onClick(mode: string): void {
        if (this.state.selectedMode === WorkspaceModes.SELECT) {
            if (mode === WorkspaceModes.CONNECT) {
                this.props.workspace.toggleConnecting();
                return this.setState({selectedMode: WorkspaceModes.CONNECT});
            } else if (mode === WorkspaceModes.DIMENSION) {
                this.props.workspace.toggleDimensioning();
                return this.setState({selectedMode: WorkspaceModes.DIMENSION});
            }
        }
        if (this.state.selectedMode === WorkspaceModes.CONNECT) {
            if (mode === WorkspaceModes.SELECT) {
                this.props.workspace.toggleConnecting();
                return this.setState({selectedMode: WorkspaceModes.SELECT});
            } else if (mode === WorkspaceModes.DIMENSION) {
                this.props.workspace.toggleDimensioning();
                return this.setState({selectedMode: WorkspaceModes.DIMENSION});
            }
        }
        if (this.state.selectedMode === WorkspaceModes.DIMENSION) {
            if (mode === WorkspaceModes.SELECT) {
                this.props.workspace.toggleDimensioning();
                return this.setState({selectedMode: WorkspaceModes.SELECT});
            } else if (mode === WorkspaceModes.CONNECT) {
                this.props.workspace.toggleConnecting();
                return this.setState({selectedMode: WorkspaceModes.CONNECT});
            }
        }
    }

    private setOpen(isOpen: boolean): void {
        this.setState({
            isWidgetOpen: isOpen
        });
    }
}