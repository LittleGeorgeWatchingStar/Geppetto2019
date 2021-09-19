import events from "utils/events";
import eventDispatcher from "utils/events";
import {executeAction, ReversibleAction} from "../core/action";
import {DesignRevision} from "../design/DesignRevision";
import {
    ACTION_EXECUTED,
    PLACED_MODULE_LOADED,
    PlacedModuleEvent,
    PM_SUBSTITUTE_FINISH
} from "../placedmodule/events";
import {PlacedModule} from "../placedmodule/PlacedModule";
import {Point, Vector2D} from "../utils/geometry";
import {Workspace} from "../workspace/Workspace";
import {ModulePlacementEvent, REMOVE_MODULE_FINISH} from "./events";
import {Module} from "./Module";
import {
    ConnectionMapper,
    ReconnectionLogger
} from "../connection/ConnectionMapper";
import DialogManager from "../view/DialogManager";
import {Dialog} from "../view/Dialog";
import {
    ConnectionResource,
    ExplicitRequireNoConnectionResource
} from "../connection/api";
import {DimensionResource} from "../dimension/api";
import {PlacedModuleResource} from "../placedmodule/api";
import ModuleController from "./ModuleController";
import {Dimension} from "../dimension/Dimension";
import {Connection} from "../connection/Connection";
import {PowerBoardEvent} from "../workspace/events";
import {PREVIEW3D} from "../toolbar/events";
import {FitBoard} from "../view/actions";
import {
    PlacementAnalyzer,
    RotationCalculator
} from "../design/placementanalyzer/PlacementAnalyzer";
import ConnectionController from "../connection/ConnectionController";
import {ServerID} from "../model/types";
import {RequireBus} from "../bus/RequireBus";
import {ExplicitRequireNoConnection} from "../connection/ExplicitRequireNoConnection";


export class RemoveModules implements ReversibleAction {
    private readonly removeActions: RemoveModule[];

    constructor(private readonly modulesToRemove: PlacedModule[]) {
        this.removeActions = [];
        for (const pm of this.modulesToRemove) {
            const action = new RemoveModule(pm);
            this.removeActions.push(action);
        }
    }

    /**
     * Execute this action, adding it to the undo stack.
     */
    static addToStack(modulesToRemove: PlacedModule[]): void {
        executeAction(new RemoveModules(modulesToRemove));
    }

    public get log(): string {
        return `Remove ${this.modulesToRemove.map(m => m.name).join(', ')}`;
    }

    public findConnector(): PlacedModule | undefined {
        return this.modulesToRemove.find(m => m.module.isPowerConnector);
    }

    execute(): void {
        for (const action of this.removeActions) {
            action.execute();
        }
    }

    reverse(): void {
        for (const action of this.removeActions) {
            action.reverse();
        }
    }
}


/**
 * When adding power modules with the PowerFinder.
 * While this only establishes power connections from the design revision placed modules,
 * it'll attempt to complete all requires on modules sent from PowerFinder itself.
 */
export class PowerBoard implements ReversibleAction {

    private pmResources: PlacedModuleResource[] | undefined;

    /**
     * FitBoard keeps track of the previous board size.
     */
    private readonly fitBoardAction: FitBoard;
    private placementAnalyzer: PlacementAnalyzer;

    constructor(private readonly modules: Module[],
                private readonly designRev: DesignRevision,
                private readonly removeExisting: RemoveModules,
                private readonly open3D: boolean) {
        this.fitBoardAction = new FitBoard(designRev);
        this.placementAnalyzer = new PlacementAnalyzer(designRev);
        this.modules.sort((a, b) => {
            if (a.isPowerConnector) {
                return -1;
            } else if (b.isPowerConnector) {
                return 1;
            }
        });
    }

    static fromEvent(event: PowerBoardEvent): PowerBoard {
        return new PowerBoard(
            event.modules,
            event.designRevision,
            event.removeExisting,
            event.open3D
        );
    }

    public get log(): string {
        return 'Add power modules';
    }

    execute(): void {
        this.removeExisting.execute();
        this.placementAnalyzer.refreshItemBoundary();
        const existingPMs = this.designRev.getPlacedModules();
        const placedPowerModules = this.placeModules();
        this.connect(existingPMs, true); // True: connect power requires only.
        this.connect(placedPowerModules, false);
        this.finishExecuting();
    }

