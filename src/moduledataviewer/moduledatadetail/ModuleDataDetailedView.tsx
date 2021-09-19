import * as React from "react";
import {ModuleData} from "./ModuleData";
import events from "../../utils/events";
import {SHOW_IN_LIBRARY_CLICK, ShowInLibraryEvent} from "../../view/librarypanel/events";
import {BusTemplate} from "../../module/custom/BusTemplate";
import {CpuGateway} from "./cpu/CpuGateway";
import {ModuleDataRequiresTab} from "./customizablebus/RequiresTab";
import {ModuleDataProvidesTab} from "./customizablebus/ProvidesTab";
import {UpverterEditorComponent} from "../../upverterviewer/UpverterEditorComponent";
import {UpverterEditorTool} from "../../upverterviewer/UpverterEditorTab";
import * as Backbone from "backbone";

enum CadDerivedTabs {
    SCHEMATIC = 'Schematic',
    REQUIRES = 'Require Buses',
    PROVIDES = 'Provide Buses',
    PARTS = 'Parts',
    LAYOUT = 'Layout',
    FOOTPRINT = 'Footprint'
}

interface ModuleDataEditorProps {
    data: ModuleData;

    // A module's default CAD-derived data is read-only.
    isReadonly: boolean;

    onClickSyncData: () => void;
    onClickFork: (data: ModuleData) => void;
    availableBusTemplates: BusTemplate[];
    cpuGateway: CpuGateway;
    closeDialog: () => void;
    onModuleEditTab: boolean;
}

interface ModuleDataEditorState {
    selectedTab: CadDerivedTabs;
    isNetsListShow: boolean;
}

export class ModuleDataDetailedView extends React.Component<ModuleDataEditorProps, ModuleDataEditorState> {

    constructor(props: ModuleDataEditorProps) {
        super(props);
        this.state = {
            selectedTab: CadDerivedTabs.REQUIRES,
            isNetsListShow: false,
        };
    }

    render(): JSX.Element {
        const makeTabButton = tab => (
            <div key={tab} className={`editable-data__tab-button ${(this.isSelectedTab(tab) ? ' selected-js' : '')}`}
                 onClick={() => this.onSelectTab(tab)}>{tab}</div>
        );
        return (
            <section className={"cad-data-editor__data"}>
                <div className={"header-container"}>
                    <h2>{this.props.data.name}</h2>
                </div>
                <div className={"data-content"}>
                    <div className={"editable-data__cad-data-container"}>
                        <div className="module-data-detail-button-container">
                            {!this.props.isReadonly &&
                            <button type="button"
                                    className="sync-data-btn"
                                    title="Sync data from Upverter"
                                    onClick={() => this.props.onClickSyncData()}>
                                Sync data
                            </button>}
                            <button type="button"
                                    className="fork-btn"
                                    onClick={() => this.onClickFork()}>
                                Customize Module
                            </button>
                            <button type="button"
                                    className="show-in-lib-btn"
                                    onClick={() => this.onClickShowInLibrary()}>
                                Show in Library
                            </button>
                            {!this.state.isNetsListShow &&
                            <button type="button"
                                    className="nets-list-btn"
                                    onClick={() => this.setState({isNetsListShow: true})}>
                                Nets List
                            </button>}
                        </div>
                        <div className="editable-data__tab-button-container">
                            {Object.keys(CadDerivedTabs).map(k => makeTabButton(CadDerivedTabs[k]))}
                        </div>
                        <div className="editable-data__tabs">
                            <div className="editable-data__tab">
                                {this.isSelectedTab(CadDerivedTabs.SCHEMATIC) && this.schematicTab}
                                {this.isSelectedTab(CadDerivedTabs.REQUIRES) && this.requireBusTab}
                                {this.isSelectedTab(CadDerivedTabs.PROVIDES) && this.provideBusTab}
                                {this.isSelectedTab(CadDerivedTabs.PARTS) && this.partsTab}
                                {this.isSelectedTab(CadDerivedTabs.LAYOUT) && this.layoutTab}
                                {this.isSelectedTab(CadDerivedTabs.FOOTPRINT) && this.footprintTab}
                            </div>
                        </div>
                    </div>
                    {this.state.isNetsListShow &&
                    <section className="nets-list">
                        <div className="nets-list-header">
                            <h3>Nets ({this.props.data.nets.length})</h3>
                            <span className="hide-nets-list" onClick={() => this.setState({
                                isNetsListShow: false
                            })}/>
                        </div>
                        <div className="nets-list-container">
                            <ul className="nets-list">
                                {this.props.data.nets.map(n => <li key={n}>{n}</li>)}
                            </ul>
                        </div>
                    </section>
                    }
                </div>
            </section>
        )
    }

