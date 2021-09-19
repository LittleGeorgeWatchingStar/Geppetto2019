import * as React from "react";
import {Vector2D} from "../../../../utils/geometry";

interface NetToPinLineProps {
    canvasElement: SVGSVGElement;
    netElement: HTMLDivElement;
    pinPointElement: SVGCircleElement;
}

export class NetToPinLine extends React.Component<NetToPinLineProps> {
    private get start(): Vector2D {
        const canvasRect = this.props.canvasElement.getBoundingClientRect();
        const netNodeRect = this.props.netElement.getBoundingClientRect();
        return {
            x: netNodeRect.right - canvasRect.left,
            y: (netNodeRect.top + netNodeRect.bottom) / 2  - canvasRect.top,
        }
    }

    private get end(): Vector2D {
        const canvasRect = this.props.canvasElement.getBoundingClientRect();
        const pinPointRect = this.props.pinPointElement.getBoundingClientRect();

        return {
            x: (pinPointRect.left + pinPointRect.right) / 2 - canvasRect.left,
            y: (pinPointRect.top + pinPointRect.bottom) / 2 - canvasRect.top,
        }
    }

    private get d(): string {
        return `M${this.start.x} ${this.start.y} Q ${this.end.x} ${this.start.y} ${this.end.x} ${this.end.y}`
    }

    render() {
        return (
            <path d={this.d}/>
        );
    }
}
