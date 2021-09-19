import {
    SpatialIndexer,
    SpatialIndexerIntersectRectangle,
    SpatialIndexerItemType,
} from "./SpatialIndexer";
import {Circle, Polyline} from "../../utils/geometry";
import * as RBush from "rbush";
import {decomposePolylineToRectangles} from "../../utils/decomposePolylineToRectangles";
import {Path, PathObstacle} from "../Path";
import {Board} from "../../model/Board";

interface BBox extends rbush.BBox {
}

interface ItemBBox extends BBox {
    uuid: string;
    type: SpatialIndexerItemType;
    data?: object;
}

export enum BoundaryEdge {
    TOP = 'top',
    BOTTOM = 'bottom',
    LEFT = 'left',
    RIGHT = 'right',
    TOP_LEFT = 'top-left',
    TOP_RIGHT = 'top-right',
    BOTTOM_LEFT = 'bottom-left',
    BOTTOM_RIGHT = 'bottom-right',
}

export class RBushSpatialIndexerAdaptor implements SpatialIndexer {
    private tree: rbush.RBush<ItemBBox> = RBush();

    public insertBoundary(board: Board): this {
        const items = [];
        const topItem = {
            minX: Number.MIN_SAFE_INTEGER,
            minY: board.y + board.height,
            maxX: Number.MAX_SAFE_INTEGER,
            maxY: Number.MAX_SAFE_INTEGER,
            uuid: 'board',
            type: SpatialIndexerItemType.BOARD,
            data: {edge: BoundaryEdge.TOP},
        };
        const bottomItem = {
            minX: Number.MIN_SAFE_INTEGER,
            minY: Number.MIN_SAFE_INTEGER,
            maxX: Number.MAX_SAFE_INTEGER,
            maxY: board.y,
            uuid: 'board',
            type: SpatialIndexerItemType.BOARD,
            data: {edge: BoundaryEdge.BOTTOM},
        };
        const leftItem = {
            minX: Number.MIN_SAFE_INTEGER,
            minY: board.y,
            maxX: board.x,
            maxY: board.y + board.height,
            uuid: 'board',
            type: SpatialIndexerItemType.BOARD,
            data: {edge: BoundaryEdge.LEFT},
        };
        const rightItem = {
            minX: board.x + board.width,
            minY: board.y,
            maxX: Number.MAX_SAFE_INTEGER,
            maxY: board.y + board.height,
            uuid: 'board',
            type: SpatialIndexerItemType.BOARD,
            data: {edge: BoundaryEdge.RIGHT},
        };
        items.push(topItem);
        items.push(bottomItem);
        items.push(leftItem);
        items.push(rightItem);

        if (board.getCornerRadius()) {
            /** divide boundary radius in to 3 smaller rectangles)
             *        r/2     r/2
             *     +-------+-------+
             *     |       |       | r*(1-sqrt(0.75))
             * r/2 |       +-------+
             *     |       |       |
             *     +---+---+       |
             *     |   |           | r*sqrt(0.75)
             * r/2 |   |           |
             *     |   |           |
             *     +---+-----------o center point
             */
            const sideRecLength = board.getCornerRadius() - (1 - Math.sqrt(0.75));

            // Top left
            const topLeftData = {
                edge: BoundaryEdge.TOP_LEFT,
                circleObject: {
                    _centrePoint: {
                        _x: board.x + board.getCornerRadius(),
                        _y: board.y + board.height - board.getCornerRadius(),
                    },
                    _radius: board.getCornerRadius(),
                }
            };
            items.push({
                minX: board.x,
                minY: board.y + board.height - board.getCornerRadius() / 2,
                maxX: board.x + board.getCornerRadius() / 2,
                maxY: board.y + board.height,
                uuid: 'board',
                type: SpatialIndexerItemType.BOARD,
                data: topLeftData,
            });
            items.push({
                minX: board.x + board.getCornerRadius() / 2,
                minY: board.y + board.height - sideRecLength,
                maxX: board.x + board.getCornerRadius(),
                maxY: board.y + board.height,
                uuid: 'board',
                type: SpatialIndexerItemType.BOARD,
                data: topLeftData,
            });
            items.push({
                minX: board.x,
                minY: board.y + board.height - board.getCornerRadius(),
                maxX: board.x + sideRecLength,
                maxY: board.y + board.height - board.getCornerRadius() / 2,
                uuid: 'board',
                type: SpatialIndexerItemType.BOARD,
                data: topLeftData,
            });

            // Top right
            const topRightData = {
                edge: BoundaryEdge.TOP_RIGHT,
                circleObject: {
                    _centrePoint: {
                        _x: board.x + board.width - board.getCornerRadius(),
                        _y: board.y + board.height - board.getCornerRadius(),
                    },
                    _radius: board.getCornerRadius(),
                }
            };
            items.push({
                minX: board.x + board.width - board.getCornerRadius() / 2,
                minY: board.y + board.height - board.getCornerRadius() / 2,
                maxX: board.x + board.width,
                maxY: board.y + board.height,
                uuid: 'board',
                type: SpatialIndexerItemType.BOARD,
                data: topRightData,
            });
            items.push({
                minX: board.x + board.width - board.getCornerRadius(),
                minY: board.y + board.height - sideRecLength,
                maxX: board.x + board.width - board.getCornerRadius() / 2,
                maxY: board.y + board.height,
                uuid: 'board',
                type: SpatialIndexerItemType.BOARD,
                data: topRightData,
            });
            items.push({
                minX: board.x + board.width - sideRecLength,
                minY: board.y + board.height - board.getCornerRadius(),
                maxX: board.x + board.width,
                maxY: board.y + board.height - board.getCornerRadius() / 2,
                uuid: 'board',
                type: SpatialIndexerItemType.BOARD,
                data: topRightData,
            });

            // Bottom left
            const bottomLeftData = {
                edge: BoundaryEdge.BOTTOM_LEFT,
                circleObject: {
                    _centrePoint: {
                        _x: board.x + board.getCornerRadius(),
                        _y: board.y + board.getCornerRadius(),
                    },
                    _radius: board.getCornerRadius(),
                }
            };
            items.push({
                minX: board.x,
                minY: board.y,
                maxX: board.x + board.getCornerRadius() / 2,
                maxY: board.y + board.getCornerRadius() / 2,
                uuid: 'board',
                type: SpatialIndexerItemType.BOARD,
                data: bottomLeftData,
            });
            items.push({
                minX: board.x + board.getCornerRadius() / 2,
                minY: board.y,
                maxX: board.x + board.getCornerRadius(),
                maxY: board.y + sideRecLength,
                uuid: 'board',
                type: SpatialIndexerItemType.BOARD,
                data: bottomLeftData,
            });
            items.push({
                minX: board.x,
                minY: board.y + board.getCornerRadius() / 2,
                maxX: board.x + sideRecLength,
                maxY: board.y + board.getCornerRadius(),
                uuid: 'board',
                type: SpatialIndexerItemType.BOARD,
                data: bottomLeftData,
            });

            // Bottom right
            const bottomRightData = {
                edge: BoundaryEdge.BOTTOM_RIGHT,
                circleObject: {
                    _centrePoint: {
                        _x: board.x + board.width - board.getCornerRadius(),
                        _y: board.y + board.getCornerRadius(),
                    },
                    _radius: board.getCornerRadius(),
                }
            };
            items.push({
                minX: board.x + board.width - board.getCornerRadius() / 2,
                minY: board.y,
                maxX: board.x + board.width,
                maxY: board.y + board.getCornerRadius() / 2,
                uuid: 'board',
                type: SpatialIndexerItemType.BOARD,
                data: bottomRightData,
            });
            items.push({
                minX: board.x + board.width - board.getCornerRadius(),
                minY: board.y,
                maxX: board.x + board.width - board.getCornerRadius() / 2,
                maxY: board.y + sideRecLength,
                uuid: 'board',
                type: SpatialIndexerItemType.BOARD,
                data: bottomRightData,
            });
            items.push({
                minX: board.x + board.width - sideRecLength,
                minY: board.y + board.getCornerRadius() / 2,
                maxX: board.x + board.width,
                maxY: board.y + board.getCornerRadius(),
                uuid: 'board',
                type: SpatialIndexerItemType.BOARD,
                data: bottomRightData,
            });
        }

        this.tree.load(items);
        return this;
    }

