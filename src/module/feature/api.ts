import {ServerID} from "../../model/types";
import {Vector2D} from "../../utils/geometry";

export type LineType = 'footprint' | 'edge' | 'shadow' | 'feature' | 'pathWall';

/**
 * What feature lines look like from the server API.
 */
export interface FeatureResource {
    id: ServerID;
    /** @deprecated use .id instead */
    feature?: ServerID;
    type: LineType;
    points: Vector2D[];
}