    reverse(): void {
        const pms = this.pmResources.map(pmResource => {
            return this.designRev.getPlacedModuleByUuid(pmResource.uuid);
        });
        this.designRev.removePlacedModules(pms);
        this.fitBoardAction.reverse();
        this.removeExisting.reverse();
        this.designRev.updateElectrical();
    }

    private finishExecuting(): void {
        this.fitBoardAction.execute();
        this.designRev.recomputeFromConnections();
        this.designRev.updateMechanical();
        if (this.open3D) {
            setTimeout(() => {
                events.publish(PREVIEW3D);
            }, 1000);
        }
    }

    /**
     * @param modules: The modules to connect.
     * @param powerOnly: If only power requires should be connected?
     */
    private connect(modules: PlacedModule[], powerOnly: boolean) {
        for (const module of modules) {
            for (const other of this.designRev.getPlacedModules()) {
                if (module.uuid === other.uuid) {
                    continue;
                }
                for (const require of module.getRequires()) {
                    if (require.isConnected() || (powerOnly && !require.isPower())) {
                        continue;
                    }
                    const provide = other.getCompatibleProvide(require);
                    if (provide) {
                        this.designRev.connectPair(require, provide);
                        this.designRev.updateElectrical();
                    }
                }
            }
        }
    }

    private placeModules(): PlacedModule[] {
        let placedPowerModules: PlacedModule[];
        if (this.pmResources) {
            placedPowerModules = this.placeModuleFromResources();
        } else {
            placedPowerModules = this.autoPlaceModules();
            this.pmResources = placedPowerModules.map(pm => pm.toResource());
        }
        return placedPowerModules;
    }

    private placeModuleFromResources(): PlacedModule[] {
        const placedModules: PlacedModule[] = [];
        for (let i = 0; i < this.pmResources.length; i++) {
            const pmResource = this.pmResources[i];
            const module = this.modules[i];
            placedModules.push(this.designRev.addPlacedModuleFromResource(pmResource, module));
        }
        return placedModules;
    }

    private autoPlaceModules(): PlacedModule[] {
        const placedModules: PlacedModule[] = [];

        for (const module of this.modules) {
            const pm = this.autoPlaceModule(module);
            placedModules.push(pm);
        }
        return placedModules;
    }

    private autoPlaceModule(module: Module): PlacedModule {
        let pm: PlacedModule;
        if (module.isPowerConnector) {
            pm = this.placeConnector(module);
        } else {
            const position = this.placementAnalyzer.getSpace(module);
            pm = this.designRev.addModule(module, position);
        }
        this.placementAnalyzer.updateItemBoundary(pm);
        return pm;
    }

    private placeConnector(module: Module): PlacedModule {
        const previousConnector = this.removeExisting.findConnector();
        let position;
        let rotation;
        if (!previousConnector) {
            position = this.placementAnalyzer.makeEdgePosition(module);
        } else {
            position = previousConnector.position;
            rotation = previousConnector.rotation;
        }
        return this.designRev.addModule(module, position, rotation);
    }
}


/**
 * When a module is auto-placed to the board from double-click.
 * This can potentially change the board size, so we need to be able to restore the board on undo.
 */
export class AutoPlaceModule implements ReversibleAction {
    private addModuleAction: AddModule;
    private placementAnalyzer: PlacementAnalyzer;

    /**
     * FitBoard keeps track of the previous board size.
     */
    private resizeBoard: FitBoard;

    constructor(private readonly module: Module,
                private readonly designRev: DesignRevision) {
        this.resizeBoard = new FitBoard(designRev);
        this.placementAnalyzer = new PlacementAnalyzer(designRev);
    }

    static addToStack(module: Module, designRev: DesignRevision): void {
        executeAction(new AutoPlaceModule(module, designRev));
    }

    public get log(): string {
        return `Add ${this.module.name}`;
    }

    execute() {
        this.placementAnalyzer.refreshItemBoundary();
        if (this.module.edgeConstraints.length > 0) {
            this.placeEdgeModule();
            return;
        }
        let position;
        if (this.module.isMountingHole) {
            position = this.placementAnalyzer.findNextCorner(this.module);
        } else {
            position = this.placementAnalyzer.getSpace(this.module);
        }
        position = Workspace.boardPointSnap(position);
        this.placeModule(position);
    }

