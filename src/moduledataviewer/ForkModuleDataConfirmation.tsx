import * as React from "react";
import {getSkulessModuleGateway} from "../module/skuless/SkulessModuleGateway";
import {ServerID} from "../model/types";
import {Module} from "../module/Module";
import eventDispatcher from "../utils/events";
import {ModuleEvent, SKULESS_MODULE_SAVED} from "../module/events";

interface ForkModuleDataConfirmationProps {
    baseModuleId: ServerID;
    moduleName: string;
    onForkCreated: (name: string, module: Module) => void;
    onClickClose: () => void;
    existingForkNames: string[];
    isForkedModule: boolean;
}

interface ForkModuleDataConfirmationState {
    name: string;
    errors: string[];
    isLoading: boolean;
}

export class ForkModuleDataConfirmation extends React.Component<ForkModuleDataConfirmationProps, ForkModuleDataConfirmationState> {
    constructor(props: ForkModuleDataConfirmationProps) {
        super(props);

        this.state = {
            name: '',
            errors: [],
            isLoading: false
        }
    }

    render() {
        return (
            <section className="confirmation-window">
                <h3>Fork {this.props.moduleName}</h3>
                <button type="button"
                        className="close-btn"
                        onClick={this.props.onClickClose}
                        disabled={this.state.isLoading}/>
                <p>Create a customizable copy of the CAD-derived data (Buses, Nets) and
                    add it to your module data library.</p>
                {!this.props.isForkedModule &&
                <label>
                    <span className="field-header required-input">Name</span>
                    <input type="text"
                           placeholder="Give this copy a distinct name..."
                           onChange={event => this.onInputName(event)}/>
                </label>
                }
                {this.props.isForkedModule &&
                    <p className="unavailable-message">Copying/Forking modules from Customized Module/Upverter is not supported at this time.</p>
                }
                <div className="profile-creation-window__button-container">
                    {this.isDuplicateName && <div className="error">You already have a fork with this name.</div>}
                    {this.state.errors.map(e => <div className="error">{e}</div>)}
                    <button type="button"
                            className={"cta"}
                            onClick={() => this.onClickConfirm()}
                            disabled={!this.state.name || this.isDuplicateName || this.state.isLoading}>
                        {this.state.isLoading ? 'Generating...' : 'Create Copy'}
                    </button>
                </div>
            </section>
        )
    }

    private onClickConfirm(): void {
        this.setState({
            isLoading: true
        });
        const skulessModuleGate = getSkulessModuleGateway();
        skulessModuleGate.create(this.state.name, this.props.baseModuleId)
            .done(module => this.onModuleSaved(module))
            .fail(xhr => this.showResponseErrors(xhr.responseJSON));
    }

    private showResponseErrors(errorData: any): void {
        if (errorData && errorData.errors) {
            this.setState({
                errors: errorData.errors,
                isLoading: false
            });
        } else {
            this.setState({
                errors: ['Unknown server error. Please try again later.'],
                isLoading: false
            });
        }
    }

    private onModuleSaved(module: Module): void {
        this.setState({
            isLoading: false
        });
        eventDispatcher.publishEvent(SKULESS_MODULE_SAVED, {model: module} as ModuleEvent);
        this.props.onForkCreated(this.state.name, module);
    }

    private get isDuplicateName(): boolean {
        return this.props.existingForkNames.indexOf(this.state.name) > -1;
    }

    private onInputName(event): void {
        this.setState({
            name: event.target.value,
        });
    }
}
