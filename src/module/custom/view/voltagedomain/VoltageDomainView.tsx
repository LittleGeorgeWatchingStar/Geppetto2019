import * as React from "react";
import {RefObject} from "react";
import {AssignableNet} from "../../AssignableNet";
import {AssignableNetGroup, VoltageLevel} from "../../AssignableNetGroup";
import {AssignableBusColours} from "./AssignableBusColours";
import {NetToPinLine} from "./NetToPinLine";
import {PinPointsView} from "./PinPointsView";
import {CustomerModuleCreate} from "../../CustomerModuleCreate";
import * as $ from "jquery";
import {CustomerBus} from "../../CustomerBus";
import {AssignableSignalsPanel} from "./AssignableSignalsPanel";
import {BusTemplate} from "../../BusTemplate";
import {Signal} from "../../Signal";
import {CustomModuleProgressHelperView} from "./CustomModuleProgressHelperView";
import {NetsTable} from "./NetsTable";

interface VoltageDomainViewProps {
    group: AssignableNetGroup;
    busColours: AssignableBusColours;
    customerModuleCreate: CustomerModuleCreate;
    busTemplates: BusTemplate[];

    /**
     * @see VoltageDomainView.getProgressError
     */
    onSelectDomain: (domain: AssignableNetGroup) => void;
    onClickRenameBus: (bus: CustomerBus) => void;
    onClickRemoveBus: (bus: CustomerBus) => void;
    onSelectBus: (bus: CustomerBus | null) => void;
    onUnassignMandatory: (net: AssignableNet) => void;
    selectedBus: CustomerBus | null;
    onChange: () => void;
}

interface VoltageDomainViewState {
    hoveredPinNumber: string | null;
    isDraggingNet: boolean;
    selectedNet: AssignableNet | null;

    /**
     * The difference between mouseOverNet and dropTargetNet is that the 'Set GND' toggle
     * should not appear for the latter.
     */
    mouseOverNet: AssignableNet | null;
    dropTargetNet: AssignableNet | null;

    hasMounted: boolean;
}

/**
 * Nets of a Custom Module are grouped by voltage domains. This view
 * lists the nets of a particular domain and shows the module SVG graphic.
 */
export class VoltageDomainView extends React.Component<VoltageDomainViewProps, VoltageDomainViewState> {

    /** For drawing lines between Nets (AKA Pins) and PinPoints. pinNo for quick lookup. */
    private readonly pinPointRefs: {[pinNo: string]: RefObject<SVGCircleElement>};

    /** Same as pinpointRefs. */
    private readonly netViewRefs: {[pinNo: string]: RefObject<HTMLDivElement>};

    /** For autoscrolling to a particular net. */
    private readonly pinsContainerRef: RefObject<HTMLDivElement>;

    /** The container element for drawing indicator lines from Nets to Pinpoints. */
    private readonly lineCanvasRef: RefObject<SVGSVGElement>;

    constructor(props) {
        super(props);
        this.pinsContainerRef = React.createRef();
        this.lineCanvasRef = React.createRef();
        this.state = {
            hoveredPinNumber: null,
            mouseOverNet: null,
            isDraggingNet: false,
            dropTargetNet: null,
            selectedNet: null,
            hasMounted: false
        };
        this.netViewRefs = {};
        this.pinPointRefs = {};
        props.customerModuleCreate.moduleViewData.pinPoints
            .forEach(pp => {
                this.netViewRefs[pp.pinNumber] = React.createRef<HTMLDivElement>();
                this.pinPointRefs[pp.pinNumber] = React.createRef<SVGCircleElement>();
            });
    }

    private getNetViewRef(pinNumber: string): RefObject<HTMLDivElement> | undefined {
        return this.netViewRefs[pinNumber];
    }

    private getPinPointRef(pinNumber: string): RefObject<SVGCircleElement> | undefined {
        return this.pinPointRefs[pinNumber];
    }

    componentDidMount(): void {
        this.setState({
            hasMounted: true
        });
    }

    render() {
        const rerender = () => this.setState({});
        const toggleSelected = (vl: VoltageLevel) => {
            vl.selected = !vl.selected;
            this.props.onChange();
        };
        const openPins = this.props.group.numOpenPins;
        return [
            <div className="flex-wrapper assign-signals-wrapper" key={0}>
                <div className="custom-module__signals-container">
                    {this.getSignalsPanel()}
                </div>
                <div className="custom-module__voltage-domain-container">
                    <div className="voltage-domain-controls">
                        <div className="open-pins">
                            Open Pins: {openPins} / {this.props.group.getNets().length}
                            <button className="cta-link clear-btn font-bold"
                                    disabled={openPins === this.props.group.getNets().length}
                                    onClick={() => this.onClickClearPins()}>
                                Clear
                            </button>
                        </div>
                        <div>
                            <span className="allowed-levels-label">
                                Allowed voltages:
                            </span> {
                            this.props.group.getLevels().map(vl =>
                                (<label key={vl.level}
                                        className={`allowed-level ${vl.selected ? 'active-js' : ''}`}>
                                    <input type="checkbox"
                                           data-test="allowedLevelToggle"
                                           onChange={() => toggleSelected(vl)}
                                           checked={vl.selected}/>
                                    {vl.level}V
                                </label>)
                            )}
                        </div>
                    </div>
                    <div className="pins-pinpoints-container flex-wrapper">
                        <div className="custom-module__nets-container"
                             onScroll={rerender}
                             ref={this.pinsContainerRef}>
                            {this.getNetsTable()}
                        </div>
                        {this.getModuleSVGColumn()}
                    </div>
                </div>
            </div>,
            <svg className="custom-module__line-canvas"
                 key={2}
                 ref={this.lineCanvasRef}>
                {this.getLinesToPins()}
            </svg>
        ];
    }