    reverse() {
        this.addModuleAction.reverse();
        this.resizeBoard.reverse();
    }

    private placeEdgeModule(): void {
        if (this.module.edgeConstraints.length > 1) {
            this.placeModule({x: 0, y: 0});
            return;
        }
        let position = this.placementAnalyzer.makeEdgePosition(this.module);
        position = Workspace.boardPointSnap(position);
        this.placeModule(position);
        const pm = this.addModuleAction.findPlacedModule();
        const rotationNeeded = RotationCalculator.toTop(this.module.edgeConstraints[0]);
        pm.rotateTo(rotationNeeded);
        const realignX = position.x - pm.xMin;
        pm.translateVector({x: realignX, y: 0});
    }

    private placeModule(position: Vector2D): void {
        this.addModuleAction = new AddModule(this.module, this.designRev, position);
        this.addModuleAction.execute();
    }
}


/**
 * When a module is added to the board.
 */
export class AddModule implements ReversibleAction {
    private readonly position: Point;
    private pmResource: PlacedModuleResource;

    // Data used to find the "RequireToConnect".
    private requireToConnectPmResource: PlacedModuleResource | null = null;
    private requireToConnectBusId: ServerID | null = null;

    private oldConnectionResources: ConnectionResource[] = [];
    private oldNoConnectionResources: ExplicitRequireNoConnectionResource[] = [];

    private provideConnectionResources: ConnectionResource[];
    private requireConnectionResources: ConnectionResource[];
    private requireNoConnectionResources: ExplicitRequireNoConnectionResource[];

    private dimensionResources: DimensionResource[];

    constructor(private readonly module: Module,
                private readonly designRevision: DesignRevision,
                position: Vector2D) {
        this.position = Point.copy(position);
    }

    static fromEvent(event: ModulePlacementEvent): AddModule {
        return new AddModule(event.model,
            event.designRevision,
            event.position);
    }

    static addToStack(module: Module, designRev: DesignRevision, position: Vector2D) {
        executeAction(new AddModule(module, designRev, position));
    }

    public get log(): string {
        return `Add ${this.module.name}`;
    }

    public findPlacedModule(): PlacedModule | undefined {
        return this.designRevision.getPlacedModuleByUuid(this.pmResource.uuid);
    }

    private findRequireToConnect(): RequireBus | undefined {
        if (!this.requireToConnectPmResource || !this.requireToConnectBusId) {
            return undefined;
        }

        const pm = this.designRevision
            .getPlacedModuleByUuid(this.requireToConnectPmResource.uuid);

        if (!pm) {
            return undefined;
        }

        return pm.getRequireById(this.requireToConnectBusId);
    }

    /**
     * Returns Promise to resolve in module substitution.
     * @see FinishReplaceModule.execute
     */
    execute(): Promise<PlacedModule> {
        return new Promise<PlacedModule>((resolve, reject) => {
            let pm;
            if (this.pmResource) {
                pm = this.designRevision.addPlacedModuleFromResource(this.pmResource, this.module);
                if (pm.module.isSummary) {
                    pm.initBuses();
                }
                this.restoreConnections();
                this.restoreNoConnections();
                this.restoreDimensions();
                this.designRevision.updateMechanical();
                this.designRevision.updateElectrical();
                resolve(pm);
            } else {
                const requireToConnect = ConnectionController.getRequireToConnect();
                const shouldAutoSelect = null == requireToConnect;

                if (requireToConnect) {
                    this.requireToConnectBusId = requireToConnect.getId();
                    this.requireToConnectPmResource = requireToConnect.getPlacedModule().toResource();

                    const oldConnection = requireToConnect.getConnection();
                    if (oldConnection) {
                        this.oldConnectionResources.push(oldConnection.toResource());
                    }
                    const oldNoConnection = requireToConnect.getNoConnection();
                    if (oldNoConnection) {
                        this.oldNoConnectionResources.push(oldNoConnection.toResource());
                    }
                    requireToConnect.getExclusions().forEach(exclusion => {
                        const exclusionConnection = exclusion.getConnection();
                        if (exclusionConnection) {
                            this.oldConnectionResources.push(exclusionConnection.toResource());
                        }
                        const exclusionNoConnection = exclusion.getNoConnection();
                        if (exclusionNoConnection) {
                            this.oldNoConnectionResources.push(exclusionNoConnection.toResource());
                        }
                    });
                }

                pm = this.designRevision.addModule(this.module, this.position);
                this.pmResource = pm.toResource();

                const requireInitBuses = pm.module.isSummary;
                ModuleController.loadDetailedModule(this.module)
                    .then(() => {
                        if (requireInitBuses) {
                            pm.initBuses();
                        }
                        this.finishExecuting();
                        resolve(pm);
                        if (shouldAutoSelect) {
                            this.designRevision.selectPlacedItem(pm);
                        }
                    })
                    .catch(() => {
                        this.designRevision.removePlacedModule(pm);
                        DialogManager.create(Dialog, {
                            title: 'Error',
                            html: 'Failed to load module from server.'
                        }).alert();
                        reject();
                    });
            }
        });
    }

