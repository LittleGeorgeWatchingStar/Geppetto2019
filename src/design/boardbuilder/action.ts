import {ReversibleAction} from "../../core/action";
import {PlacedModule} from "../../placedmodule/PlacedModule";
import {FitBoard} from "../../view/actions";
import {CreateDimension} from "../../dimension/actions";
import {PlacementAnalyzer, RotationCalculator} from "../placementanalyzer/PlacementAnalyzer";
import {Module} from "../../module/Module";
import {DesignRevision} from "../DesignRevision";
import {BuildBoardEvent} from "../../workspace/events";
import eventDispatcher from "../../utils/events";
import {PREVIEW3D, REFOCUS} from "../../toolbar/events";
import {COM} from "../../module/Category";
import {EdgePosition} from "../../dimension/Dimensionable";
import {Point, Vector2D} from "../../utils/geometry";
import {Workspace} from "../../workspace/Workspace";
import {ACTION_EXECUTED} from "../../placedmodule/events";
import {Dialog} from "../../view/Dialog";
import DialogManager from "../../view/DialogManager";
import {ConnectionFinder} from "../../connection/ConnectionFinder";
import {openPowerPrompt} from "./PowerFinderDialog";
import events from "../../utils/events";


/**
 * When auto-placing multiple modules from the Board Builder.
 */
export class BuildBoard implements ReversibleAction {

    private placedModules: PlacedModule[];
    private readonly fitBoardAction: FitBoard;
    private dimensionActions: CreateDimension[];
    private placementAnalyzer: PlacementAnalyzer;

    /**
     * @param modules: These are already detailed modules, so querying them and checking "is summary" isn't necessary.
     * @param width: The board width to set. Optional.
     * @param height: The board height.
     */
    constructor(private readonly modules: Module[],
                private readonly designRev: DesignRevision,
                private readonly width?: number,
                private readonly height?: number) {
        this.placedModules = [];
        this.fitBoardAction = new FitBoard(designRev);
        this.placementAnalyzer = new PlacementAnalyzer(designRev);
    }

    static fromEvent(event: BuildBoardEvent): BuildBoard {
        return new BuildBoard(
            event.modules,
            event.designRevision,
            event.width,
            event.height
        );
    }

    public get log(): string {
        return 'Build board';
    }

    execute(): void {
        const loader = this.loadingDialog();
        this.placementAnalyzer.refreshItemBoundary();
        this.applyBoardDimensions();

        // Async so that the loader can appear reliably:
        setTimeout(() => {
            const mountingHoles = [];
            const edgeModules = [];
            for (const module of this.sortedModules) {
                if (module.isMountingHole) {
                    mountingHoles.push(module);
                    continue;
                }
                // TODO: pass over modules with multiple edge constraints for now
                if (module.edgeConstraints.length === 1) {
                    edgeModules.push(module);
                    continue;
                }
                this.autoPlaceModule(module);
            }
            this.fitBoardAction.execute();
            this.placeEdgeModules(edgeModules);
            this.placeMountingHoles(mountingHoles);
            this.connectAll();
            this.finishExecuting();
            loader.close();
        });
    }

    reverse(): void {
        for (const dimensionAction of this.dimensionActions) {
            dimensionAction.reverse();
        }
        this.designRev.removePlacedModules(this.placedModules);
        this.placedModules = [];
        this.fitBoardAction.reverse();
        this.designRev.updateElectrical();
        eventDispatcher.publishEvent(REFOCUS);
    }

    private applyBoardDimensions(): void {
        this.dimensionActions = [];
        this.removePreviousDimensions();
        const board = this.designRev.board;
        if (this.height) {
            const createHeightDim = new CreateDimension(
                this.designRev,
                board.getAnchorByEdge("bottom"),
                board.getAnchorByEdge("top"));
            createHeightDim.execute();
            // *10: mm -> units
            createHeightDim.dimension.setLength(this.height * 10);
            createHeightDim.dimension.toggleLocked();
            this.dimensionActions.push(createHeightDim);
        }

        if (this.width) {
            const createWidthDim = new CreateDimension(
                this.designRev,
                board.getAnchorByEdge("left"),
                board.getAnchorByEdge("right"));
            createWidthDim.execute();
            // *10: mm -> units
            createWidthDim.dimension.setLength(this.width * 10);
            createWidthDim.dimension.toggleLocked();
            this.dimensionActions.push(createWidthDim);
        }
    }

    private removePreviousDimensions(): void {
        const board = this.designRev.board;
        this.designRev.removeDimensionByAnchors(
            board.getAnchorByEdge("bottom"),
            board.getAnchorByEdge("top")
        );
        this.designRev.removeDimensionByAnchors(
            board.getAnchorByEdge("left"),
            board.getAnchorByEdge("right")
        );
    }

