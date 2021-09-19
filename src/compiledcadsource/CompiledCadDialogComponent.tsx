import * as React from "react";
import {Subscription} from "rxjs";
import {CompiledCadSourceJob} from "./CompiledCadSourceJob";
import {CompiledCadSourceJobController} from "./CompiledCadSourceJobController";
import {DesignRevision} from "../design/DesignRevision";
import {WorkspaceMultiViewButton} from "../workspace/WorkspaceMultiViewButton";
import {CAD_VIEW, UPVERTER_VIEW} from "../workspace/events";
import events from "../utils/events";


interface CompiledCadDialogComponentProps {
    designRevision: DesignRevision, // User cannot change the design when dialog is opened.
    closeDialog?: () => void,
    renderType: string | null,
}

interface CompiledCadDialogComponentState {
    job: CompiledCadSourceJob | null, // These are immutable.
    isJobOutOfDate: boolean,
}


export class CompiledCadDialogComponent
    extends React.Component<CompiledCadDialogComponentProps, CompiledCadDialogComponentState> {

    private subscriptions: Subscription[] = [];

    public constructor(props) {
        super(props);
        this.state = {
            ...this.fetchCompiledCadSourceJobControllerState(),
        };
    }

    private fetchCompiledCadSourceJobControllerState(): CompiledCadDialogComponentState {
        return {
            job: CompiledCadSourceJobController.getInstance().job,
            isJobOutOfDate: CompiledCadSourceJobController.getInstance().isJobOutOfDate,
        }
    }

    public componentDidMount() {
        this.subscriptions.push(CompiledCadSourceJobController.getInstance().subscribe(() => {
            this.setState(this.fetchCompiledCadSourceJobControllerState);
        }));
        this.onClickCompileDesign();
    }

    public componentWillUnmount() {
        this.subscriptions.forEach(
            subscription => subscription.unsubscribe());
        this.subscriptions = [];
    }


    // COMPILE DESIGN BUTTON
    public onClickCompileDesign(): void {
        const controller = CompiledCadSourceJobController.getInstance();
        if (controller.isJobOutOfDate) {
            CompiledCadSourceJobController.getInstance().startJob();
        }
        this.openSelectedTab();
    }

    public compileDesignError(): string | null {
        const design = this.props.designRevision;
        if (design && !design.isNew() && !design.isDirty()) {
            return null;
        }
        return 'Please save your design first.';
    }

    public compileDesignProgress(): number | null {
        const job = this.state.job;
        return (job && !job.isInFinalState) ? job.progress : null;
    }

    public compileDesignIsInProgress(): boolean {
        return this.compileDesignProgress() !== null;
    }

    // Redirect after compilation
    private openSelectedTab(): void {
        const job = this.state.job;
        if (job && job.isInFinalState && !this.compileDesignIsInProgress()) {
            if (this.props.renderType === WorkspaceMultiViewButton.UPVERTER) {
                events.publish(UPVERTER_VIEW);
            } else if (this.props.renderType === WorkspaceMultiViewButton.CAD_VIEWER) {
                events.publish(CAD_VIEW);
            }
            if (this.props.closeDialog) {
                this.props.closeDialog();
            }
        } else {
            this.checkIfFinalState();
        }
    }

    private checkIfFinalState(): void {
        const checkIfCompilingFinished = setInterval(() => {
            if(this.state.job && this.state.job.isInFinalState){
                this.openSelectedTab();
                clearInterval(checkIfCompilingFinished);
            }
        }, 1000);
    }

    public render(): React.ReactNode {
        return (
            <div className="compiled-cad-dialog-body">
                {this.compileDesignIsInProgress() &&
                    <>
                        <h3>Compiling Design...</h3>
                        <div className="progress">
                            <div className="bar" style={{width: this.compileDesignProgress() + '%'}}/>
                        </div>
                        <p>Selected view will show up after compilation.</p>
                    </>
                }
                { this.props.closeDialog &&
                    <div className="accept-compile-button-div">
                        <button className="accept-compile-button" onClick={() => this.props.closeDialog()}>Close
                        </button>
                    </div>
                }
            </div>
        );
    }
}