    private getNetsTable(): JSX.Element {
        /**
         * @param unassignmentCallback: Nets can be unassigned in two ways: regular remove, or set to GND.
         */
        const unassignNet = (net: AssignableNet, unassignmentCallback: () => void) => {
            const numSignalsAssigned = this.props.group.filterNetsByBus(net.bus).length;
            if (net.signal && net.signal.mandatory && numSignalsAssigned > 1) {
                this.props.onUnassignMandatory(net);
            } else {
                unassignmentCallback();
                this.setState({});
            }
        };
        const isHighlightingNet = (net: AssignableNet) => {
            return this.state.hoveredPinNumber === net.pinNumber ||
                this.props.selectedBus && net.isAssignedToBus(this.props.selectedBus) ||
                [this.state.dropTargetNet, this.state.mouseOverNet].indexOf(net) > -1;
        };
        const onDragEnd = (net: AssignableNet) => {
            const hoveredNet = this.state.dropTargetNet;
            this.setState({
                dropTargetNet: null,
                mouseOverNet: null,
                isDraggingNet: false
            });
            if (hoveredNet && net !== hoveredNet) {
                hoveredNet.swap(net);
                this.props.onChange();
            }
        };
        return (
            <NetsTable selectedDomain={this.props.group}
                       onUnassignNet={unassignNet}
                       selectedNet={this.state.selectedNet}
                       dropTargetNet={this.state.dropTargetNet}
                       mouseOverNet={this.state.mouseOverNet}
                       onDrag={() => this.setState({isDraggingNet: true})}
                       isDragging={this.state.isDraggingNet}
                       onDragEnd={onDragEnd}
                       onMouseOverNet={net => this.setState({mouseOverNet: net})}
                       onDragOverNet={net => this.setState({dropTargetNet: net})}
                       onSelectNet={net => this.onSelectNet(net)}
                       onSelectBus={bus => this.props.onSelectBus(bus)}
                       getNetViewRef={(net: AssignableNet) => this.getNetViewRef(net.pinNumber)}
                       busColours={this.props.busColours}
                       isHighlightingNet={isHighlightingNet}
            />
        );
    }

    /**
     * Line from nets to pins are drawn when:
     *  - A pin is hovered on
     *  - A pin is selected (selects a net)
     *  - A net is hovered on
     *  - A net is selected
     *
     *  TODO rendering lines is a mess due to its dependency on the DOM state.
     */
    private getLinesToPins(): JSX.Element[] | null {
        if (!this.state.hasMounted) {
            return null;
        }
        const lines = [];
        const visited = {};
        const makeLine = (pinNo: string) => {
            const netViewRef = this.getNetViewRef(pinNo);
            const pinPointRef = this.getPinPointRef(pinNo);

            if (visited[pinNo] ||
                !netViewRef || !netViewRef.current ||
                !pinPointRef || !pinPointRef.current) {
                return;
            }

            visited[pinNo] = true;
            lines.push(<NetToPinLine key={pinNo}
                                     canvasElement={this.lineCanvasRef.current}
                                     netElement={netViewRef.current}
                                     pinPointElement={pinPointRef.current}/>);
        };
        [
            this.state.selectedNet,
            this.state.dropTargetNet,
            this.state.mouseOverNet
        ].forEach(net => net && makeLine(net.pinNumber));
        if (this.state.hoveredPinNumber) {
            makeLine(this.state.hoveredPinNumber);
        }
        return lines;
    }

