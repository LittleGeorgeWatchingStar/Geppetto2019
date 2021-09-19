import {Path} from "../path/Path";
import {Connection} from "./Connection";
import {Polyline, Shape, Vector2D} from "../utils/geometry";
import {PathSpec} from "./PathSpec";
import {ConnectionPathResource} from "./api";
import {SpatialIndexer} from "../path/spatialindexer/SpatialIndexer";

/**
 * A path between two connected buses that must be kept clear of other
 * obstacles to allow room for routing traces.
 *
 * Typically needed for high-speed buses (USB3, PCIe) which have strict
 * routing requirements.
 */
export class ConnectionPath implements PathSpec {
    public constructor(readonly connection: Connection,
                       private _path: Path) {
    }

    public get path(): Path {
        return this._path;
    }

    public get width(): number {
        return this._path.spec.width;
    }

    public get minLength(): number {
        return this._path.spec.minLength;
    }

    public get maxLength(): number {
        return this._path.spec.maxLength;
    }


    public get keepouts(): Polyline[] {
        return this._path.keepouts;
    }

    public get start(): Vector2D {
        return this._path.start;
    }

    public get end(): Vector2D {
        return this._path.end;
    }

    private get nodes(): Vector2D[] {
        return this._path.nodes;
    }

    public get collisions(): Vector2D[] {
        return this._path.collisions;
    }

    public get hasCollisions(): boolean {
        return this.collisions.length > 0;
    }

    public get isValid(): boolean {
        return this._path.isComplete;
    }

    public get length(): number {
        return this._path.length;
    }

    public get isTooLong(): boolean {
        return this._path.isTooLong;
    }

    public requiresChange(spatialIndexer: SpatialIndexer): boolean {
        return !this.isValid ||
            this.hasStartMoved() ||
            this.hasEndMoved() ||
            this.hasCollisionChanges(spatialIndexer);
    }

    private hasStartMoved(): boolean {
        return !this.connection.startPoint.equals(this._path.start);
    }

    private hasEndMoved(): boolean {
        return !this.connection.endPoint.equals(this._path.end);
    }

    private hasCollisionChanges(spatialIndexer: SpatialIndexer): boolean {
        if (!this.isValid) {
          return true;
        }

        // Skip the path start (last keepout), because it will always be on
        // the module the path starts from.
        for (let i = 0; i < this._path.keepouts.length - 1; i++) {
            const keepout = this._path.keepouts[i];

            // Only the 2 keepouts at the path end will be on the module
            // the path ends on.
            if (i <= 1 && keepout.contains(this._path.end)) {
                continue;
            }
            if (spatialIndexer.collides(keepout)) {
                return true;
            }
        }
        return false;
    }

    public toJSON() {
        const board = this.connection.requirer.board;
        return {
            nodes: this.nodes.map(node => {
                return {
                    x: node.x - board.position.x,
                    y: node.y - board.position.y,
                };
            }),
        };
    }

    public toResource(): ConnectionPathResource {
        return {
            nodes: this.nodes,
        };
    }
}