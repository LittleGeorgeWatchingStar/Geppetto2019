import * as React from "react";
import {RefObject} from "react";
import {CustomerBus, CustomerBusType} from "../CustomerBus";
import {CustomerModuleCreate} from "../CustomerModuleCreate";

interface RenameBusViewProps {
    bus: CustomerBus;
    customerModuleCreate: CustomerModuleCreate;
    onClose: () => void;
    onSave: (name: string) => void;
}

interface RenameBusViewState {
    newName: string;
    error: string | null;
}

export class RenameBusView extends React.Component<RenameBusViewProps, RenameBusViewState> {

    private readonly input: RefObject<HTMLInputElement>;

    constructor(props: RenameBusViewProps) {
        super(props);
        this.input = React.createRef<HTMLInputElement>();
        this.state = {
            newName: this.props.bus.name,
            error: null,
        };
    }

    componentDidMount(): void {
        this.input.current.focus();
    }

    public updateNewName(event): void {
        this.setState({
            newName: event.target.value,
            error: this.getError(event.target.value),
        });
    }

    public getError(busName: string): string | null {
        if (busName.length < 2) {
            return 'Bus name must be 2 or more characters.'
        }

        if (busName.length > 100) {
            return 'Bus name must be 100 or less characters.'
        }

        const pattern = /^[^\x22'`]{2,100}$/;
        if (!pattern.test(busName)) {
            return 'Bus name contains invalid characters.'
        }

        const buses = this.props.customerModuleCreate.getBuses();
        if (buses.filter(bus => bus.type === this.props.bus.type && bus !== this.props.bus)
                .find(bus => bus.name === busName)) {
            return `This name is already in use by another ${this.props.bus.type === CustomerBusType.REQUIRE ? 'input' : 'output'} bus.`;
        }
        return null;
    }

    public onSave(): void {
        if (this.state.error) {
            return;
        }
        this.props.onSave(this.state.newName);
    }

    render(): JSX.Element {
        return (
            <section className="customer-bus-rename">
                <div className="header-container">
                    <button type="button"
                            className="close-btn"
                            onClick={this.props.onClose}/>
                        <h3>Rename Bus "{this.props.bus.name}"</h3>
                </div>
                <div className="body-container">
                    <form onSubmit={() => this.onSave()}>

                        <label>New Bus Name:</label>
                        <div className="input-container">
                            <input ref={this.input}
                                   className={this.state.error ? 'error' : ''}
                                   type="text"
                                   value={this.state.newName} onChange={event => {this.updateNewName(event)}}/>
                            {
                                this.state.error &&
                                <div className="error"
                                     data-test="renameErrorMessage">{this.state.error}</div>
                            }
                        </div>
                        <div className="buttons-container">
                            <button type="submit"
                                    className="rename-bus cta"
                                    data-test="renameBusButton"
                                    disabled={this.state.error !== null}>Rename</button>
                        </div>
                    </form>

                </div>
            </section>
        )
    }
}