    private getModuleSVGColumn(): JSX.Element {
        const viewData = this.props.customerModuleCreate.moduleViewData;
        const selectedBusPins = {};
        if (this.props.selectedBus) {
            for (const net of this.props.group.filterNetsByBus(this.props.selectedBus)) {
                selectedBusPins[net.pinNumber] = true;
            }
        }
        const isHighlightingPinPoint = (pinNo: string) => selectedBusPins[pinNo];
        const isIndicatingPinPoint = (pinNo: string) => {
            return [
                this.state.dropTargetNet,
                this.state.mouseOverNet,
                this.state.selectedNet
            ].filter(net => net).some(net => net.pinNumber === pinNo);
        };
        return (
            <div className="assignable-nets-module-svg-column">
                <CustomModuleProgressHelperView
                    selectedBus={this.props.selectedBus}
                    customerModuleCreate={this.props.customerModuleCreate}
                    onSelectDomain={this.props.onSelectDomain}
                    onSelectBus={(bus: CustomerBus) => this.props.onSelectBus(bus)}
                    selectedDomain={this.props.group}/>
                <div className="wrapper">
                    <div className="module-svg-wrapper"
                         style={viewData.shouldConstrainSize ? {maxWidth: '12rem'} : null}>
                        <PinPointsView getPinPointRef={(pinNo: string) => this.getPinPointRef(pinNo)}
                                       viewableModule={viewData}
                                       getColourByPinNumber={(pinNo: string) => this.props.busColours.getColourByPinNumber(pinNo)}
                                       isHighlightingPinPoint={isHighlightingPinPoint}
                                       isIndicatingPinPoint={isIndicatingPinPoint}
                                       onMouseOverPinPoint={pinNo => this.onMouseoverPinPoint(pinNo)}
                                       onMouseOutPinPoint={() => this.onMouseoutPinPoint()}
                                       onClickPinPoint={pinNo => this.onClickPinPoint(pinNo)}
                                       rotation={0}/>
                    </div>
                    <div className="preview-caption">Module top-down view</div>
                </div>
            </div>
        );
    }

    /**
     * Indicates a Net based on the corresponding Pin.
     */
    private onMouseoverPinPoint(pinNumber: string): void {
        this.setState({
            hoveredPinNumber: pinNumber
        });
        const net = this.props.group.getNets().find(n => n.pinNumber === pinNumber);
        if (net) {
            this.scrollToNet(net);
        }
    }

    private onMouseoutPinPoint(): void {
        this.setState({
            hoveredPinNumber: null
        });
    }

    private onClickPinPoint(pinNumber: string): void {
        const net = this.props.group.getNets().find(n => n.pinNumber === pinNumber);
        if (net) {
            this.onSelectNet(net);
            this.scrollToNet(net);
        }
    }

    private scrollToNet(net: AssignableNet): void {
        const netViewRef = this.getNetViewRef(net.pinNumber);
        if (netViewRef && netViewRef.current) {
            scrollToNet(netViewRef.current, this.pinsContainerRef.current);
        }
    }

    private onSelectNet(net: AssignableNet): void {
        if (this.state.selectedNet) {
            if (this.state.selectedNet !== net) {
                this.state.selectedNet.swap(net);
            }
            this.setState({selectedNet: null});
            return;
        }
        if (net.bus) {
            this.props.onSelectBus(net.bus);
        }
        this.setState({
            selectedNet: net
        });
    }

    private getSignalsPanel(): JSX.Element {
        if (this.props.selectedBus) {
            return <AssignableSignalsPanel busColours={this.props.busColours}
                                           selectedBus={this.props.selectedBus}
                                           selectedGroup={this.props.group}
                                           selectedNet={this.state.selectedNet}
                                           onSignalDropped={signal => this.signalDropped(signal)}
                                           onSignalsChanged={() => this.onSignalAdded()}
                                           onRename={bus => this.props.onClickRenameBus(bus)}
                                           onDeleteBus={bus => this.props.onClickRemoveBus(bus)}
                                           onMilliwattsChange={this.props.onChange}
                                           customerModuleCreate={this.props.customerModuleCreate}
                                           onSelectDomain={domain => this.props.onSelectDomain(domain)}
            />;
        }
        if (this.props.customerModuleCreate.getBuses().length === 0) {
            return (
                <div>
                    <p>Signals will appear here when a bus is created.</p>
                </div>
            );
        }
        return (
            <div>
                <p>Select a bus to view and assign its signals.</p>
            </div>
        );
    }

    private onSignalAdded(): void {
        this.setState({selectedNet: null});
        this.props.onChange();
    }

    private signalDropped(signal: Signal): void {
        if (this.state.dropTargetNet) {
            this.state.dropTargetNet.assign(this.props.selectedBus, signal);
            this.props.onChange();
        }
    }

    private onClickClearPins(): void {
        this.props.group.clearNets();
        this.props.onChange();
    }
}

/**
 * A helper function for scrolling to an item in a container.
 * @param nodeToScrollTo: The HTML element for the node inside the container.
 * @param container: The HTML element for the scrollable container.
 */
export function scrollToNet(nodeToScrollTo: HTMLElement, container: HTMLElement): void {
    const $node = $(nodeToScrollTo);
    const $container = $(container);
    const containerTop = $container.offset().top;
    const nodeTop = $node.offset().top;
    const ms = 150;

    if (nodeTop < containerTop) {
        $container.stop().animate({
            scrollTop: nodeTop - containerTop + $container.scrollTop()
        }, ms);
    } else if (nodeTop > containerTop + $container.height() - $node.height()) {
        const scrollAmount = nodeTop - containerTop + $container.scrollTop() -
            $container.height() + $node.height() * 1.5; // 1.5 to guarantee fully in view
        $container.stop().animate({
            scrollTop: scrollAmount
        }, ms);
    }
}
