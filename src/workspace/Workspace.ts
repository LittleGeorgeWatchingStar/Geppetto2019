import GeppettoModel from "model/GeppettoModel";
import {Point, Vector2D} from "../utils/geometry";
import events from "../utils/events";
import {CONTEXT_MODE} from "./events";
import {WorkspaceEventsController} from "./WorkspaceEventsController";
import {closeContext} from "../view/ContextMenu";
import UserController from "../auth/UserController";
import {FeatureFlag} from "../auth/FeatureFlag";


export const enum ContextModes {
    NONE = 0,
    CONNECTING = 1,
    DIMENSIONING = 2
}

export class Workspace extends GeppettoModel {
    public static GRID = 5;
    public static PX_PER_UNIT = 1;
    private static MIN_ZOOM = 0.2;
    private static MAX_ZOOM = 2.0;
    static ZOOM_FACTOR = 0.2;

    constructor(public readonly storeFront: boolean,
                public readonly autoBsp: boolean) {
        super();
    }

    defaults() {
        return {
            zoom: this.getDefaultZoom(),
            debug_features: false,
            context_mode: ContextModes.CONNECTING,
            price_active: false,
            power_active: false,
        }
    }

    public get isPriceActive(): boolean {
        return this.get('price_active');
    }

    public togglePriceActive(): void {
        this.set('price_active', !this.isPriceActive);
        WorkspaceEventsController.getInstance().publish();
    }

    public get isPowerActive(): boolean {
        return this.get('power_active');
    }

    public togglePowerActive(): void {
        this.set('power_active', !this.isPowerActive);
        WorkspaceEventsController.getInstance().publish();
    }

    public get scale(): number {
        return this.getZoom() * Workspace.PX_PER_UNIT;
    }

    checkZoom(zoom: number): boolean {
        return this.inRange(zoom, Workspace.MIN_ZOOM, Workspace.MAX_ZOOM);
    }

    private inRange(value: number, lower_bound: number, upper_bound: number): boolean {
        return value >= lower_bound && value <= upper_bound;
    }

    public resetZoom(): void {
        this.setZoom(this.getDefaultZoom());
    }

    public setZoom(amount: number): void {
        this.set('zoom', amount);
        WorkspaceEventsController.getInstance().publish();
    }

    public getZoom(): number {
        return this.get('zoom');
    }

    public canZoomIn(): boolean {
        const currentZoom = this.getZoom();
        const nextZoom = parseFloat((currentZoom + Workspace.ZOOM_FACTOR).toFixed(1));
        return this.checkZoom(nextZoom);
    }

    public zoomInOnce(): void {
        const currentZoom = this.getZoom();
        const nextZoom = parseFloat((currentZoom + Workspace.ZOOM_FACTOR).toFixed(1));
        if (this.checkZoom(nextZoom)) {
            this.setZoom(nextZoom);
            closeContext();
        }
    }

    public canZoomOut(): boolean {
        const currentZoom = this.getZoom();
        const nextZoom = parseFloat((currentZoom - Workspace.ZOOM_FACTOR).toFixed(1));
        return this.checkZoom(nextZoom);
    }

    public zoomOutOnce(): void {
        const currentZoom = this.getZoom();
        const nextZoom = parseFloat((currentZoom - Workspace.ZOOM_FACTOR).toFixed(1));
        if (this.checkZoom(nextZoom)) {
            this.setZoom(nextZoom);
            closeContext();
        }
    }

    /**
     * The snap-to grid size, in pixels.
     *
     * Takes zoom into account.
     */
    public screenCoordsGrid(): number {
        return this.scale * Workspace.GRID;
    }

    /**
     * Snap an offset in board units to the grid.
     */
    public static boardOffsetSnap(offset: JQuery.Coordinates): JQuery.Coordinates {
        return Workspace.snapOffsetToGrid(offset, Workspace.GRID);
    }

    /**
     * Snap a point in board units to the grid.
     */
    public static boardPointSnap(point: Vector2D) {
        const x = Workspace.snapToGrid(point.x, Workspace.GRID);
        const y = Workspace.snapToGrid(point.y, Workspace.GRID);
        return new Point(x, y);
    }

