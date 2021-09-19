import * as React from "react";
import {RefObject} from "react";
import {BusResource} from "../bus/api";
import {NetResource} from "../net/api/NetResource";

interface NetViewProps {
    bus: BusResource;
    net: NetResource;

    onMouseOver?: (netView: NetView) => void;
    onMouseOut?: (netView: NetView) => void;
    onClick?: (netView: NetView) => void;
}

interface NetViewState {
    colour: string | null;
    highlight: boolean,
}

export class NetView extends React.Component<NetViewProps, NetViewState> {
    public readonly elRef: RefObject<HTMLTableRowElement>;
    private readonly pinElRef: RefObject<HTMLDivElement>;
    private readonly milliwattsElRef: RefObject<HTMLSpanElement>;

    constructor(props: NetViewProps) {
        super(props);
        this.state = {
            colour: null,
            highlight: false,
        };

        this.elRef = React.createRef<HTMLTableRowElement>();
        this.pinElRef = React.createRef<HTMLDivElement>();
        this.milliwattsElRef = React.createRef<HTMLSpanElement>();
    }

    public static defaultProps: Partial<NetViewProps> = {
        onMouseOver: () => {},
        onMouseOut: () => {},
        onClick: () => {},
    };

    public get bus(): BusResource {
        return this.props.bus;
    }

    public get pinName(): string {
        return this.props.net.value;
    }

    public getLineAnchor(): HTMLElement {
        if (this.milliwattsElRef.current) {
            return this.milliwattsElRef.current
        }
        return this.pinElRef.current;
    }

    public setColour(colour: string | null): void {
        this.setState({
            colour: colour,
        });
    }

    public toggleHighlight(highlight: boolean): void {
        if (highlight === this.state.highlight) {
            return;
        }

        this.setState({
            highlight: highlight,
        });
    }

    /**
     * Use onMouseDown due to react onClick behaviour (there is only one onClick
     * event globally, and stop propagation will interrupt the event).
     */
    private onMouseDown(event: React.MouseEvent<HTMLTableRowElement>): void {
        if (event.nativeEvent.button === 0 ) {
            this.props.onClick(this);
        }
    }

    render(): JSX.Element {
        const elClasses = ['net'];
        if (this.state.highlight) {
            elClasses.push('highlight');
        }

        return (
            <tr className={elClasses.join(' ')}
                ref={this.elRef}
                onMouseOver={() => this.props.onMouseOver(this)}
                onMouseOut={() => this.props.onMouseOut(this)}
                onMouseDown={event => this.onMouseDown(event)}
                data-pin-name={this.pinName}>
                <td className="net-label-col">
                    <strong className="net-label">{this.pinName}</strong>
                </td>
                <td className="pin-col">
                    <div className="pin completed"
                         ref={this.pinElRef}
                         style={{backgroundColor: this.state.colour}}>
                        <span className="bus-name">{this.props.bus.name}</span>
                        <span className="signal-name">{this.props.net.signal}</span>
                    </div>
                </td>
                <td className="milliwatts-col">
                    {
                        this.props.bus.power &&
                        <span className="milliwatts"
                             ref={this.milliwattsElRef}>
                            {this.props.bus.milliwatts}mW
                        </span>

                    }
                </td>
            </tr>
        );
    }
}