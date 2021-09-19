import {Toolbutton, ToolbuttonProps, ToolbuttonState} from "./ToolButton";
import * as React from "react";
import {Subscription} from "rxjs";
import {CompiledCadSourceJobController} from "../../compiledcadsource/CompiledCadSourceJobController";


interface CompiledCadToolbuttonProps extends ToolbuttonProps {
}

interface CompiledCadToolbuttonState extends ToolbuttonState {
    progress: number | null;
}

export class CompiledCadToolbutton extends Toolbutton<CompiledCadToolbuttonProps, CompiledCadToolbuttonState> {
    private subscriptions: Subscription[] = [];

    public constructor(props) {
        super(props);
        this.state = {
            ...this.fetchCompiledCadSourceJobControllerState(),
        };
    }

    private fetchCompiledCadSourceJobControllerState(): CompiledCadToolbuttonState {
        const job = CompiledCadSourceJobController.getInstance().job;
        return {
            progress: (job && !job.isInFinalState) ? job.progress : null,
        }
    }

    public componentDidMount() {
        this.subscriptions.push(CompiledCadSourceJobController.getInstance().subscribe(() => {
            this.setState(this.fetchCompiledCadSourceJobControllerState);
        }));
    }

    public componentWillUnmount() {
        this.subscriptions.forEach(
            subscription => subscription.unsubscribe());
        this.subscriptions = [];
    }

    private get isInProgress(): boolean {
        return this.state.progress !== null;
    }

    protected get isActive(): boolean {
        return this.props.checkActive || this.isInProgress;
    }

    public render(): React.ReactNode {
        if (!this.isVisible) {
            return null;
        }
        const id = `${this.props.id}-icon`;
        const activeClass = this.isActive ? 'active-js' : '';
        return (
            <button id={this.props.id}
                    disabled={this.isDisabled}
                    title={this.tooltip}
                    onClick={() => this.onClick()}
                    className={`${activeClass} toolbar-button`}>
                <span id={id} className="toolbar-icon">
                </span>
                {
                    !this.isInProgress &&
                    <span className="toolbar-text">
                        {this.props.title}
                    </span>
                }
                {
                    this.isInProgress &&
                    <div className="progress">
                        <div className="bar" style={{width: this.state.progress + '%' }} />
                    </div>
                }
            </button>
        );
    }
}