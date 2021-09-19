import * as React from "react";
import {ProvideSignal, RequireSignal} from "./AssignableSignal";

interface SignalEditorProps {
    signal: RequireSignal | ProvideSignal;
    onClickClose: () => void;
    nets: string[];
    onAssignNet: () => void;
}

export class SignalEditor extends React.Component<SignalEditorProps> {

    render() {
        const signal = this.props.signal;
        return (
            <div>
                <button type="button"
                        className="close-btn"
                        onClick={this.props.onClickClose}/>
                <section className="signal-editor">
                    <div className="signal-name">Assign {signal.name}</div>
                    <ul className="signal-editor__nets-list">
                        <li onClick={() => this.onClickUnassign()}>
                            <i>Unassign</i>
                        </li>
                        {this.props.nets.map(n =>
                            <li key={n}
                                 className={signal.getValue() === n ? 'selected-js' : ''}
                                 onClick={() => this.onSelectNet(n)}>{n}</li>)
                        }
                    </ul>

                </section>
            </div>
        )
    }

    private onSelectNet(net: string) {
        this.props.signal.reassign(net);
        this.props.onAssignNet();
    }

    private onClickUnassign(): void {
        this.props.signal.reassign(null);
        this.props.onAssignNet();
    }
}
