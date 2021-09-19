import * as React from "react";
import {RefObject} from "react";
import {BusGroupResource, BusResource} from "../bus/api";
import {NetView} from "./NetView";
import {NetResource} from "../net/api/NetResource";

interface NetGroupViewProps {
    isSelected: boolean;
    voltageDomain: BusGroupResource;
    buses: BusResource[];

    showNet?: (net: NetResource, bus: BusResource) => boolean

    onScroll?: (netGroupView: NetGroupView) => void;

    onMouseOverNet?: (netView: NetView) => void;
    onMouseOutNet?: (netView: NetView) => void;
    onClickNet?: (netView: NetView) => void;
}

export class NetGroupView extends React.Component<NetGroupViewProps> {
    public netRefs: RefObject<NetView>[];
    private readonly netContainerRef: RefObject<HTMLDivElement>;

    constructor(props: NetGroupViewProps) {
        super(props);
        this.netRefs = [];
        for (const bus of this.props.buses) {
            for (const net of bus.nets) {
                if (this.props.showNet(net, bus)) {
                    this.netRefs.push(React.createRef<NetView>());
                }
            }
        }
        this.netContainerRef = React.createRef<HTMLDivElement>();
    }

    public static defaultProps: Partial<NetGroupViewProps> = {
        showNet: () => true,

        onScroll: () => {},

        onMouseOverNet: () => {},
        onMouseOutNet: () => {},
        onClickNet: () => {},
    };

    private get netsEl(): JSX.Element[] {
        const netsEl = [];

        let count = 0;
        for (const bus of this.props.buses) {
            for (const net of bus.nets) {
                if (!this.props.showNet(net, bus)) {
                    continue;
                }

                netsEl.push(<NetView key={count}
                                     ref={this.netRefs[count]}
                                     bus={bus}
                                     net={net}
                                     onMouseOver={netView => this.props.onMouseOverNet(netView)}
                                     onMouseOut={netView => this.props.onMouseOutNet(netView)}
                                     onClick={netView => this.props.onClickNet(netView)}/>);
                count ++;

            }
        }

        netsEl.sort((a, b) => {
            return a.props.net.value.localeCompare(b.props.net.value, undefined, {numeric: true});
        });

        return netsEl;
    }

    public scrollTo(netPinName: string): void {
        const netRef = this.netRefs.find(netRef => netRef.current.pinName === netPinName);
        if (!netRef) {
            return;
        }

        const containerScrollTop = this.netContainerRef.current.scrollTop;
        const padding = 15;
        const netRect = netRef.current.elRef.current.getBoundingClientRect();
        const containerRect = this.netContainerRef.current.getBoundingClientRect();

        if (netRect.top < containerRect.top) {
            this.netContainerRef.current.scrollTo({
                top: netRect.top - containerRect.top + containerScrollTop - padding,
                behavior: 'smooth',
            });
        } else if (netRect.bottom > containerRect.bottom) {
            this.netContainerRef.current.scrollTo({
                top: netRect.bottom - containerRect.bottom + containerScrollTop + padding,
                behavior: 'smooth',
            });
        }
    }

    render(): JSX.Element {
        return (
            <div className="net-group"
                 style={{display: this.props.isSelected ? null : 'none'}}>
                <div className="net-container"
                     ref={this.netContainerRef}
                     onScroll={() => this.props.onScroll(this)}>
                    <table className="nets">
                        <tbody>
                        {this.netsEl}
                        </tbody>
                    </table>
                </div>
                <div className="allowed-levels">
                    <strong className="header">Allowed voltages:</strong>
                    <div>
                        {this.props.voltageDomain.levels.map((level, i) =>
                            <label key={i}
                                   className="level">{level}</label>)}
                    </div>
                </div>
            </div>
        );
    }
}