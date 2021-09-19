import * as React from "react";
import {BusResource} from "../../../bus/api";
import {ModuleData} from "../ModuleData";


interface ReadonlyBusProps {
    busType: 'Require' | 'Provide';
    bus: BusResource;
    data: ModuleData;
    onCloseBusEditor: () => void;
}

/**
 * A detailed profile bus view for the default CAD-derived data.
 * The default profile is read-only.
 */
export class ReadonlyBus extends React.Component<ReadonlyBusProps> {

    render() {
        const bus = this.props.bus;
        const type = this.props.busType;
        const functionalityTable = type === 'Provide'
            ? this.provideFunctionalityTable : this.requireFunctionalityTable;
        return (
            <div className="bus-editor readonly-profile-bus">
                <button type="button"
                        className="close-btn"
                        onClick={this.props.onCloseBusEditor}/>
                <section>
                    <h3>{bus.power ? 'Power' : 'Data'} {type} Bus: {bus.name}</h3>
                </section>
                <section>
                    <div>
                        {type} <b>{this.busValue}</b>
                    </div>
                    <div>
                        <span>Voltage Domain: <b>{bus.bus_group.title}</b></span>
                        {bus.bus_group.levels.map(l =>
                            <span key={l}
                                  className="voltage-domain">
                                {l}V
                            </span>)
                        }
                    </div>
                </section>
                <section>
                    <div className="field-header">Functionality</div>
                    {functionalityTable}
                </section>
            </div>
        )
    }

    private get requireFunctionalityTable(): JSX.Element[] {
        return this.props.bus.templates.map(t =>
            <div className="profile-bus-view__bus-template"
                 key={t.id}>
                <span className={"template-name"}>{t.name}</span>
                <table>
                    <thead>
                    <tr>
                        <th>Signal</th>
                        <th>Assigned Net</th>
                    </tr>
                    </thead>
                    <tbody>
                    {
                        t.nets.map((s, i) => (
                                <tr key={i}>
                                    <td>{s.name}</td>
                                    <td>{s.value ? s.value : 'None'}</td>
                                </tr>
                            )
                        )
                    }
                    </tbody>
                </table>
            </div>
        )
    }

    private get provideFunctionalityTable(): JSX.Element[] {
        return this.props.bus.templates.map(t =>
            <div className="profile-bus-view__bus-template"
                 key={t.id}>
                <span className={"template-name"}>{t.name}</span>
                <table>
                    <thead>
                    <tr>
                        <th>Signal</th>
                        <th>Assigned Net</th>
                        <th>CPU Ball</th>
                        <th>Ball Mux</th>
                    </tr>
                    </thead>
                    <tbody>
                    {
                        t.nets.map((s, i) => (
                                <tr key={i}>
                                    <td>{s.name}</td>
                                    <td>{s.value ? s.value : 'None'}</td>
                                    <td>{this.cpuBallName(s.value)}</td>
                                    <td>{this.ballMuxName(s)}</td>
                                </tr>
                            )
                        )
                    }
                    </tbody>
                </table>
            </div>
        )
    }

    private cpuBallName(signalValue: string): string {
        const ball = this.props.data.cpuBallNetMap[signalValue];
        if (ball) {
            return ball.trm_pin_name;
        }
        return '';
    }

    private ballMuxName(signal): string {
        const ball = this.props.data.cpuBallNetMap[signal.value];
        if (ball) {
            const mux = ball.ball_muxes.find(ballMux => ballMux.id === signal.ball_mux);
            if (mux) {
                return mux.trm_signal;
            }
        }
        return '';
    }

    private get busValue(): string {
        const bus = this.props.bus;
        if (bus.power) {
            return `${bus.milliwatts} mW`;
        }
        if (bus.num_connections === 1) {
            return `${bus.num_connections} Data Connection`;
        }
        return `${bus.num_connections} Data Connections`;
    }
}
