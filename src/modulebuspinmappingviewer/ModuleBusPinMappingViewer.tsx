import * as React from "react";
import {useEffect, useRef, useState} from "react";
import {Module} from "../module/Module";
import {PinPointsView} from "../module/custom/view/voltagedomain/PinPointsView";
import {BusGroupResource, BusResource} from "../bus/api";
import {ServerID} from "../model/types";
import {NetToPinLine} from "../module/custom/view/voltagedomain/NetToPinLine";
import {moduleToViewableData, normalizePinName, ViewableModule} from "../module/PinPoint";
import {NetResource} from "../net/api/NetResource";
import {ColourPool, createColourPool, getGroundPinColor} from "../utils/ColourPool";
import {arrayRangeExtraction} from "../utils/arrayRangeExtraction";
import {AssignableNet} from "../module/custom/AssignableNet";

interface ModuleBusPinMappingViewerProps {
    module: Module;
    rotation?: number;
}

interface ModuleBusPinMappingViewerState {
    mounted: boolean;
    selectedVoltageDomain: BusGroupResource;
    selectedBus: MappingBus | null;
    hoveredBusId: ServerID | null;
    hoveredNetPinName: string | null;
    hoveredPinPointPinName: string | null;
}

/**
 * "Pins" are interchangeable with the name "Nets". Maybe we should pick one.......
 */
interface MappingPin {
    id: ServerID;
    bus: MappingBus | null;
    signal: string;
    value: string;
    pinNumber: string;
}

function makeMappingPin(bus: MappingBus, net: NetResource): MappingPin {
    /**
     * Beware! Not all `net.value`s are formatted based on pins (eg "PIN10").
     * Sometimes, they're something like "VOUT" and can be duplicate to another `net.value`.
     * So it's invalid to treat `net.value` as a unique key or to assume it correlates to a pin for line drawing.
     */
    return {
        id: net.id,
        bus: bus,
        signal: net.signal,
        value: net.value,
        pinNumber: normalizePinName(net.value)
    };
}

interface MappingBus {
    id: ServerID;
    name: string;
    nets: MappingPin[];
    domainId: ServerID;
}

/**
 * A convenience structure to display Buses/Nets in the pin mapping viewer.
 * Since this view primarily uses server Module "Resource" objects (BusResource, NetResource),
 * the object relationships are very different from those found in the editable counterpart,
 * @see CustomerModuleCreate
 * TODO where are the GND nets?
 */
function makeMappingBus(bus: BusResource): MappingBus {
    const mappingBus = {
        id: bus.id,
        name: bus.name,
        nets: [],
        domainId: bus.bus_group.id
    };
    mappingBus['nets'] = bus.nets.map(net => makeMappingPin(mappingBus, net));
    return mappingBus;
}

function makeGroundMappingPin(bus: string): MappingPin {
    const mappingPin = {
        id: bus,
        bus: {
            id: AssignableNet.prototype.groundNetId,
            name: AssignableNet.prototype.groundNetName,
            nets: [],
            domainId: AssignableNet.prototype.groundNetId
        },
        signal: AssignableNet.prototype.groundNetName,
        value: bus,
        pinNumber: ''
    }
    mappingPin['pinNumber'] = bus.slice(1);
    return mappingPin;
}

/**
 * A read-only view of Pins and Pin assignments for a customer-created module.
 * If we ever get the chance to make customer-created modules editable, we should do that instead.
 */
export class ModuleBusPinMappingViewer extends React.Component<ModuleBusPinMappingViewerProps, ModuleBusPinMappingViewerState> {
    private readonly busesTable: { [voltageDomainId: string]: MappingBus[] } = {};
    private readonly filteredVoltageDomains: BusGroupResource[]; // Filter out voltage domains that only contain buses that implement VLOGIC.
    private readonly filteredRequires: MappingBus[]; // Filter out buses that implement VLOGIC.
    private readonly filteredProvides: MappingBus[]; // Filter out buses that implement VLOGIC.
    private readonly colourPool: ColourPool;
    private readonly buses: MappingBus[];
    private readonly nets: MappingPin[];
    private readonly ground_nets: MappingPin[];
    private readonly viewData: ViewableModule;

