import {executeAction, ReversibleAction} from "../core/action";
import {DesignRevision} from "../design/DesignRevision";
import {PlacedModuleResource} from "../placedmodule/api";
import {PlacedLogoResource} from "../placedlogo/api";
import {Point, Vector2D} from "../utils/geometry";
import {PlacedItem} from "./PlacedItem";
import {ACTION_EXECUTED} from "../placedmodule/events";
import events from "../utils/events";
import {MoveEvent} from "./events";

/**
 * When the user rotates a placed module or logo.
 */
export class RotateBlock implements ReversibleAction {
    private readonly designRevision: DesignRevision;
    private readonly resource: PlacedModuleResource | PlacedLogoResource;
    private readonly originalPosition: Point;
    private newRotation: number;
    private readonly name: string;

    constructor(block: PlacedItem) {
        this.designRevision = block.designRevision;
        this.resource = block.toResource();
        this.originalPosition = block.position;
        this.name = block.name;
    }

    public static addToStack(block: PlacedItem): void {
        executeAction(new RotateBlock(block));
    }

    static fromEvent(event: ModelEvent<PlacedItem>): RotateBlock {
        return new RotateBlock(event.model);
    }

    public get log(): string {
        return `Rotate ${this.name} to ${this.newRotation}°`;
    }

    private get block(): PlacedItem {
        return this.designRevision.getBlockByUuid(this.resource.uuid);
    }

    execute() {
        this.block.rotate();
        this.newRotation = this.block.rotation;
        this.designRevision.updateMechanical();
        events.publishEvent(ACTION_EXECUTED);
    }

    reverse() {
        this.block.rotate();
        this.block.rotate();
        this.block.rotate();
        this.restoreOriginalPosition();
        this.designRevision.updateMechanical();
    }

    private restoreOriginalPosition(): void {
        const diff = this.originalPosition.subtract(this.block.position);
        this.block.translateVector(diff);
    }
}

/**
 * When the user moves a block to a new position on the board.
 */
export class MoveBlock implements ReversibleAction {
    private readonly designRevision: DesignRevision;
    private readonly resource: PlacedModuleResource | PlacedLogoResource;
    private readonly name: string;

    constructor(block: PlacedItem,
                private readonly trans: Vector2D) {
        this.resource = block.toResource();
        this.designRevision = block.designRevision;
        this.name = block.name;
    }

    static toBoardEdge(block: PlacedItem): void {
        const toClosestCorner = block.board.findClosestCornerTranslation(block);
        const x = toClosestCorner.x;
        const y = toClosestCorner.y;
        if (x === 0 || y === 0) return;
        if (Math.abs(x) < Math.abs(y)) {
            MoveBlock.addToStack(block, {x: x, y: 0});
        } else {
            MoveBlock.addToStack(block, {x: 0, y: y});
        }
    }

    static toBoardCorner(block: PlacedItem): void {
        const trans = block.board.findClosestCornerTranslation(block);
        if (trans.x !== 0 || trans.y !== 0) {
            MoveBlock.addToStack(block, trans);
        }
    }

    static addToStack(block: PlacedItem, trans: Vector2D): void {
        executeAction(new MoveBlock(block, trans));
    }

    static fromEvent(event: MoveEvent): MoveBlock {
        return new MoveBlock(event.model, event.translation);
    }

    public get log(): string {
        return `Move ${this.name}`;
    }

    private get block(): PlacedItem {
        return this.designRevision.getBlockByUuid(this.resource.uuid);
    }

    execute(): void {
        this.block.translateVector(this.trans);
        this.block.designRevision.updateMechanical();
        events.publishEvent(ACTION_EXECUTED);
    }

    reverse(): void {
        const reverseTrans = Point.copy(this.trans).multiply(-1);
        this.block.translateVector(reverseTrans);
        this.block.designRevision.updateMechanical();
    }
}