    /**
     * If a module is a COM, put it first. Otherwise, sort by largest items first (via area size).
     */
    private get sortedModules(): Module[] {
        return this.modules.sort((a, b) => {
            if (a.categoryName === COM) {
                return -1;
            }
            if (b.categoryName === COM) {
                return 1;
            }
            return b.getArea() - a.getArea();
        });
    }

    private placeEdgeModules(edgeModules: Module[]): void {
        // Orient edge modules to the top edge of the board. Sometimes there are more than one
        // edge constraint. We'll ignore those cases for now.
        const rotationNeeded = (module: Module) => {
            let rotation = 0;
            const edgeConstraints = module.edgeConstraints;
            const constraintName = edgeConstraints[0];
            if (module.edgeConstraints.length === 1) {
                rotation = RotationCalculator.toTop(constraintName);
            }
            return rotation;
        };

        edgeModules.forEach((module) => {
            const position = this.placementAnalyzer.makeEdgePosition(module);
            const pm = this.placeModule(module, position, rotationNeeded(module));
            const realignX = position.x - pm.xMin;
            pm.translateVector({x: realignX, y: 0});
        });
    }

    /**
     * Put any mounting holes in the corners, or, if there are no corners remaining,
     * auto-place them like a regular module.
     */
    private placeMountingHoles(holes: Module[]): void {
        if (holes.length === 0) {
            return;
        }
        holes = holes.sort((a, b) => a.name.localeCompare(b.name));
        const corners = this.placementAnalyzer.findCorners(holes[0]);
        const cornerNames = Object.keys(corners);
        holes.forEach((hole, i) => {
            if (i > cornerNames.length - 1) {
                this.autoPlaceModule(hole);
            } else {
                const corner: string = cornerNames[i];
                const placed = this.placeModule(hole, corners[corner]);
                this.anchorMountingHole(placed, corner);
            }
        });
    }

    private anchorMountingHole(placedHole: PlacedModule, corner: string): void {
        const dimensions = [];
        const anchorBoard = (edge: EdgePosition) => {
            const board = this.designRev.board;
            const dim = new CreateDimension(
                this.designRev,
                board.getAnchorByEdge(edge),
                placedHole.getAnchorByEdge(edge));
            dimensions.push(dim);
        };
        const edges = ['left', 'right', 'top', 'bottom'] as EdgePosition[];
        corner = corner.toLowerCase(); // Eg. 'bottomleft'
        for (const edge of edges) {
            if (corner.includes(edge)) {
                anchorBoard(edge);
            }
        }
        for (const dim of dimensions) {
            dim.execute();
            dim.dimension.setLength(0);
            dim.dimension.toggleLocked();
        }
    }

    private autoPlaceModule(module: Module): void {
        this.placeModule(module, this.getPosition(module));
    }

    private getPosition(module: Module): Point {
        if (this.designRev.hasPlacedItems) {
            return this.placementAnalyzer.getSpace(module);
        }
        let position;
        if (this.width || this.height) {
            position = this.designRev.board.position;
        } else {
            position = this.placementAnalyzer.getSpace(module);
        }
        return Workspace.boardPointSnap(position);
    }

    private placeModule(module: Module, position: Vector2D, rotation?: number): PlacedModule {
        const pm = this.designRev.addModule(module, position, rotation);
        this.placedModules.push(pm);
        this.placementAnalyzer.updateItemBoundary(pm);
        return pm;
    }

    private finishExecuting(): void {
        this.fitBoardAction.execute();
        this.designRev.recomputeFromConnections();
        this.designRev.updateMechanical();
        this.unlockDimensions();
        eventDispatcher.publishEvent(ACTION_EXECUTED);
        eventDispatcher.publishEvent(REFOCUS);
        this.checkPowerRequires();
    }

    private loadingDialog(): Dialog {
        return DialogManager.create(Dialog, {
            title: 'Making your board...'
        }).waiting();
    }

    /**
     * After modules have been placed under the board dimension constraints, we can unlock the dimensions.
     */
    private unlockDimensions(): void {
        for (const action of this.dimensionActions) {
            action.dimension.toggleLocked();
        }
    }

    private connectAll(): void {
        new ConnectionFinder(this.designRev).connectAll();
    }

    private checkPowerRequires(): void {
        const hasUnfulfilledPower = this.designRev.getPlacedModules()
            .some(module => module.getRequires()
                .some(require =>
                    require.isPower() && !require.isReady() && !require.isConnected() && !require.hasExclusions()));
        if (hasUnfulfilledPower) {
            setTimeout(() => openPowerPrompt(), 750);
        } else {
            events.publish(PREVIEW3D);
        }
    }
}