    constructor(props: ModuleBusPinMappingViewerProps) {
        super(props);
        const module = this.props.module;
        this.viewData = moduleToViewableData(module);
        const notVlogic = bus => bus.templates.every(t => t.name !== 'VLOGIC');
        this.filteredRequires = module.requires.filter(notVlogic).map(makeMappingBus);
        this.filteredProvides = module.provides.filter(notVlogic).map(makeMappingBus);
        this.buses = [...this.filteredRequires, ...this.filteredProvides];
        this.colourPool = createColourPool(this.buses.length);
        this.nets = [];
        for (const bus of this.buses) {
            if (this.busesTable.hasOwnProperty(bus.domainId)) {
                this.busesTable[bus.domainId].push(bus);
            } else {
                this.busesTable[bus.domainId] = [bus];
            }
            this.nets.push(...bus.nets);
        }
        this.ground_nets = module.groundNets ? module.groundNets.map(makeGroundMappingPin) : [];
        for (const ground_net of this.ground_nets) {
            ground_net.bus.nets = this.ground_nets;
            this.nets.push(ground_net);
        }
        this.filteredVoltageDomains = this.props.module.voltageDomains
            .filter(voltageDomain => this.busesTable.hasOwnProperty(voltageDomain.id));

        this.state = {
            mounted: false,
            selectedVoltageDomain: this.filteredVoltageDomains.length ? this.filteredVoltageDomains[0] : null,
            selectedBus: null,
            hoveredBusId: null,
            hoveredNetPinName: null,
            hoveredPinPointPinName: null,
        };
    }

    private onSelectDomain(domain: BusGroupResource): void {
        if (this.state.selectedVoltageDomain !== domain) {
            this.setState({
                selectedVoltageDomain: domain
            });
        }
    }

    private getNetsFromDomain(domain: BusGroupResource): MappingPin[] {
        const nets = [];
        this.busesTable[domain.id].forEach(bus => nets.push(...bus.nets));
        return nets;
    }

    private onClickBus(bus: MappingBus): void {
        if (this.state.selectedBus === bus) {
            this.setState({selectedBus: null});
        } else {
            const owningDomain = this.filteredVoltageDomains.find(domain => {
                const domainBuses = this.busesTable[domain.id];
                return domainBuses.some(b => b === bus);
            });
            this.setState({
                selectedBus: bus,
                selectedVoltageDomain: owningDomain
            });
        }
    }

    private makeBusBox(bus: MappingBus): JSX.Element {
        const selectors = ["bus-list-item"];
        if (this.state.selectedBus === bus) {
            selectors.push("selected-js");
        }
        return (
            <div className={selectors.join(' ')}
                 key={bus.id}
                 onClick={() => this.onClickBus(bus)}
                 data-test={bus.name}>
                <div className="card-background"/>
                <div className="name">
                    <div className="colour-icon"
                         style={{backgroundColor: this.getColour(bus)}}/>
                    {bus.name}
                </div>
            </div>
        );
    }

    private getColour(bus: MappingBus | undefined): string | null {
        if (bus) {
            if (bus.name === 'Ground') return getGroundPinColor();
            const index = this.buses.indexOf(bus);
            if (index > -1) {
                return this.colourPool.getColour(index);
            }
        }
        return null;
    }

