import {FeatureResource} from "../../../src/module/feature/api";
import {Vector2D} from "../../../src/utils/geometry";

export class FootprintBuilder {
    private moduleUuid: string;
    private lines: FeatureResource[];

    constructor() {
        this.moduleUuid = 'uuiduuid-uuid-uuid-uuid-uuiduuiduuid';
        this.rectangle(100, 100);
    }

    public rectangle(width: number, height): this {
        return this.withPoints([
            {x: 0, y: 0},
            {x: width, y: 0},
            {x: width, y: height},
            {x: 0, y: height},
        ]);
    }

    public withPoints(points: Vector2D[]): this {
        this.lines = [];
        for (let currIdx = 0; currIdx < points.length; currIdx++) {
            const nextIdx = (currIdx + 1) % points.length;
            const current = points[currIdx];
            const next = points[nextIdx];
            this.lines.push({
                id: currIdx + 1,
                type: 'footprint',
                points: [current, next]
            });
        }
        return this;
    }

    public build(): FeatureResource[] {
        return this.lines.slice();
    }
}
