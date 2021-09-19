import {PlacedLogo} from "../../src/placedlogo/PlacedLogo";
import {DesignRevision} from "../../src/design/DesignRevision";
import {DesignRevisionBuilder} from "../design/DesignRevisionBuilder";
import {Point, Vector2D} from "../../src/utils/geometry";

export const testSvgData = `<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 512 512" style="enable-background:new 0 0 512 512;" xml:space="preserve">
    <g id="glyphicons_x5F_halflings" style="fill: rgb(0, 0, 0); stroke: rgb(0, 0, 0);">
        <g id="map-marker" style="fill: rgb(0, 0, 0); stroke: rgb(0, 0, 0);">
            <path d="M449.8,194.3c0,36.8-12.2,75.5-30.3,112.7c-68.4,106.2-154.8,203.5-154.8,203.5s-99.4-94-163-205.5
                c-15.9-34.8-26.3-71.6-26.3-108.5C75.3,93,159.1,3,262.5,3C366,3,449.8,90.7,449.8,194.3z M360.8,184.6
                c0-53.4-43.2-96.6-96.5-96.6c-53.3,0-96.5,43.2-96.5,96.6c0,53.4,43.2,96.5,96.5,96.5C317.6,281.1,360.8,238,360.8,184.6z" style="fill: rgb(0, 0, 0); stroke: rgb(0, 0, 0);"></path>
        </g>
    </g>
    <g id="Layer_2" style="fill: rgb(0, 0, 0); stroke: rgb(0, 0, 0);">
    </g>
</svg>`;

export class PlacedLogoBuilder {
    private designRevision: DesignRevision;
    private svgData: string;
    private position: Vector2D;
    private width: number;
    private height: number;
    private rotation: number;

    constructor() {
        this.designRevision = new DesignRevisionBuilder().build();
        this.svgData = testSvgData;
        this.position = Point.origin();
        this.width = undefined;
        this.height = undefined;
        this.rotation = 0;
    }

    public withSvgData(svgData: string): PlacedLogoBuilder {
        this.svgData = svgData;
        return this;
    }

    public withDesignRevision(designRev: DesignRevision): PlacedLogoBuilder {
        this.designRevision = designRev;
        return this;
    }

    public withPosition(x: number, y: number): PlacedLogoBuilder {
        this.position = {x: x, y: y};
        return this;
    }

    public withSize(width: number, height: number): PlacedLogoBuilder {
        this.width = width;
        this.height = height;
        return this;
    }

    public withRotation(rotation: number): PlacedLogoBuilder {
        this.rotation = rotation;
        return this;
    }

    public build(): PlacedLogo {
        const pl = this.designRevision.addLogo(this.svgData, this.position);
        if (typeof this.height !== 'undefined' && (typeof this.width !== 'undefined')) {
            pl.resize(this.width, this.height)
        }
        pl.rotateTo(this.rotation);
        return pl;
    }
}