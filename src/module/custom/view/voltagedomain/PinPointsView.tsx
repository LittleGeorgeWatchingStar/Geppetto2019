import * as React from "react";
import {RefObject} from "react";
import {Module} from "../../../Module";
import {PinPointView} from "./PinPointView";
import {AssignableBusColours} from "./AssignableBusColours";
import {CustomerModuleCreate} from "../../CustomerModuleCreate";
import {ViewableModule} from "../../../PinPoint";


interface PinPointsViewProps {
    viewableModule: ViewableModule;
    getColourByPinNumber: (pinNo: string) => string;
    /**
     * Interacting with an external Net will also indicate the respective PinPoint.
     */
    isIndicatingPinPoint: (pinNo: string) => boolean;

    /**
     * A bus being selected will highlight all the pins assigned to that bus.
     */
    isHighlightingPinPoint: (pinNo: string) => boolean;
    onMouseOverPinPoint?: (pinNo: string) => void;
    onMouseOutPinPoint?: () => void;
    onClickPinPoint?: (pinNo: string) => void;
    getPinPointRef: (pinNo: string) => RefObject<SVGCircleElement> | undefined;
    rotation: number;
}

/**
 * A containing view for the PinPoints of a Custom Module.
 * For individual PinPoints,
 * @see PinPointView
 */
export class PinPointsView extends React.Component<PinPointsViewProps> {

    public static defaultProps: Partial<PinPointsViewProps> = {
        onMouseOverPinPoint: () => {},
        onMouseOutPinPoint: () => {},
        onClickPinPoint: () => {},
    };

    private get viewBox(): string {
        const outline = this.props.viewableModule.outline;
        return `${outline.xmin} ${outline.ymin} ${outline.width} ${outline.height}`;
    }

    private get footprintPathD(): string {
        return this.props.viewableModule.polylines.map(polyline => polyline.svgPath()).join(' ');
    }

    private get pinPointViews(): JSX.Element[] {
        const module = this.props.viewableModule;
        return module.pinPoints.map(pinpoint => {
            return <PinPointView key={pinpoint.pinNumber}
                                 getPinPointRef={this.props.getPinPointRef}
                                 pinPoint={pinpoint}
                                 getColourByPinNo={this.props.getColourByPinNumber}
                                 viewData={module}
                                 isIndicating={this.props.isIndicatingPinPoint}
                                 isHighlighting={this.props.isHighlightingPinPoint}
                                 onMouseOver={pinNo => this.props.onMouseOverPinPoint(pinNo)}
                                 onMouseOut={() => this.props.onMouseOutPinPoint()}
                                 onClick={pinNo => this.props.onClickPinPoint(pinNo)}
                                 rotation={this.props.rotation}/>
        });
    }

    render(): JSX.Element {
        return (
            <svg className="module-svg"
                 xmlns="http://www.w3.org/2000/svg"
                 viewBox={this.viewBox}
                 preserveAspectRatio="xMinYMin meet">
                {this.getEdges()}
                <g className="module-svg-outline">
                    <path className="footprint"
                          d={this.footprintPathD}/>
                    <g className="pin-points">
                        {this.pinPointViews}
                    </g>
                </g>
            </svg>
        );
    }

    /**
     * If this module attaches to the edge of the board, show it.
     */
    private getEdges(): JSX.Element[] {
        return this.props.viewableModule.edges.map((edge, i) => {
            return (
                <line key={i}
                      x1={edge[0].x}
                      y1={edge[0].y}
                      x2={edge[1].x}
                      y2={edge[1].y}
                      className="edge"/>);
        });
    }
}