    finishExecuting(): void {
        this.designRevision.updateElectrical();
        this.designRevision.updateMechanical();
        const pm = this.findPlacedModule();
        if (!pm) {
            // The placed module could have been deleted by the time this loads.
            return;
        }
        this.provideConnectionResources = pm.providedConnections
            .map(connection => {
                return connection.toResource();
            });
        this.requireConnectionResources = pm.requiredConnections
            .map(connection => {
                return connection.toResource();
            });
        this.requireNoConnectionResources = pm.requireNoConnections
            .map(noConnection => {
                return noConnection.toResource();
            });
        this.dimensionResources = pm.constraints
            .filter(dim => {
                return !dim.isEdgeConstraint();
            }).map(dim => {
                return dim.toResource();
            });
        eventDispatcher.publishEvent(PLACED_MODULE_LOADED, {
            model: pm,
        });
    }

    reverse(): void {
        const pm = this.findPlacedModule();
        this.pmResource = pm.toResource();
        this.designRevision.removePlacedModule(pm);
        eventDispatcher.publishEvent(REMOVE_MODULE_FINISH, {model: pm});

        if (this.oldConnectionResources.length) {
            this.designRevision.addConnectionsFromResources(this.oldConnectionResources);
            this.designRevision.recomputeFromConnections();
        } else {
            this.designRevision.computePathIntersections();
        }
        if (this.oldNoConnectionResources.length) {
            this.designRevision.addNoConnectionsFromResources(this.oldNoConnectionResources);
        }

        const requireToConnect = this.findRequireToConnect();
        if (requireToConnect) {
            requireToConnect.autoConnectVlogicPower();
        }
    }

    private restoreConnections(): void {
        this.restoreProvidedConnections();
        this.restoreRequiredConnections();
    }

    private restoreProvidedConnections(): void {
        this.designRevision.addConnectionsFromResources(this.provideConnectionResources);
    }

    private restoreRequiredConnections(): void {
        this.designRevision.addConnectionsFromResources(this.requireConnectionResources);
    }

    private restoreNoConnections(): void {
        this.designRevision.addNoConnectionsFromResources(this.requireNoConnectionResources);
    }

    private restoreDimensions(): void {
        this.designRevision.addDimensionsFromResources(this.dimensionResources);
    }
}

/**
 * When the user deletes a placed module from the design.
 */
export class RemoveModule implements ReversibleAction {
    private readonly designRevision: DesignRevision;
    private readonly pmResource: PlacedModuleResource;
    private readonly module: Module;
    private readonly provideConnectionResources: ConnectionResource[];
    private readonly requireConnectionResources: ConnectionResource[];
    private readonly requireNoConnectionResources: ExplicitRequireNoConnectionResource[];
    private readonly dimensions: DimensionResource[];

