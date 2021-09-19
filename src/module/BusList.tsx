import * as React from "react";
import {PlacedModule} from "../placedmodule/PlacedModule";
import {Bus} from "../bus/Bus";
import {ProvideBus} from "../bus/ProvideBus";
import {RequireBus} from "../bus/RequireBus";
import * as ReactDOM from "react-dom";
import {Dialog} from "../view/Dialog";
import events from "../utils/events";
import {CONNECTION_COMPLETE} from "../connection/events";

let dialog = null;

export function openBusListDialog(pm: PlacedModule): void {
    if (dialog) {
        dialog.close();
        dialog = null;
    }
    dialog = new Dialog({
        maxWidth: 500,
        minHeight: 500,
        maxHeight: 600,
        modal: false,
        title: pm.name,
    });
    const render = () => ReactDOM.render(<BusList placedModule={pm}/>, dialog.el);
    dialog.listenTo(events, CONNECTION_COMPLETE, render);
    dialog.$el.addClass('bus-list-dialog');
    render();
}

interface BusListProps {
    placedModule: PlacedModule;
}

interface BusListState {
    query: string;
}

/**
 * Show the require and provide buses of a placed electrical block.
 */
export class BusList extends React.Component<BusListProps, BusListState> {

    constructor(props: BusListProps) {
        super(props);
        this.state = {
            query: ''
        };
        this.setInput = this.setInput.bind(this);
    }

    render() {
        const requiresView = this.requiresView;
        const providesView = this.providesView;
        return (
            <div>
                <div>
                    <input className={"bus-list__search-input"}
                           type={"search"}
                           placeholder={"Search Buses..."}
                           onChange={this.setInput}/>
                </div>
                <div className={"bus-list__buses"}>
                    {requiresView === null && providesView === null &&
                    <p>No results found.</p>
                    }
                    {requiresView}
                    {providesView}
                </div>
            </div>
        );
    }

    private setInput(e): void {
        this.setState({
            query: e.currentTarget.value
        });
    }

    private get requiresView(): JSX.Element | null {
        const requires = this.getRequires();
        if (!requires.length) return null;
        const totalRequires = this.props.placedModule.getRequires().length;
        const reqCount = requires.length === totalRequires ? totalRequires : `${requires.length}/${totalRequires}`;
        return (
            <div className={"bus-list__table-container"}>
                <div className={"bus-list-header"}>
                    Require Buses ({reqCount})
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Consumes</th>
                            <th>Level</th>
                            <th/>
                        </tr>
                    </thead>
                    <tbody>
                    {this.sortNumericallyCollated(requires).map((r: RequireBus) => [
                            <tr key={r.id}>
                                <td>
                                    {r.name}
                                </td>
                                <td>
                                    {r.getDescriptiveString()}
                                </td>
                                <td>
                                    <span>@</span>
                                    {r.getDeterminedLevels().map(level => <span key={level}>{level}v </span>)}
                                </td>
                                <td>
                                    {r.isConnected() && <span title={"Connected"}>✓</span>}
                                </td>
                            </tr>
                        ]
                    )}
                    </tbody>
                </table>
            </div>
        );
    }

    private getRequires(): RequireBus[] {
        return this.props.placedModule.getRequires()
            .filter(r => this.isSearchMatch(r.name));
    }

    private get providesView(): JSX.Element | null {
        const sortedProvides = this.sortProvides();
        const numSorted = sortedProvides.length;
        if (numSorted === 0) return null;
        const totalProvides = this.props.placedModule.getProvides().length;
        const provideCount = numSorted === totalProvides ? totalProvides : `${numSorted}/${totalProvides}`;
        return (
            <div className={"bus-list__table-container"}>
                <div className={"bus-list-header"}>
                    Provide Buses ({provideCount})
                </div>
                {sortedProvides.length > 0 &&
                <table>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Remaining</th>
                            <th>Level</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedProvides.map(p => this.provideView(p))}
                    </tbody>
                </table>
                }
            </div>
        );
    }

    private provideView(p: ProvideBus): JSX.Element {
        return (
            <tr key={p.id}>
                <td>
                    {p.name}
                </td>
                <td>
                    {p.getDescriptiveString()}
                </td>
                <td>
                    <span>@</span>
                    {p.getDeterminedLevels().map(level => <span key={level}>{level}v </span>)}
                </td>
            </tr>
        );
    }

    private sortProvides(): ProvideBus[] {
        const connected = [];
        const unconnected = [];
        for (const provide of this.props.placedModule.getProvides()) {
            if (!this.isSearchMatch(provide.name)) {
                continue;
            }
            if (provide.hasGraphChildren()) {
                connected.push(provide);
            } else {
                unconnected.push(provide);
            }
        }
        return this.sortNumericallyCollated(connected)
            .concat(this.sortNumericallyCollated(unconnected)) as ProvideBus[];
    }

    private isSearchMatch(name: string): boolean {
        return name.toLowerCase().includes(this.state.query.toLowerCase());
    }

    /**
     * Eg. GPIO3 comes before GPIO10.
     */
    private sortNumericallyCollated(buses: Bus[]): Bus[] {
        return buses.sort((a, b) => a.name.localeCompare(b.name, undefined, {numeric: true}));
    }
}
