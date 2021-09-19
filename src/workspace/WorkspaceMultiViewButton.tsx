import * as React from "react";
import {CAD_VIEW, OPEN_BUILDER, RESET_FUNCTIONAL_VIEW, UPVERTER_VIEW} from "./events";
import events from "../utils/events";
import eventDispatcher from "../utils/events";
import {DesignRevision} from "../design/DesignRevision";
import {FeatureFlag} from "../auth/FeatureFlag";
import userController from "../auth/UserController";
import {CompiledCadSourceJob} from "../compiledcadsource/CompiledCadSourceJob";
import {openCompiledCadDialog} from "../compiledcadsource/CompiledCadDialog";
import {CURRENT_DESIGN_SET} from "../design/events";
import {USER_CHANGED} from "../auth/events";
import {CompiledCadSourceJobController} from "../compiledcadsource/CompiledCadSourceJobController";
import {HELP} from "../toolbar/events";
import {UserManualTab} from "../help/UserManual";

interface WorkspaceMultiViewButtonProps {
    currentDesign: DesignRevision,
    compiledCadJob: CompiledCadSourceJob | null;
}

interface WorkspaceMultiViewButtonState {
    currentSelection: string;
}

export class WorkspaceMultiViewButton extends React.Component<WorkspaceMultiViewButtonProps, WorkspaceMultiViewButtonState> {
    public static GEPPETTO = 'geppetto';
    public static UPVERTER = 'upverter';
    public static CAD_VIEWER = 'cad_viewer';
    static ERROR_MESSAGE = {
        requireSave: 'Please save your design first.',
        requireNonEmpty: 'Unavailable to render empty design.',
    };
    private currentDesign;

    constructor(props: WorkspaceMultiViewButtonProps) {
        super(props);
        this.state = {
            currentSelection: WorkspaceMultiViewButton.GEPPETTO,
        };

        this.props.currentDesign ? this.currentDesign = this.props.currentDesign : null;
        eventDispatcher.subscribe(CURRENT_DESIGN_SET, () => this.switchView(WorkspaceMultiViewButton.GEPPETTO));
        eventDispatcher.subscribe(OPEN_BUILDER, () => this.switchView(WorkspaceMultiViewButton.GEPPETTO));
        eventDispatcher.subscribe(USER_CHANGED, () => this.switchView(WorkspaceMultiViewButton.GEPPETTO));
    }

    componentWillReceiveProps(nextProps: Readonly<WorkspaceMultiViewButtonProps>, nextContext: any) {
        this.currentDesign = nextProps.currentDesign;
    }