    public insertObstacles(obstacles: PathObstacle[]): this {
        const items = [];

        for (const obstacle of obstacles) {
            for (const keepout of obstacle.pathKeepouts) {
                const subItems = this.polyLineToDecomposedBBoxes(keepout);
                for (const item of subItems) {
                    item['uuid'] = obstacle.uuid;
                    item['type'] = SpatialIndexerItemType.OBSTACLE;
                    items.push(item);
                }
            }
        }
        this.tree.load(items);
        return this;
    }

    public insertPaths(paths: Path[]): this {
        const items = [];
        for (const path of paths) {
            for (let i = 0; i < path.keepouts.length; i++) {
                const keepout = path.keepouts[i];
                const subItems = this.polyLineToDecomposedBBoxes(keepout);
                for (const item of subItems) {
                    item['uuid'] = path.uuid;
                    item['type'] = SpatialIndexerItemType.PATH;
                    item['data'] = {nodeIndex: i};
                    items.push(item);
                }
            }
        }
        this.tree.load(items);
        return this;
    }

    /**
     * This doesn't work all the time (probably do due rounding of floats).
     */
    public removePath(path: Path): this {
        for (const keepout of path.keepouts) {
            const subItems = this.polyLineToDecomposedBBoxes(keepout);
            for (const item of subItems) {
                const itemBBox = {
                    minX: item.minX,
                    minY: item.minY,
                    maxX: item.maxX,
                    maxY: item.maxY,
                    uuid: path.uuid,
                    type: SpatialIndexerItemType.PATH,
                };
                this.tree.remove(itemBBox, (a, b) => {
                    return a.uuid === b.uuid;
                });
            }
        }
        return this;
    }