    /**
     * Snap a scalar value in board units to the grid.
     */
    public static boardValueSnap(coord: number): number {
        return Workspace.snapToGrid(coord, Workspace.GRID);
    }

    private static snapToGrid(coord: number, grid: number) {
        return grid * Math.round(coord / grid);
    }

    /**
     * Snap an offset in pixels to the grid.
     */
    public screenOffsetSnap(offset: JQuery.Coordinates): JQuery.Coordinates {
        const grid = this.screenCoordsGrid();
        return Workspace.snapOffsetToGrid(offset, grid);
    }

    private static snapOffsetToGrid(offset: JQuery.Coordinates, grid: number): JQuery.Coordinates {
        return {
            left: Workspace.snapToGrid(offset.left, grid),
            top: Workspace.snapToGrid(offset.top, grid)
        }
    }

    /**
     * Convert a point in pixels to board units.
     *
     * @param point A point in pixels
     * @return A point in board units (0.1mm)
     */
    public screenPointToBoard(point: Vector2D): Point {
        const x = this.pixelToUnit(point.x);
        const y = this.pixelToUnit(point.y);
        return new Point(x, y);
    }

    /**
     * Converts a measurement in pixels to board units (0.1mm), taking
     * into account the current zoom level.
     */
    private pixelToUnit(pixels: number): number {
        return pixels / this.scale;
    }

    public isConnecting(): boolean {
        return this.mode === ContextModes.CONNECTING;
    }

    public isDimensioning(): boolean {
        return this.mode === ContextModes.DIMENSIONING;
    }

    private get mode(): ContextModes {
        return this.get('context_mode');
    }

    private setMode(mode: ContextModes): void {
        this.set('context_mode', mode);
        WorkspaceEventsController.getInstance().publish();
    }

    public toggleConnecting(): void {
        const mode = this.isConnecting() ? ContextModes.NONE : ContextModes.CONNECTING;
        this.setMode(mode);
        events.publishEvent(CONTEXT_MODE, {mode: mode});
    }

    public toggleDimensioning(): void {
        const mode = this.isDimensioning() ? ContextModes.NONE : ContextModes.DIMENSIONING;
        this.setMode(mode);
        events.publishEvent(CONTEXT_MODE, {mode: mode});
    }

    private getDefaultZoom(): number {
        const isTouchMode = $('body').hasClass('touch-mode-js');
        const isNewUIActive = UserController.getUser().isFeatureEnabled(FeatureFlag.NEW_PLAYGROUND_UI);

        if(isNewUIActive) {
            const boardWidth = $('#board svg').width();

            if(boardWidth) {
                const boardHeight = $('#board svg').height();
                const availableWidth = window.innerWidth - $('.workspace-mode').width() - $('.panel').width();
                const availableHeight = window.innerHeight - $('.tabview-header').height() - $('#footer').height();

                const startRatio = isTouchMode ? 0.8 : 0.6;
                const unitBoardWidth = boardWidth / startRatio / 5;
                const unitBoardHeight = boardHeight / startRatio / 5;

                let newBoardWidth = boardWidth;
                let newBoardHeight = boardHeight;
                let maxWidthRatio = startRatio;
                let maxHeightRatio = startRatio;

                while(newBoardWidth < availableWidth) {
                    newBoardWidth += unitBoardWidth;
                    maxWidthRatio += 0.2;
                    if(maxWidthRatio > 2) maxWidthRatio = 2;
                }

                while(newBoardHeight < availableHeight) {
                    newBoardHeight += unitBoardHeight;
                    maxHeightRatio += 0.2;
                    if(maxHeightRatio > 2) maxHeightRatio = 2;
                }

                if(maxWidthRatio > maxHeightRatio) return  maxHeightRatio;
                return maxWidthRatio;
            }

            return isTouchMode ? 0.8 : 0.6;
        }

        return isTouchMode ? 0.8 : 0.6;
    }
}