    render() {
        const user = userController.getUser();
        const displayedButtons = [];
        let buttonSequence = 1;
        let buttonSequenceClass = '';
        let errorMessage = '';

        const newViewButtonUI = user.isFeatureEnabled(FeatureFlag.WORKSPACE_MULTI_VIEWS);

        viewButtons().forEach((button, i) => {
            if (button.featureFlag && !user.isFeatureEnabled(button.featureFlag)) return;

            if (button.selection === this.state.currentSelection) {
                buttonSequenceClass = `multi-view-button-0`;
            } else {
                buttonSequenceClass = `multi-view-button-${buttonSequence}`;
                buttonSequence += 1;
            }

            if (button.selection !== WorkspaceMultiViewButton.GEPPETTO) {
                if (this.isNewDesign) {
                    errorMessage = WorkspaceMultiViewButton.ERROR_MESSAGE.requireSave;
                } else if (this.emptySavedDesign) {
                    errorMessage = WorkspaceMultiViewButton.ERROR_MESSAGE.requireNonEmpty;
                    if (this.currentDesign.getPlacedModules().length > 0) {
                        errorMessage = WorkspaceMultiViewButton.ERROR_MESSAGE.requireSave;
                    }
                } else if (this.currentDesign) {
                    if (this.currentDesign.getPlacedModules().length === 0) {
                        errorMessage = WorkspaceMultiViewButton.ERROR_MESSAGE.requireNonEmpty;
                    } else if (this.unsavedDesign) {
                        errorMessage = WorkspaceMultiViewButton.ERROR_MESSAGE.requireSave;
                    }
                }
            }
            const disabledButtonClass = errorMessage.length > 0 ? 'multi-view-button-disabled' : '';
            const disabledButtonClassNew = errorMessage.length > 0 ? 'multi-view-button-disabled-new' : '';
            const buttonSelectedNew = button.selection === this.state.currentSelection ? 'multi-view-button-selected-new' : '';

            if (newViewButtonUI) {
                return displayedButtons.push(
                    <div key={i}
                         className={`multi-view-button-item-new ${disabledButtonClassNew} ${buttonSelectedNew} ${button.selection}-button-new`}
                         onClick={() => this.switchView(button.selection)}>
                        {errorMessage.length > 0 &&
                        <span className="multi-view-tooltip">{button.name} : {errorMessage}</span>}
                    </div>
                );
            }

            displayedButtons.push(<div key={i}
                                       className={`multi-view-button-item ${buttonSequenceClass} ${disabledButtonClass} ${button.selection}-button`}
                                       onClick={() => this.switchView(button.selection)}>
                {errorMessage.length > 0 &&
                <span className="multi-view-tooltip">{errorMessage}</span>}
                <span className="disabled-bg-cover"></span>
                <h6>{button.name}</h6>
            </div>);
        });

        if (newViewButtonUI) {
            return (
                <div className="multi-view-button-content-new">
                    <h6 onClick={() => events.publish(HELP, {selection: UserManualTab.MULTI_VIEWS})}>Multi View</h6>
                    {displayedButtons}
                </div>
            );
        }

        return (
            <div className="multi-view-button-content">
                {displayedButtons}
            </div>
        );
    }

    private get isNewDesign(): boolean {
        if (this.currentDesign) return this.currentDesign.isNew();
    }

    private get emptySavedDesign(): boolean {
        if (this.currentDesign) return this.currentDesign.emptyOnLastSave();
    }

    private get uncompiledDesign(): boolean {
        if (this.props.compiledCadJob) return false;
        return true;
    }

    private get unsavedDesign(): boolean {
        if (this.currentDesign) return this.currentDesign.isDirty();
    }

    private switchView(type: string): void {
        if (type !== WorkspaceMultiViewButton.GEPPETTO) {
            if (this.isNewDesign) {
                return;
            } else if (this.emptySavedDesign) {
                return;
            } else if (this.currentDesign) {
                if (this.unsavedDesign || this.currentDesign.getPlacedModules() === 0) {
                    return;
                } else if (this.uncompiledDesign) {
                    const controller = CompiledCadSourceJobController.getInstance();
                    const job = controller.job;
                    if (job === null) {
                        controller.startJob();
                    }
                    openCompiledCadDialog(type);
                }
            }
        }

        if (type !== this.state.currentSelection) {
            if (this.state.currentSelection !== WorkspaceMultiViewButton.GEPPETTO) {
                events.publish(RESET_FUNCTIONAL_VIEW, {type: this.state.currentSelection});
            }

            if (type === WorkspaceMultiViewButton.UPVERTER && !this.uncompiledDesign) {
                events.publish(UPVERTER_VIEW);
            } else if (type === WorkspaceMultiViewButton.CAD_VIEWER && !this.uncompiledDesign) {
                events.publish(CAD_VIEW);
            }

            this.setState({currentSelection: type});
        }
    }
}

function viewButtons(): { selection: string; name: string; featureFlag?: FeatureFlag }[] {
    return [
        {
            name: 'Geppetto View',
            selection: WorkspaceMultiViewButton.GEPPETTO,
        },
        {
            name: 'Upverter View',
            selection: WorkspaceMultiViewButton.UPVERTER,
            featureFlag: FeatureFlag.UPVERTER_BOARD_EDIT,
        },
        {
            name: 'Altium View',
            selection: WorkspaceMultiViewButton.CAD_VIEWER,
        },
    ];
}
