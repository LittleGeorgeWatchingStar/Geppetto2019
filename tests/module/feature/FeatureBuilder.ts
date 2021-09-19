import {Feature} from "../../../src/module/feature/Feature";
import {FeatureResource, LineType} from "../../../src/module/feature/api";
import {ServerID} from "../../../src/model/types";
import {Vector2D} from "../../../src/utils/geometry";
import {PlacedModuleBuilder} from "../../placedmodule/PlacedModuleBuilder";


export class FeatureBuilder implements FeatureResource {

    /**
     * Make customizable test instances of Feature, such as footprint, shadow
     */

    id: ServerID;
    type: LineType;
    points: Vector2D[];

    constructor() {
        this.id = 200;
        this.type = 'footprint';
        this.points = [
            {x: 40, y: 35},
            {x: 40, y: 60},
        ];
    }

    public build(): Feature {
        return new Feature(this.resource());
    }

    public resource(): FeatureResource {
        return {
            id: this.id,
            type: this.type,
            points: this.points,
        }
    }

    public withId(id: ServerID): FeatureBuilder {
        this.id = id;
        return this;
    }

    public withType(type: LineType): FeatureBuilder {
        this.type = type;
        return this;
    }

    public withPoints(points: Vector2D[]): FeatureBuilder {
        this.points = points.slice();
        return this;
    }

    static footprint(): Feature {
        return new FeatureBuilder().withType('footprint').build();
    }

    static shadow(): Feature {
        return new FeatureBuilder().withType('shadow').build();
    }

    static edge(): Feature {
        return new FeatureBuilder().withType('edge').build();
    }

    static feature(): Feature {
        return new FeatureBuilder().withType('feature').build();
    }
}
