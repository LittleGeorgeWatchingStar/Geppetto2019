import {Anchor} from "./Anchor";
import {AnchorResource} from "./api";
import {EdgePosition} from "../Dimensionable";
import {PlacedLogo} from "../../placedlogo/PlacedLogo";
import {Line, Point} from "../../utils/geometry";

const type: string = 'logo';

export class LogoAnchor extends Anchor {
    protected _dimensionable: PlacedLogo;
    private _edge: EdgePosition;

    constructor(placedLogo: PlacedLogo, edge: EdgePosition) {
        super();
        this._dimensionable = placedLogo;
        this._edge = edge;
        this.initAnchorPoints();
    }

    get edge(): EdgePosition {
        return this._edge;
    }

    private initAnchorPoints() {
        const x1 = 0;
        const y1 = 0;
        const x2 = this._dimensionable.width;
        const y2 = this._dimensionable.height;
        let line: Line;
        switch(this._edge) {
            case 'top':
                line = new Line(new Point(x1, y2), new Point(x2, y2));
                break;
            case 'right':
                line = new Line(new Point(x2, y1), new Point(x2, y2));
                break;
            case 'bottom':
                line = new Line(new Point(x1, y1), new Point(x2, y1));
                break;
            case 'left':
                line = new Line(new Point(x1, y1), new Point(x1, y2));
                break;
        }
        let rotation = this._dimensionable.rotation;
        while (rotation > 0) {
            line = line.rotate();
            rotation -= 90;
        }
        this.setPoints(line.start, line.end);
    }

    public toJSON() {
        return {
            type: type,
            logo_uuid: this._dimensionable.uuid,
            edge: this._edge
        };
    }

    public toResource(): AnchorResource {
        return {
            type: type,
            logo_uuid: this._dimensionable.uuid,
            edge: this._edge
        };
    }
}

export function createLogoAnchor(placedLogo: PlacedLogo, edge: EdgePosition): LogoAnchor {
    return new LogoAnchor(placedLogo, edge);
}