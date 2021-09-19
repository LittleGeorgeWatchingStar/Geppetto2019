import * as React from "react";
import {RefObject} from "react";
import {Vector2D} from "../../../../utils/geometry";
import {PinPoint, ViewableModule} from "../../../PinPoint";

interface PinPointViewProps {
    pinPoint: PinPoint;
    getColourByPinNo: (pinNo: string) => string;
    viewData: ViewableModule;
    isIndicating: (pinNo: string) => boolean;
    isHighlighting: (pinNo: string) => boolean;
    getPinPointRef: (pinNo: string) => RefObject<any>;
    onMouseOver?: (pinNo: string) => void;
    onMouseOut?: () => void;
    onClick?: (pinNo: string) => void;
    rotation: number;
}

interface PinPointViewState {
    labelPosition: Vector2D;
    backgroundPosition: Vector2D;
    backgroundWidth: number;
    backgroundHeight: number;
    indicate: boolean; // Blink.
    highlight: boolean;
}

export class PinPointView extends React.Component<PinPointViewProps, PinPointViewState> {
    private readonly elRef: RefObject<SVGGElement>;
    private readonly labelRef: RefObject<SVGTextElement>;

    constructor(props: PinPointViewProps) {
        super(props);
        this.elRef = React.createRef<SVGGElement>();
        this.labelRef = React.createRef<SVGTextElement>();

        this.state = {
            labelPosition: {x: 0, y: 0},
            backgroundPosition: {x: 0, y: 0},
            backgroundWidth: 0,
            backgroundHeight: 0,
            indicate: false,
            highlight: false,
        };
    }

    public static defaultProps: Partial<PinPointViewProps> = {
        onMouseOver: () => {
        },
        onMouseOut: () => {
        },
        onClick: () => {
        },
    };

    componentDidMount(): void {
        this.setLabelPosition();
        this.forceUpdate(this.setBackgroundPosition);
    }

    public get pinNumber(): string {
        return this.props.pinPoint.pinNumber;
    }

    private setLabelPosition(): void {
        const pinPoint = this.props.pinPoint;
        const initialLabelBBox = this.labelRef.current.getBBox();
        // Default: centred on pin. Move it so that it's visible.
        let x = pinPoint.position.x - initialLabelBBox.width / 2;
        let y = pinPoint.position.y + initialLabelBBox.height / 2;
        const viewData = this.props.viewData;
        if (viewData.isHorizontalOrientation) {
            const d = (initialLabelBBox.height / 2);
            if (pinPoint.position.y <= viewData.midY) {
                y = y - d * 1.75;
            } else {
                y = y + d;
            }
        } else {
            const d = (initialLabelBBox.width / 2) + 5;
            if (pinPoint.position.x <= viewData.midX) {
                x = x - d;
            } else {
                x = x + d;
            }
        }

        switch (this.props.rotation) {
            case 90:
                x = pinPoint.position.y + initialLabelBBox.height / 2;
                y = -pinPoint.position.x + initialLabelBBox.width / 3;
                break;
            case 180:
                x = -pinPoint.position.x - initialLabelBBox.width / 2;
                y = -pinPoint.position.y - initialLabelBBox.height / 2;
                break;
            case 270:
                x = -pinPoint.position.y + initialLabelBBox.height / 2;
                y = pinPoint.position.x + initialLabelBBox.width / 3;
                break;
            default:
        }

        this.setState({
            labelPosition: {x: x, y: y},
        });
    }

    private setBackgroundPosition(): void {
        const pad = 3;
        const initialBBox = this.elRef.current.getBBox();

        this.setState({
            backgroundPosition: {
                x: initialBBox.x - pad,
                y: initialBBox.y - pad,
            },
            backgroundWidth: initialBBox.width + pad * 2,
            backgroundHeight: initialBBox.height + pad,
        });
    }

    private onClick(event: React.MouseEvent<SVGGElement>): void {
        if (event.nativeEvent.button === 0) {
            this.props.onClick(this.pinNumber);
        }
    }

    render() {
        const elClasses = ['module-svg-pin'];
        const textClasses = ['pin-label'];
        if (this.props.isIndicating(this.pinNumber)) {
            textClasses.push('blink');
            elClasses.push('highlight');
        } else if (this.props.isHighlighting(this.pinNumber)) {
            elClasses.push('highlight');
        }
        const rotateDeg = this.props.rotation != 0 ? this.props.rotation : 0;
        const rotateZDeg = "rotateZ(" + rotateDeg + "deg)"
        const fontSize = this.props.rotation !== 0 && this.props.rotation !== 180 ? "0.6rem" : "0.9rem";
        return (
            <g className={elClasses.join(' ')}
               ref={this.elRef}
               onMouseOver={() => this.props.onMouseOver(this.pinNumber)}
               onMouseOut={() => this.props.onMouseOut()}
               onClick={event => this.onClick(event)}
               data-test={`pinPoint${this.pinNumber}`}>
                <rect className="pin-point-background"
                      x={this.state.backgroundPosition.x}
                      y={this.state.backgroundPosition.y}
                      width={this.state.backgroundWidth}
                      height={this.state.backgroundHeight}
                      rx="10"
                      ry="10"/>
                <circle className="pin-point"
                        ref={this.props.getPinPointRef(this.pinNumber)}
                        r="3"
                        cx={this.props.pinPoint.position.x}
                        cy={this.props.pinPoint.position.y}
                        fill={this.props.getColourByPinNo(this.pinNumber)}/>
                <text className={textClasses.join(' ')}
                      ref={this.labelRef}
                      x={this.state.labelPosition.x}
                      y={this.state.labelPosition.y}
                      style={{transform: rotateZDeg, fontSize: fontSize}}>
                    {this.pinNumber}
                </text>
            </g>
        );
    }
}