    public collides(rectangle: Polyline): boolean {
        const bBox = this.polyLineToBBox(rectangle);
        for (const item of this.tree.search(bBox)) {
            if (!this.isBoundaryRadiusItemBBox(item) || this.rectangleCollidesWithBoundaryRadius(rectangle, item)) {
                return true;
            }
        }

        return false;
    }

    public intersects(rectangle: Polyline): string[] {
        const bBox = this.polyLineToBBox(rectangle);
        const results = [];
        for (const item of this.tree.search(bBox)) {
            if (!this.isBoundaryRadiusItemBBox(item) || this.rectangleCollidesWithBoundaryRadius(rectangle, item)) {
                results.push(item.uuid);
            }
        }
        return results;
    }

    public intersectRectangles(rectangle: Polyline): SpatialIndexerIntersectRectangle[] {
        const bBox = this.polyLineToBBox(rectangle);
        const results = [];
        for (const item of this.tree.search(bBox)) {
            if (!this.isBoundaryRadiusItemBBox(item) || this.rectangleCollidesWithBoundaryRadius(rectangle, item)) {
                results.push({
                    uuid: item.uuid,
                    type: item.type,
                    rectangle: this.bBoxToPolyline(item),
                    data: item.data,
                });
            }
        }
        return results;
    }

    private isBoundaryRadiusItemBBox(item: ItemBBox): boolean {
        if (item.type !== SpatialIndexerItemType.BOARD) {
            return false;
        }

        return item.data['edge'] === BoundaryEdge.TOP_LEFT ||
            item.data['edge'] === BoundaryEdge.TOP_RIGHT ||
            item.data['edge'] === BoundaryEdge.BOTTOM_LEFT ||
            item.data['edge'] === BoundaryEdge.BOTTOM_RIGHT;
    }

    private rectangleCollidesWithBoundaryRadius(rectangle: Polyline, item: ItemBBox) {
        const circle = Circle.fromObject(item.data['circleObject']);
        return rectangle.points.some(point => {
            // Don't care about anything outside of the itemBBox.
            const isOutsideItem = point.x > item.maxX || point.y > item.maxY ||
                point.x < item.minX || point.y < item.minY;
            if (isOutsideItem) {
                return false;
            }

            return !circle.contains(point);
        });
    }

    public toJSON(): any {
        return this.tree.toJSON();
    }

    public fromJSON(data: any): this {
        this.tree.fromJSON(data);
        return this;
    }

    public clone(): RBushSpatialIndexerAdaptor {
        const treeData = JSON.parse(JSON.stringify(this.toJSON()));
        return new RBushSpatialIndexerAdaptor().fromJSON(treeData);
    }

    private polyLineToBBox(polyline: Polyline): BBox {
        const xs = polyline.points.map(point => point.x);
        const ys = polyline.points.map(point => point.y);
        return {
            minX: Math.min(...xs),
            minY: Math.min(...ys),
            maxX: Math.max(...xs),
            maxY: Math.max(...ys),
        };
    }

    private bBoxToPolyline(bBox: BBox): Polyline {
        return new Polyline([
            {x: bBox.minX, y: bBox.minY},
            {x: bBox.minX, y: bBox.maxY},
            {x: bBox.maxX, y: bBox.maxY},
            {x: bBox.maxX, y: bBox.minY},
        ]);
    }

    private polyLineToDecomposedBBoxes(polyline: Polyline): BBox[] {
        const rectangles = decomposePolylineToRectangles(polyline);
        return rectangles.map(rectangle => this.polyLineToBBox(rectangle));
    }
}