    private get schematicTab(): JSX.Element {
        return (
            <div className="schematic-tab">
                <div className="iframe-container">
                    <UpverterEditorComponent cadSourceId={this.props.data.cadSource.id}
                                             tool={UpverterEditorTool.SCHEMATIC}
                                             isReadonly={this.props.isReadonly && !this.props.data.isFork}/>
                </div>
            </div>
        );
    }

    private get layoutTab(): JSX.Element {
        return (
            <div className="layout-tab">
                <div className="iframe-container">
                    <UpverterEditorComponent cadSourceId={this.props.data.cadSource.id}
                                             tool={UpverterEditorTool.LAYOUT}
                                             isReadonly={this.props.isReadonly && !this.props.data.isFork}/>
                </div>
            </div>
        );

    }

    private get requireBusTab(): JSX.Element {
        return <ModuleDataRequiresTab isReadonly={this.props.isReadonly}
                                      data={this.props.data}
                                      availableBusTemplates={this.props.availableBusTemplates}/>
    }

    private get provideBusTab(): JSX.Element {
        return <ModuleDataProvidesTab isReadonly={this.props.isReadonly}
                                      data={this.props.data}
                                      availableBusTemplates={this.props.availableBusTemplates}
                                      cpuGateway={this.props.cpuGateway}/>
    }

    private onClickFork(): void {
        this.props.onClickFork(this.props.data);
    }

    private onClickShowInLibrary(): void {
        if (this.props.onModuleEditTab) Backbone.history.navigate(`!/workspace/`, true);

        events.publishEvent(SHOW_IN_LIBRARY_CLICK, {
            moduleName: this.props.data.name,
            moduleId: this.props.data.id,
        } as ShowInLibraryEvent);
        this.props.closeDialog();
    }

    private get partsTab(): JSX.Element {
        return (
            <div className="parts-tab">
                <div className="header-container row">
                    <h3>Parts ({this.props.data.parts.length})</h3>
                </div>
                <table className="parts-tab__parts-table">
                    <thead>
                    <tr>
                        <th>Package</th>
                        <th>Value</th>
                        <th>Designators</th>
                        <th>MPN</th>
                        <th>Datasheet</th>
                    </tr>
                    </thead>
                    <tbody>
                    {
                        this.props.data.parts.map(p => (
                            <tr key={p.package}>
                                <td>{p.package}</td>
                                <td>{p.value} </td>
                                <td>
                                    {
                                        p.designators.map(d => (
                                            <div key={d} className="designator">{d}</div>
                                        ))
                                    }
                                </td>
                                <td>{p.mpn}</td>
                                <td>
                                    {p.mpn
                                    && <a href={`https://octopart.com/search?q=${p.mpn}`}
                                          target="_blank">
                                        Octopart↗
                                    </a>}
                                </td>
                            </tr>
                        ))
                    }
                    </tbody>
                </table>
            </div>
        );
    }

    private get footprintTab(): JSX.Element {
        const features = this.props.data.features;
        const polylines = features.footprint().polylines;
        const footprintPathD = polylines.map(polyline => polyline.svgPath()).join(' ');
        const outline = features.outline();
        const largeModule = outline.width > 300 || outline.height > 250 ? "large-module-svg" : ""; //the value is selected temporarily

        return (
            <div className={`module-svg-container ${largeModule}`}>
                <svg xmlns="http://www.w3.org/2000/svg"
                     viewBox={`${outline.xmin} ${outline.ymin} ${outline.width} ${outline.height}`}
                     preserveAspectRatio="xMinYMin meet">
                    <g transform={`translate(0, ${outline.mirror / 3}) scale(0.33, -0.33)`}>
                        <path className="footprint" d={footprintPathD}/>
                        {features.map(f =>
                            <line className={f.type}
                                  key={f.id}
                                  x1={f.points[0].x}
                                  y1={f.points[0].y}
                                  x2={f.points[1].x}
                                  y2={f.points[1].y}/>)
                        }
                    </g>
                </svg>
            </div>
        );
    }

    private onSelectTab(tab: CadDerivedTabs): void {
        this.setState({
            selectedTab: tab
        });
    }

    private isSelectedTab(tab: CadDerivedTabs): boolean {
        return this.state.selectedTab === tab;
    }
}