    constructor(placedModule: PlacedModule) {
        this.designRevision = placedModule.designRevision;
        this.pmResource = placedModule.toResource();
        this.module = placedModule.module;
        this.provideConnectionResources = placedModule.providedConnections
            .map((connection: Connection) => {
                return connection.toResource();
            });
        this.requireConnectionResources = placedModule.requiredConnections
            .map((connection: Connection) => {
                return connection.toResource();
            });
        this.requireNoConnectionResources = placedModule.requireNoConnections
            .map((noConnection: ExplicitRequireNoConnection) => {
                return noConnection.toResource();
            });
        this.dimensions = placedModule.constraints
            .filter((dimension: Dimension) => {
                return !dimension.isEdgeConstraint();
            }).map((dimension: Dimension) => {
                return dimension.toResource();
            });
    }

    static fromEvent(event: PlacedModuleEvent): RemoveModule {
        return new RemoveModule(event.model);
    }

    public get log(): string {
        return `Remove ${this.pmResource.module_name}`;
    }

    execute(): void {
        const pm = this.designRevision.getPlacedModuleByUuid(this.pmResource.uuid);
        this.designRevision.removePlacedModule(pm);
        eventDispatcher.publishEvent(REMOVE_MODULE_FINISH, {model: pm});
    }

    /**
     * Reversing a removal is tricky because we have to restore not just
     * the module, but its connections and dimensions, too.
     */
    reverse(): void {
        const pm = this.designRevision.addPlacedModuleFromResource(this.pmResource,
            this.module);
        this.restoreConnections();
        this.restoreNoConnections();
        this.restoreDimensions();
        this.designRevision.updateMechanical();
        this.designRevision.updateElectrical();
        eventDispatcher.publishEvent(PLACED_MODULE_LOADED, {
            model: pm,
        });
    }

    private restoreConnections(): void {
        this.restoreProvidedConnections();
        this.restoreRequiredConnections();
    }

    private restoreProvidedConnections(): void {
        this.designRevision.addConnectionsFromResources(this.provideConnectionResources);
    }

    private restoreRequiredConnections(): void {
        this.designRevision.addConnectionsFromResources(this.requireConnectionResources);
    }

    private restoreNoConnections(): void {
        this.designRevision.addNoConnectionsFromResources(this.requireNoConnectionResources);
    }

    private restoreDimensions(): void {
        this.designRevision.addDimensionsFromResources(this.dimensions);
    }
}

/**
 * When the user drops a replacement module onto the board.
 *
 * @see Workspace for module replacement start and cancel.
 */
export class FinishReplaceModule implements ReversibleAction {
    private addReplacement: AddModule;
    private removeOriginal: RemoveModule;
    private moduleToReplaceResource: PlacedModuleResource;
    private storedLog: string | undefined;

    constructor(private readonly module: Module,
                private readonly designRevision: DesignRevision,
                private readonly position: Vector2D) {
    }

    static addToStack(module: Module, designRev: DesignRevision, position): void {
        executeAction(new FinishReplaceModule(module, designRev, position));
    }

    public get log(): string {
        return this.storedLog ? this.storedLog : '';
    }

    execute(): void {
        const dialog = this.loadingDialog();
        let original;
        if (this.moduleToReplaceResource) {
            original = this.designRevision.getPlacedModuleByUuid(this.moduleToReplaceResource.uuid);
        } else {
            original = this.designRevision.moduleToReplace;
            this.moduleToReplaceResource = original.toResource();
        }
        this.addReplacement = new AddModule(this.module, this.designRevision, this.position);
        this.removeOriginal = new RemoveModule(original);

        // Make replacement asynchronous so that the loading dialog is reliable.
        setTimeout(() => {
            this.addReplacement.execute().then((replacement: PlacedModule) => {
                this.storedLog = `Replace ${this.moduleToReplaceResource.module_name} with ${replacement.name}`;
                const logger = this.getLogger(replacement);
                new ConnectionMapper(replacement, original, logger).reconnect();
                this.removeOriginal.execute();
                dialog.close();
                logger.createDialog();
                events.publishEvent(PM_SUBSTITUTE_FINISH);
                events.publishEvent(ACTION_EXECUTED);
            });
        });
    }

    reverse(): void {
        this.addReplacement.reverse();
        this.removeOriginal.reverse();
    }

    private loadingDialog(): Dialog {
        return DialogManager.create(Dialog, {
            title: 'Substituting...'
        }).waiting();
    }

    private getLogger(replacement: PlacedModule): ReconnectionLogger {
        const title = `Connected ${replacement.name}`;
        return new ReconnectionLogger(title);
    }
}