    render() {
        const voltageDomains = this.filteredVoltageDomains;
        // The view gets pushed down depending on the existence of the domain nav bar. This compensates for it.
        const voltageDomainViewHeight = voltageDomains.length > 1 ? '94%' : '100%';
        const domainNets = this.getNetsFromDomain(this.state.selectedVoltageDomain);
        if (this.ground_nets.length > 0) {
            for (const ground_net of this.ground_nets) {
                domainNets.push(ground_net);
            }
        }
        if (domainNets.length > 1) domainNets.sort(arrangeNetsByPinNumber);

        return (
            <div className="tab-content" key={1}>
                <div className="assign-signals">
                    {voltageDomains.length > 1 &&
                    <div className="nav">
                        {voltageDomains.map(domain =>
                            <button className={this.state.selectedVoltageDomain === domain ? 'active-js' : ''}
                                    key={domain.id}
                                    data-test="voltageDomain"
                                    onClick={() => this.onSelectDomain(domain)}>
                                {getDomainName(this.getNetsFromDomain(domain))}
                            </button>
                        )}
                    </div>
                    }
                    <div style={{height: voltageDomainViewHeight}}>
                        <ReadonlyVoltageDomainView domain={this.state.selectedVoltageDomain}
                                                   getColour={bus => this.getColour(bus)}
                                                   selectedBus={this.state.selectedBus}
                                                   viewData={this.viewData}
                                                   domainNets={domainNets}
                                                   allNets={this.nets}
                                                   rotation={this.props.rotation}/>
                    </div>
                </div>
                <div className="custom-module__buses-container">
                    <div className="wrapper">
                        <div className="board-signals-container">
                            <h4 className="bus-list-header">
                                Board Signals ({this.filteredRequires.length})
                            </h4>
                            <div>
                                {this.filteredRequires.map(bus => this.makeBusBox(bus))}
                            </div>
                        </div>
                        <div className="external-signals-container">
                            <h4 className="bus-list-header">
                                External Signals ({this.filteredProvides.length})
                            </h4>
                            <div>
                                {this.filteredProvides.map(bus => this.makeBusBox(bus))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

interface ReadonlyVoltageDomainViewProps {
    domain: BusGroupResource | null;
    getColour: (bus: MappingBus | undefined) => string | null;
    selectedBus: MappingBus;
    viewData: ViewableModule;
    domainNets: MappingPin[];
    allNets: MappingPin[];
    rotation: number;
}

function ReadonlyVoltageDomainView(props: ReadonlyVoltageDomainViewProps): JSX.Element | null {
    if (!props.domain) {
        return null;
    }
    const [hasMounted, setHasMounted] = useState(false);
    const [hoveredPinNumber, setHoveredPinNumber] = useState(null);
    const [mouseOverNet, setMouseOverNet]: [MappingPin | null, any] = useState(null);
    const pinsContainerRef = useRef(null);
    const lineCanvasRef = useRef(null);
    const makeRefsMap = (arr, getKey) => {
        const map = {};
        arr.forEach(item => map[getKey(item)] = useRef());
        return map;
    };
    const netViewRefs = makeRefsMap(props.allNets, net => net.pinNumber);
    const pinPointRefs = makeRefsMap(props.viewData.pinPoints, pp => pp.pinNumber);
    const [, rerender] = useState();

    useEffect(() => setHasMounted(true));

    function isHighlightingNet(net: MappingPin): boolean {
        return hoveredPinNumber === net.pinNumber || mouseOverNet === net ||
            net.bus && net.bus === props.selectedBus;
    }

    function getLinesToPins(): JSX.Element[] | null {
        if (!hasMounted) {
            return null;
        }
        const lines = [];
        const visited = {};
        const makeLine = (pinNo: string) => {
            if (visited[pinNo] || !netViewRefs[pinNo] || !pinPointRefs[pinNo] ||
                !netViewRefs[pinNo].current || !pinPointRefs[pinNo].current) {
                return;
            }
            visited[pinNo] = true;
            lines.push(<NetToPinLine key={pinNo}
                                     canvasElement={lineCanvasRef.current}
                                     netElement={netViewRefs[pinNo].current}
                                     pinPointElement={pinPointRefs[pinNo].current}/>);
        };
        if (mouseOverNet) {
            makeLine(mouseOverNet.pinNumber);
        }
        if (hoveredPinNumber) {
            makeLine(hoveredPinNumber);
        }
        return lines;
    }

    function getModuleSVGColumn(): JSX.Element {
        const selectedBusPins = {};
        if (props.selectedBus) {
            for (const net of props.selectedBus.nets) {
                selectedBusPins[net.pinNumber] = true;
            }
        }
        const isHighlightingPinPoint = (pinNo: string) => selectedBusPins[pinNo];
        const isIndicatingPinPoint = (pinNo: string) => mouseOverNet && mouseOverNet.pinNumber === pinNo;
        const getColourByPinNo = (pinNo: string) => {
            for (const net of props.allNets) {
                if (net.pinNumber === pinNo) {
                    return props.getColour(net.bus);
                }
            }
            return null;
        };
        const rotateDeg = props.rotation ? "rotate(-" + props.rotation + "deg)" : "rotate(0deg)";
        let maxWidth, maxHeight, textMarginTop, wrapperMarginTop = null;
        if (props.rotation) textMarginTop = props.rotation != 0 && props.rotation != 180 ? "7rem" : "0.5rem";
        if (props.viewData.shouldConstrainSize) {
            if (props.rotation) {
                maxWidth = props.rotation != 0 && props.rotation != 180 ? '16rem' : '12rem';
                maxHeight = props.rotation != 0 && props.rotation != 180 ? null : '16rem';
            } else {
                maxWidth = "12rem";
            }
            wrapperMarginTop = props.selectedBus ? "27%" : "20%";
        } else {
            if (props.rotation) {
                if (props.rotation != 0 && props.rotation != 180) {
                    maxWidth = "320px";
                    maxHeight = "470px";
                    wrapperMarginTop = props.selectedBus ? "160px" : "140px";
                } else {
                    maxWidth = "470px";
                    maxHeight = "320px";
                    wrapperMarginTop = props.selectedBus ? "27%" : "20%";
                }
            }
        }

        return (
            <div className="assignable-nets-module-svg-column">
                <div className="wrapper" style={{marginTop: wrapperMarginTop}}>
                    {props.selectedBus && <p className="progress-message">
                        Highlighting <span className="font-bold">{props.selectedBus.name}</span> Pins
                    </p>}
                    <div className="module-svg-wrapper"
                         style={{
                             maxWidth: maxWidth,
                             maxHeight: maxHeight,
                             transform: rotateDeg
                         }}>
                        <PinPointsView getPinPointRef={(pinNo: string) => pinPointRefs[pinNo]}
                                       viewableModule={props.viewData}
                                       getColourByPinNumber={getColourByPinNo}
                                       isHighlightingPinPoint={isHighlightingPinPoint}
                                       isIndicatingPinPoint={isIndicatingPinPoint}
                                       onMouseOverPinPoint={pinNo => setHoveredPinNumber(pinNo)}
                                       onMouseOutPinPoint={() => setHoveredPinNumber(null)}
                                       onClickPinPoint={() => {
                                       }}
                                       rotation={props.rotation ? props.rotation : 0}/>
                    </div>
                    <div className="preview-caption" style={{marginTop: textMarginTop}}>Module top-down view</div>
                </div>
            </div>
        );
    }

    function makeNet(net: MappingPin): JSX.Element {
        const selectors = ['net'];
        if (isHighlightingNet(net)) {
            selectors.push('highlight');
        }
        return (
            <tr className={selectors.join(' ')}
                key={net.id}
                onMouseOver={() => setMouseOverNet(net)}
                onMouseOut={() => setMouseOverNet(null)}
                data-test={`net${net.pinNumber}`}>
                <td className="net-label-col">
                    <strong className="net-label">{net.value}</strong>
                </td>
                <td className="pin-col">
                    <div className="pin"
                         style={{backgroundColor: props.getColour(net.bus)}}
                         ref={netViewRefs[net.pinNumber]}>
                        {net.bus && <span className="bus-name">{net.bus.name}</span>}
                        <span className="signal-name">
                            {net.signal}
                        </span>
                    </div>
                </td>
            </tr>
        );
    }

    return (
        <React.Fragment>
            <div className="flex-wrapper assign-signals-wrapper">
                <div className="custom-module__voltage-domain-container">
                    <div className="voltage-domain-controls">
                        <div>
                        <span className="allowed-levels-label">
                            Allowed voltages:
                        </span>
                            {props.domain.levels.map(vl => <span className="allowed-level" key={vl}>{vl}V</span>)}
                        </div>
                    </div>
                    <div className="pins-pinpoints-container flex-wrapper">
                        <div className="custom-module__nets-container"
                             onScroll={rerender}
                             ref={pinsContainerRef}>
                            <table className={"custom-module__nets"}>
                                <tbody>
                                {props.domainNets.map(makeNet)}
                                </tbody>
                            </table>
                        </div>
                        {getModuleSVGColumn()}
                    </div>
                </div>
            </div>
            <svg className="custom-module__line-canvas"
                 ref={lineCanvasRef}>
                {getLinesToPins()}
            </svg>
        </React.Fragment>
    );
}

/**
 * Generate a domain name based its nets. This only really matters if there is more than one domain.
 * The "real" domain name (BusGroup.title) is not meant to be customer-facing.
 */
function getDomainName(nets: MappingPin[]): string {
    const pinNumberArray = nets
        .filter(net => !isNaN(parseInt(net.pinNumber)))
        .map(net => parseInt(net.pinNumber));

    if (pinNumberArray.length === 1) {
        return `Pin ${pinNumberArray[0]}`;
    }

    const rangeString = arrayRangeExtraction(pinNumberArray);
    if (rangeString) {
        return `Pins ${rangeString}`;
    }

    let backUpName = '';
    for (const net of nets) {
        const pinNo = parseInt(net.pinNumber);
        if (isNaN(pinNo) && net.pinNumber) {
            backUpName = net.pinNumber;
        }
    }
    if (backUpName) {
        return backUpName
    }

    return 'Unnamed Domain';
}

function arrangeNetsByPinNumber(netA: MappingPin, netB: MappingPin): number {
    if (parseInt(netA.pinNumber) > parseInt(netB.pinNumber)) {
        return 1;
    }
    return -1;
}