import * as React from "react";
import {Workspace} from "../../workspace/Workspace";
import {PlacedModule} from "../../placedmodule/PlacedModule";
import {Connection} from "../../connection/Connection";

interface PowerTreeProps {
    rootPowerProviders: PlacedModule[];
    workspace: Workspace;
}

interface PowerTreeState {
    isCollapse: boolean;
}

export class PowerTree extends React.Component<PowerTreeProps, PowerTreeState> {

    constructor(props: PowerTreeProps) {
        super(props);
        this.state = {
            isCollapse: true,
        }
    }

    render(): JSX.Element {
        const modules = this.props.rootPowerProviders
            .filter(pm => pm.downstreamPowerDraw > 0);

        const collapseClass = !this.state.isCollapse && modules.length > 0 ? 'power-tree-expanded' : '';

        return (
            <>
                {!this.props.workspace.isPowerActive &&
                <button onClick={() => this.props.workspace.togglePowerActive()}
                        className="power-tree-open-button workspace-widget-button"
                        title="Open power consumption list for current design">
                </button>}
                {this.props.workspace.isPowerActive &&
                <div className="workspace-widget power-tree-widget" id={collapseClass}>
                    <div className="header">
                        <span>Power Consumption</span>
                        <button onClick={() => this.props.workspace.togglePowerActive()}
                                className="widget-close-button"
                                title="Hide power consumption list">
                        </button>
                    </div>
                    {modules.length > 0 && this.state.isCollapse &&
                    <button className="collapse-control"
                            onClick={() => this.toggleCollapse()}
                            title="Expand to detail view">
                    </button>}
                    {modules.length > 0 && !this.state.isCollapse &&
                    <button className="collapse-control-expanded"
                            onClick={() => this.toggleCollapse()}
                            title="Collapse the detail view">
                    </button>}
                    <div className="container power-tree-list-container">
                        {this.state.isCollapse && this.collapsedView(modules)}
                        {!this.state.isCollapse && this.fullChartView(modules)}
                        <div className="power-tree-total">
                            Total: {this.getTotalPower()} mW
                        </div>
                    </div>
                </div>}
            </>
        );
    }

    private collapsedView(modules: PlacedModule[]): JSX.Element {
        const chart = [];
        modules.forEach((module, i) => {
            chart.push(
                <div className="module-power" key={i}>
                    <div className="module-power-label">
                        {module.customName}
                    </div>
                    <div className="module-power-value">
                        {module.downstreamPowerDraw}
                    </div>
                    <div className="spacer"></div>
                </div>
            );
        });

        return (
            <div className="power-tree-collapsed-chart">
                {chart}
            </div>
        );
    }

    private fullChartView(modules: PlacedModule[]): JSX.Element {
        const chart = [];
        modules.forEach((module, i) => {
            chart.push(
                <div key={i}>
                    <div className="module-power">
                        <div className="module-power-label">
                            {module.customName}
                        </div>
                        <div className="module-power-value">
                            {module.downstreamPowerDraw}
                        </div>
                        <div className="spacer"></div>
                    </div>
                    {module.downstreamPowerConnections &&
                    <div className="children">
                        {this.fullChartChildrenView(module.downstreamPowerConnections)}
                    </div>
                    }
                </div>
            );
        });

        return (
            <div className="power-tree-full-chart">
                {chart}
            </div>
        );
    }

    private fullChartChildrenView(connections: Connection[]): JSX.Element {
        const children = [];
        connections.forEach((conn, i) => {
            children.push(
                <div key={i}>
                    <div className="module-power">
                        <div className="module-power-label">
                            {conn.requirerName}
                            {conn.downstreamPowerConnections &&
                            " subtotal"
                            }
                        </div>
                        <div className="module-power-value">
                            {conn.powerDraw}
                        </div>
                        <div className="spacer"></div>
                    </div>
                    {conn.downstreamPowerConnections.length !== 0 &&
                    <div className="children">
                        {conn.requirerOverhead &&
                        <div className="module-power">
                            <div className="module-power-label">
                                {conn.requirerName}
                            </div>
                            <div className="module-power-value">
                                {conn.requirerOverhead}
                            </div>
                            <div className="spacer"></div>
                        </div>}
                        {this.fullChartChildrenView(conn.downstreamPowerConnections)}
                    </div>}
                </div>
            );
        });
        return (
            <>{children}</>
        );
    }

    private getTotalPower(): number {
        let total = 0;
        for (const pm of this.props.rootPowerProviders) {
            total += pm.downstreamPowerDraw;
        }
        return total;
    }

    private toggleCollapse(): void {
        this.setState({
            isCollapse: !this.state.isCollapse,
        });
    }
}