import {ModelSaveOptions} from "backbone";
import {ConnectionCollection} from "connection/ConnectionCollection";
import errorHandler from "controller/ErrorHandler";
import {DimensionController} from "dimension/DimensionController";
import * as $ from "jquery";
import {Board} from "model/Board";
import Cart from "model/Cart";
import GeppettoModel from "model/GeppettoModel";
import ModuleController from "module/ModuleController";
import * as _ from "underscore";
import events from "utils/events";
import {Polyline, Vector2D} from "utils/geometry";
import {ProvideBus} from "../bus/ProvideBus";
import {RequireBus} from "../bus/RequireBus";
import {Connection} from "../connection/Connection";
import {DRAW_PATHS} from "../connection/events";
import {Dimension, DimensionAttributes} from "../dimension/Dimension";
import {
    createDimensionCollection,
    DimensionCollection
} from "../dimension/DimensionCollection";
import {Module} from "../module/Module";
import {PlacedModuleResource} from "../placedmodule/api";
import {
    PlacedModule,
    PlacedModuleAttributes
} from "../placedmodule/PlacedModule";
import {DimensionResource, DimensionServerResource} from "../dimension/api";
import {DESIGN_LOADED, IMAGE_SAVE_COMPLETE} from "./events";
import {PlacedLogo, PlacedLogoAttributes} from "../placedlogo/PlacedLogo";
import {Dimensionable, EdgePosition} from "../dimension/Dimensionable";
import {
    ConnectionResource,
    ExplicitRequireNoConnectionResource
} from "../connection/api";
import {PlacedLogoResource} from "../placedlogo/api";
import {getDesignRevisionGateway} from "./DesignRevisionGateway";
import {Dialog} from "../view/Dialog";
import DialogManager from "../view/DialogManager";
import User from "../auth/User";
import {ServerID} from "../model/types";
import {Anchor} from "../dimension/Anchor/Anchor";
import {PlacedItem} from "../placeditem/PlacedItem";
import {ExplicitRequireNoConnection} from "../connection/ExplicitRequireNoConnection";
import {ConnectionPath} from "../connection/ConnectionPath";
import {PathFinderWorker} from "../path/PathFinderWorker";
import PathFinder from "../path/PathFinder";
import {ACTION_EXECUTED} from "../placedmodule/events";
import {generateUuid} from "../utils/generateUuid";
import {createSpatialIndexer} from "../path/spatialindexer/SpatialIndexer";
import * as Config from "Config";
import {Overlappable} from "../placeditem/Overlappable";
import {Observable, Subject} from "rxjs";
import {Path} from "../path/Path";
import UserController from "../auth/UserController";
import {FeatureFlag} from "../auth/FeatureFlag";
import PathFinderAllowTwoPathsInOneSpot
    from "../path/PathFinderAllowTwoPathsInOneSpot";
import eventDispatcher from "../utils/events";
import {BLOCK_MOVE, MoveEvent} from "../placeditem/events";

/**
 * When a module is added to this design.
 */
export const EVENT_ADD_MODULE = 'add:placedmodule';

/**
 * When a logo is added to this design.
 */
export const EVENT_ADD_LOGO = 'add:placedlogo';

/**
 * When a dimension constraint is added to this design.
 */
export const EVENT_ADD_DIMENSION = 'add:dimension';

export const EVENT_REMOVE_DIMENSION = 'remove:dimension';

/**
 * When placed items are about to be loaded.
 */
export const INIT_PLACED_ITEMS = 'initPlacedItems';

/**
 * Eg. after the selected require bus has been canceled/connected.
 * @see DesignRevision.resetConnectingModules()
 */
export const RESET_CONNECTING_MODULES = 'connectionReset';

/**
 * A design revision.
 */
export class DesignRevision extends GeppettoModel {
    // TODO: Use one change$ observable once all the subscribers are react components.
    private _changePlacedModules$: Subject<undefined> = new Subject<undefined>();
    public readonly changePlacedModules$: Observable<undefined> = this._changePlacedModules$.asObservable();

    private _board: Board | undefined;
    private _placedModules: PlacedModule[];
    private _placedLogos: PlacedLogo[];
    private connectionCollection: ConnectionCollection;
    private _noConnections: ExplicitRequireNoConnection[];
    private dimensionCollection: DimensionCollection;
    public moduleToReplace: PlacedModule = null;
    private emptyDesign: boolean;

    private _PathFinderWorker: PathFinderWorker = new PathFinderWorker();
    get PathFinderWorker(): PathFinderWorker {
        return this._PathFinderWorker;
    }

    defaults() {
        return {
            title: '1',
            design_title: '',
            design_creator: '',
            design_owner: 0,
            created: null,
            updated: null,
            locked: false,
            uri: '',
            board_url: '',
            product_url: '',
            height: 0,
            width: 0,
            corner_radius: 0,
            radius_locked: false,
            placed_modules: [],
            placed_logos: [],
            connections: [],
            explicit_require_no_connections: [],
            dimensions: [],
            image: '',
            // We never want to delete images, null means 'keep old image'
            image_contents: null,
            // These will be set if during design load, some modules are old
            // or missing.
            hasMissingModule: false,
            hasUpgradedModule: false,
            saving: false,
            dirty: false,
        };
    }

    get urlRoot() {
        return '/api/v3/design/revision/';
    }

    initialize(resource) {
        this._placedModules = [];
        this._placedLogos = [];
        this.connectionCollection = new ConnectionCollection();
        this._noConnections = [];
        this.initializeDimensions();
        this.initializeBoard();
        return this;
    }

    private initializeBoard(): void {
        this._board = new Board();
        this._board.setCornerRadius(this.getCornerRadius());
        this._board.setRadiusLocked(this.isRadiusLocked());
        const height = this.getHeight();
        const width = this.getWidth();
        if (height && width) {
            this._board.resize(width, height);
        }
    }

    public get board(): Board {
        return this._board;
    }

    public clone(): DesignRevision {
        const new_revision: DesignRevision = GeppettoModel.prototype.clone.call(this);
        new_revision._placedModules = this._placedModules;
        new_revision._placedLogos = this._placedLogos;
        new_revision._board = this.board;
        new_revision.connectionCollection = this.connectionCollection;
        new_revision.dimensionCollection = this.dimensionCollection;
        new_revision.dimensionCollection.designRevision = new_revision;
        return new_revision;
    }

    save(attributes?: any, options?: ModelSaveOptions) {
        return GeppettoModel.prototype.save.apply(this, arguments);
    }

    unload() {
        this._placedModules = [];
        this._placedLogos = [];
        this.connectionCollection.clear();
        this.dimensionCollection.clear();
    }

    /**
     * Select a placed item, revealing its requires and allowing it to be moved by the keyboard.
     * Only one placed item can be selected at a time.
     */
    public selectPlacedItem(item: PlacedItem | null): void {
        for (const i of this.placedItems) {
            i.setSelected(i === item);
        }
    }

    public groupSelectPlacedItem(item: PlacedItem | null): void {
        if (item) {
            item.toggleSelected();
        } else {
            for (const i of this.placedItems) {
                i.setSelected(false);
            }
        }
    }

    public temporaryUpdateGroupPlacedItemPosition(item: PlacedItem, translate: Vector2D): void {
        for (const i of this.placedItems) {
            if (i.isSelected && i !== item) {
                i.translateVector(translate);
            }
        }
    }

    public updateGroupPlacedItemPosition(item: PlacedItem, translate: Vector2D): void {
        for (const i of this.placedItems) {
            if (i.isSelected && i !== item) {
                eventDispatcher.publishEvent(BLOCK_MOVE, {
                    model: i,
                    translation: translate
                } as MoveEvent);
            }
        }
    }

    public get selectedItem(): PlacedItem | undefined {
        return this.placedItems.find(i => i.isSelected);
    }

    /**
     * TODO currently, this must be called for WorkspaceView to render properly,
     * even if the design has no placed items.
     */
    public initializePlacedItems(): JQueryPromise<any> {
        this.trigger(INIT_PLACED_ITEMS);
        this.initializePlacedLogos();
        return this.addPlacedModulesToBoard().then(() => this.finalize());
    }

    private initializePlacedLogos(): void {
        const plResources = this.get('placed_logos');
        for (const plResource of plResources) {
            this.addPlacedLogoFromResource(plResource);
        }
    }

    public addPlacedLogoFromResource(resource: PlacedLogoResource): void {
        const attributes = _.clone(resource) as PlacedLogoAttributes;
        attributes.design_revision = this;
        this.addPlacedLogo(attributes);
    }

    /**
     * The root power provider modules. These modules provide power to all
     * other modules on the board.
     */
    public get rootPowerProviders(): PlacedModule[] {
        return this.getPlacedModules()
            .filter(module => module.isPowerRoot);
    }

    initializeDimensions() {
        this.dimensionCollection = createDimensionCollection(this);
        DimensionController.getInstance().reset();
    }

    private addPlacedModulesToBoard(): JQueryPromise<any> {
        return this.loadDetailedModules()
            .done(modules => {
                const moduleMap = this.makeModuleMap(modules);
                for (const pmResource of this.getPlacedModuleResources()) {
                    const moduleRevs = moduleMap[pmResource.module_id];
                    if (!moduleRevs) {
                        this.setHasMissingModule(true);
                        continue;
                    }

                    let moduleRev = moduleRevs[pmResource.revision_no];
                    if (!moduleRev) {
                        this.setHasUpgradedModule(true);
                        moduleRev = this.getNextAvailable(moduleRevs, pmResource.revision_no);
                        if (!moduleRev) {
                            this.setHasMissingModule(true);
                            continue;
                        }
                    }
                    this.addPlacedModuleFromResource(pmResource, moduleRev);
                }
            })
            .fail(() => {
                DialogManager.create(Dialog, {
                    title: 'Error',
                    html: 'Failed to load modules from server.'
                }).alert();
            });
    }

    /**
     * Return a {module_id: Module} object for quick lookup when loading many modules.
     */
    private makeModuleMap(modules: Module[]): { [moduleId: string]: Module } {
        const map = {};
        for (const module of modules) {
            let maxRev = 0;
            if (map[module.moduleId]) {
                map[module.moduleId][module.revisionNo] = module;
            } else {
                map[module.moduleId] = {};
                map[module.moduleId][module.revisionNo] = module;
            }
            if (module.revisionNo > maxRev) {
                maxRev = module.revisionNo;
                map[module.moduleId]['maxRev'] = maxRev;
            }
        }
        return map;
    }

    private getNextAvailable(map, revisionNo): Module | null {
        for (let i = revisionNo; i <= map['maxRev']; i++) {
            if (i in map) {
                return map[i];
            }
        }
        return null;
    }

    private loadDetailedModules(): JQueryPromise<Module[]> {
        const deferred = $.Deferred();

        const modules = [];
        let requireFetch = false;
        for (const pmResource of this.getPlacedModuleResources()) {
            const module = ModuleController.getAvailableRevision(pmResource);
            if (!module || module.isSummary) {
                requireFetch = true;
                break;
            }
            modules.push(module);
        }

        if (!requireFetch) {
            deferred.resolve(modules);
            return deferred.promise();
        }

        const designRevisionGateway = getDesignRevisionGateway();
        const modulesFetching = designRevisionGateway.getDesignRevisionModules(this.id);
        modulesFetching.done(modules => {
            // Cache the modules in the library with the details
            modules = ModuleController.setLibraryModuleAttributes(modules);
            deferred.resolve(modules);
        });
        return deferred.promise();
    }

    public addPlacedModuleFromResource(resource: PlacedModuleResource,
                                       module: Module): PlacedModule {
        const attributes = _.clone(resource) as PlacedModuleAttributes;
        attributes.module = module;
        attributes.design_revision = this;
        return this.addPlacedModule(attributes);
    }

    public get hasPlacedItems(): boolean {
        return this.placedItems.length > 0;
    }

    public get paths(): ConnectionPath[] {
        const paths = [];
        for (const connection of this.connections) {
            if (connection.path) {
                paths.push(connection.path);
            }
        }
        return paths;
    }

    public get pathIgnoredUuidsTable(): { [uuid: string]: string } {
        return this.connectionCollection.pathIgnoredUuidsTable;
    }

    public set pathIgnoredUuidsTable(ignoredUuidsTable: { [uuid: string]: string }) {
        this.connectionCollection.pathIgnoredUuidsTable = ignoredUuidsTable;
    }

    public isNotOverlapping(itemToPlace: Polyline): boolean {
        return this.overlappables.every(item => !item.intersects(itemToPlace));
    }

    getHeight() {
        return this.get('height');
    }

    getWidth() {
        return this.get('width');
    }

    getCornerRadius(): number {
        return this.get('corner_radius');
    }

    isRadiusLocked(): boolean {
        return this.get('radius_locked');
    }

    getProductUrl() {
        return this.get('product_url');
    }

    getBoardUrl() {
        return this.get('board_url');
    }

    public get isLocked() {
        return this.get('locked');
    }

    /**
     * We filter out some placed modules in the design controller. We should
     * clearly not be doing that, but that's how it is right now. This means
     * especially that we have both the "raw" `placed_modules` from the API
     * resource as well as `this.placed_modules`. The latter are the actual
     * placed modules on the board that the user sees. This intentional data
     * DEsynchronization must vanish!
     */
    private getPlacedModuleResources(): PlacedModuleResource[] {
        return this.get('placed_modules');
    }

    updateBoardStatus() {
        this._board.updateStatusFlags(this.getPlacedModules(), this.getPlacedLogos());
    }

    public getBoardPrice(): number {
        return this._board.getPrice();
    }

    /**
     * The total price of all modules in this design.
     *
     * This does not include the price of the PCB itself:
     * @see getBoardPrice
     */
    public getComponentsPrice(): number {
        let total = 0;
        for (const module of this.getPlacedModules()) {
            total += module.getPrice();
        }
        return total;
    }

    public addModule(module: Module,
                     position: Vector2D,
                     rotation?: number,
                     uuid?: string): PlacedModule {
        return this.addPlacedModule({
            design_revision: this,
            module: module,
            x: position.x,
            y: position.y,
            rotation: rotation || 0,
            uuid: uuid
        });
    }

    /**
     *  Add a placed module to this Design Revision.
     */
    private addPlacedModule(attributes: PlacedModuleAttributes): PlacedModule {
        const placedModule = new PlacedModule(attributes);
        this._placedModules.push(placedModule);
        this.trigger(EVENT_ADD_MODULE, placedModule);
        this._changePlacedModules$.next();
        return placedModule;
    }

    public addLogo(svgData: string, position: Vector2D): PlacedLogo {
        return this.addPlacedLogo({
            design_revision: this,
            svg_data: svgData,
            x: position.x,
            y: position.y,
            rotation: 0,
        });
    }

    private addPlacedLogo(attributes: PlacedLogoAttributes): PlacedLogo {
        const placedLogo = new PlacedLogo(attributes);
        this._placedLogos.push(placedLogo);
        this.trigger(EVENT_ADD_LOGO, placedLogo);
        return placedLogo;
    }

    /**
     * Updates collision- and overlap-related things that need to be
     * refreshed when the design changes.
     *
     * TODO: can we make this private eventually?
     */
    public updateMechanical(): void {
        this.computeOverlaps();
        this.computePathIntersections();
    }

    /**
     * Removes `placedModule` from this design.
     */
    public removePlacedModule(placedModule: PlacedModule) {
        const index = this._placedModules.indexOf(placedModule);
        if (index > -1) {
            this._placedModules.splice(index, 1);
            placedModule.remove();
            this.updateElectrical();
            this.updateMechanical();
            this._changePlacedModules$.next();
        }
    }

    public removePlacedModules(placedModules: PlacedModule[]) {
        for (const pm of placedModules) {
            const index = this._placedModules.indexOf(pm);
            if (index > -1) {
                this._placedModules.splice(index, 1);
                pm.remove();
            }
        }
        this.updateElectrical();
        this.updateMechanical();
        this._changePlacedModules$.next();
    }

    /**
     * Removes `placedLogo` from this design.
     */
    removePlacedLogo(placedLogo: PlacedLogo) {
        const index = this._placedLogos.indexOf(placedLogo);
        if (index > -1) {
            this._placedLogos.splice(index, 1);
            placedLogo.remove();
            this.updateMechanical();
        }
    }

    /**
     * True if this design revision contains the given module.
     */
    hasModule(module: Module): boolean {
        return this._placedModules.some((pm: PlacedModule) => pm.module === module);
    }

    push(override: boolean = false) {
        const cart = new Cart({
            designRevision: this
        });

        return cart.save({},
            {url: `${cart.urlRoot}?override=${override}`})
            .done((data) => {
                this.set('locked', true);
                this.set('board_url', data.board_url);
                this.set('product_url', data.product_url);
            });
    }

    isPushed() {
        return this.isLocked;
    }

    connected() {
        return this._board.isConnected();
    }

    public getDimensionsFor(dimensionable: Dimensionable): Dimension[] {
        return this.dimensionCollection.getDimensionsFor(dimensionable);
    }

    /**
     * Removes the given dimension from this design.
     */
    public removeDimension(dimension: Dimension) {
        this.dimensionCollection.remove(dimension);
    }

    public toJSON() {
        return {
            title: this.getTitle(),
            image_contents: this.getImageContents(),
            width: this._board.getWidth(),
            height: this._board.getHeight(),
            corner_radius: this._board.getCornerRadius(),
            radius_locked: this._board.isRadiusLocked(),
            placed_modules: this.placedModulesToJson(),
            placed_logos: this.placedLogosToJson(),
            connections: this.connectionCollection.toJSON(),
            explicit_require_no_connections: this.noConnectionsToJson(),
            dimensions: this.dimensionCollection.toJSON(),
            uprev: this.has('uprev') && this.isPushed(),
        };
    }

    private placedModulesToJson() {
        return this.getPlacedModules().map((pm: PlacedModule) => pm.toJSON());
    }

    private placedLogosToJson() {
        return this.getPlacedLogos().map((pl: PlacedLogo) => pl.toJSON());
    }

    private noConnectionsToJson() {
        return this.getNoConnections()
            .map((noConnection: ExplicitRequireNoConnection) =>
                noConnection.toJSON());
    }

    /**
     * This is actually the revision number. For the design name,
     * @see getDesignTitle
     */
    getTitle() {
        return this.get('title');
    }

    setTitle(title) {
        this.set('title', title);
    }

    getDesignTitle(): string {
        return this.get('design_title');
    }

    setDesignTitle(title: string) {
        this.set('design_title', title);
    }

    public get firstSaved(): string {
        return this.get('created');
    }

    public get lastSaved(): Date {
        return new Date(this.get('updated'));
    }

    public getPlacedModules(): PlacedModule[] {
        return this._placedModules.slice(); // defensive copy
    }

    /**
     * Returns a PlacedItem, AKA a Geppetto 'Block'.
     */
    public getBlockByUuid(uuid: string): PlacedItem | undefined {
        return this.placedItems.find(i => i.uuid === uuid);
    }

    public getPlacedModuleByUuid(uuid: string): PlacedModule | undefined {
        return this._placedModules.find(pm => {
            return pm.uuid === uuid;
        });
    }

    public getPlacedLogos(): PlacedLogo[] {
        return this._placedLogos.slice(); // defensive copy
    }

    public getPlacedLogoByUuid(uuid: string): PlacedLogo | undefined {
        return this._placedLogos.find(pl => {
            return pl.uuid === uuid;
        });
    }

    public getDimensionByUuid(uuid: string): Dimension | undefined {
        return this.dimensionCollection.getDimensionByUuid(uuid)
    }

    public get dimensionables(): Dimensionable[] {
        const board = this.board;
        const placedModules = this.getPlacedModules();
        const placedLogos = this.getPlacedLogos();
        return [board, ...placedModules, ...placedLogos];
    }

    getDesignPermalink() {
        return location.origin + '/#!' + this.getPermalinkBase();
    }

    /**
     * @param isMissing  is there a missing module in this revision?
     */
    setHasMissingModule(isMissing: boolean) {
        this.set({hasMissingModule: isMissing});
    }

    /**
     * Does this design revision have any missing modules?
     */
    hasMissingModule(): boolean {
        return this.get('hasMissingModule');
    }

    /**
     * @param isUpgraded  is there a missing module in this revision?
     */
    setHasUpgradedModule(isUpgraded: boolean) {
        this.set({hasUpgradedModule: isUpgraded});
    }

    /**
     * Does this design revision have any upgraded modules?
     */
    hasUpgradedModule(): boolean {
        return this.get('hasUpgradedModule');
    }

    updateElectrical(): void {
        // Starting with modules that do not provide anything, calculate
        // the bus usage.
        this.updateUsage();

        // Now that we know remaining capacity, calculate the options
        // available to each require bus.
        for (const pm of this.getPlacedModules()) {
            this._updateOptions(pm);
        }

        // Update status flags.
        this.updateStatuses();
    }

    /**
     * Starting with modules that do not provide anything, calculate
     * the bus usage.
     */
    private updateUsage(): void {
        /* Gather all downstream provide buses into a flat list. */
        const flat = [];

        for (const module of this.getPlacedModules()) {
            for (const provide of module.getProvides()) {
                provide.flatten(flat);
            }
        }

        for (const provide of flat) {
            provide.calculateUsed();
        }
    }

    /**
     * Now that we know remaining capacity, calculate the options
     * available to each require bus.
     */
    private _updateOptions(placedModule: PlacedModule): void {
        for (const requireBus of placedModule.getRequires()) {
            this.updateOptionsForRequire(requireBus);
        }
    }

    private updateOptionsForRequire(requireBus: RequireBus): void {
        const options = {};

        for (const provider of this.getPlacedModules()) {
            // A module should not provide for itself
            if (requireBus.belongsTo(provider)) {
                continue;
            }

            const matches = provider.getMatchingProvideBuses(requireBus);

            if (matches.length > 0) {
                options[provider.uuid] = matches;
            }
        }
        requireBus.setOptions(options);
    }

    private updateStatuses(): void {
        for (const placed_module of this.getPlacedModules()) {
            placed_module.updateStatus();
        }
        this.updateBoardStatus();
    }

    /**
     * NOTE: Does not account for paths.
     */
    public computeOverlaps(): void {
        for (const overlappable of this.overlappables) {
            if (overlappable.has_moved || overlappable.overlaps()) {
                overlappable.has_moved = false;
                overlappable.updateOverlaps(this.placedItems);
            }

            if (this.board.isOutOfBounds(overlappable)) {
                overlappable.setOverlaps(true);
            }
        }

        this.updateBoardStatus();
    }

    public get placedItems(): PlacedItem[] {
        return [...this.getPlacedModules(), ...this.getPlacedLogos()]
    }

    public get overlappables(): Overlappable[] {
        return this.placedItems;
    }

    public isOwner(user: User): boolean {
        return this.owner === user.getId();
    }

    private get owner(): ServerID {
        return this.get('design_owner');
    }

    initializePathResources(): void {
        // Only modules, not logos, because you can route wires under a
        // silkscreen logo!
        const placedModules = this.getPlacedModules();
        const obstaclesTable: { [uuid: string]: PlacedItem } = {};
        for (const obstacle of placedModules) {
            obstaclesTable[obstacle.uuid] = obstacle;
        }

        const spatialIndexer = createSpatialIndexer()
            .insertBoundary(this.board)
            .insertObstacles(placedModules);

        for (const connection of this.connections) {
            const pathResource = connection.getResourcePath();
            if (!pathResource) {
                continue;
            }

            const pathSpec = connection.pathSpec;
            const start = connection.startPoint;
            const end = connection.endPoint;
            if (!pathSpec || !start || !end) {
                continue;
            }

            let path = UserController.getUser().isFeatureEnabled(FeatureFlag.PATH_FINDER_PATHS_CONFLICT_METHOD_TOGGLE) ?
                new PathFinderAllowTwoPathsInOneSpot(spatialIndexer).fromNodes(
                    generateUuid(),
                    pathResource.nodes,
                    pathSpec,
                    start,
                    end) :
                new PathFinder(spatialIndexer).fromNodes(
                    generateUuid(),
                    pathResource.nodes,
                    pathSpec,
                    start,
                    end);

            if (!path) {
                continue;
            }

            if (UserController.getUser().isFeatureEnabled(FeatureFlag.PATH_FINDER_PATHS_CONFLICT_METHOD_TOGGLE)) {
                if (path.collisionWithUuids.length > 0) {
                    continue;
                }

            } else {
                let isValid = true;
                for (const uuid of path.collisionWithUuids) {
                    if (obstaclesTable.hasOwnProperty(uuid)) {
                        connection.setOverlaps(true);
                        obstaclesTable[uuid].setOverlaps(true);
                        isValid = false;
                    }

                    if (this.pathIgnoredUuidsTable.hasOwnProperty(uuid)) {
                        connection.setOverlaps(true);
                        isValid = false;
                    } else {
                        this.pathIgnoredUuidsTable[path.uuid] = uuid;
                        this.pathIgnoredUuidsTable[uuid] = path.uuid;

                    }
                }

                if (isValid) {
                    path = new Path({
                        uuid: path.uuid,
                        spec: path.spec,
                        start: path.start,
                        end: path.end,
                        nodes: path.nodes,
                        keepouts: path.keepouts,
                        isComplete: path.isComplete,
                        collisions: [],
                        collisionWithUuids: [],
                        length: path.length,
                        isTooLong: path.isTooLong,
                        blockingPathNodes: [],
                    });
                }
            }

            connection.path = new ConnectionPath(connection, path);

            if (UserController.getUser().isFeatureEnabled(FeatureFlag.PATH_FINDER_PATHS_CONFLICT)) {
                if (path.isComplete) {
                    spatialIndexer.insertPaths([path]);
                }
            }
        }
        events.publishEvent(DRAW_PATHS, {paths: this.paths});
        this.updateBoardStatus();
    }

    /**
     * Calculates all intersections between path and design placed modules
     * in design.
     */
    computePathIntersections(): void {
        const start = performance.now();
        const spatialIndexStart = performance.now();

        // Only modules, not logos, because you can route wires under a
        // silkscreen logo!
        const placedModules = this.getPlacedModules();
        const obstaclesTable: { [uuid: string]: PlacedItem } = {};
        for (const obstacle of placedModules) {
            obstaclesTable[obstacle.uuid] = obstacle;
        }

        const spatialIndexer = createSpatialIndexer()
            .insertBoundary(this.board)
            .insertObstacles(placedModules);

        const pathFinderWorkerAttributes = {
            spatialIndexTreeData: spatialIndexer.toJSON(),
            existingPaths: [],
            findPathAttributes: [],
            ignoredUuidsTable: this.pathIgnoredUuidsTable,
        };

        const spatialIndexEnd = performance.now();
        const pathChangeStart = performance.now();

        const connectionsTable: { [uuid: string]: Connection } = {};
        for (const connection of this.connections) {
            const pathSpec = connection.pathSpec;
            const start = connection.startPoint;
            const end = connection.endPoint;
            if (!pathSpec || !start || !end) {
                continue;
            }

            if (connection.path && !connection.path.requiresChange(spatialIndexer)) {
                pathFinderWorkerAttributes.existingPaths.push(connection.path.path);
                connectionsTable[connection.path.path.uuid] = connection;
                continue;
            }


            // Remove Path as well as it's UUID in the ignoreUuidsTable.
            if (connection.path && this.pathIgnoredUuidsTable.hasOwnProperty(connection.path.path.uuid)) {
                const pathUuid = connection.path.path.uuid;
                const otherPathUuid = this.pathIgnoredUuidsTable[pathUuid];
                delete this.pathIgnoredUuidsTable[pathUuid];
                delete this.pathIgnoredUuidsTable[otherPathUuid];
            }
            connection.path = null;

            const uuid = generateUuid();
            connectionsTable[uuid] = connection;
            pathFinderWorkerAttributes.findPathAttributes.push({
                uuid: uuid,
                spec: pathSpec,
                start: start,
                end: end,
            });
        }

        const pathChangeEnd = performance.now();
        const updateBoardStart = performance.now();

        // Update the board status for connection errors.
        // if new paths needs to be calculated, connections will not be valid
        // while it is being calculated.
        this.updateBoardStatus();

        const updateBoardEnd = performance.now();

        this._PathFinderWorker.terminate();
        if (pathFinderWorkerAttributes.findPathAttributes.length) {

            const workerStart = performance.now();

            this._PathFinderWorker.findPaths(pathFinderWorkerAttributes, (paths, ignoredUuidsTable, workerRuntime) => {
                const workerEnd = performance.now();
                const updateDesRevStart = performance.now();

                this.pathIgnoredUuidsTable = ignoredUuidsTable;

                for (let i = 0; i < paths.length; i++) {
                    const path = paths[i];
                    const connection = connectionsTable[path.uuid];
                    if (!path.isComplete) {
                        connection.setOverlaps(true);
                    }
                    for (const uuid of path.collisionWithUuids) {
                        if (obstaclesTable.hasOwnProperty(uuid)) {
                            obstaclesTable[uuid].setOverlaps(true);
                        }
                    }

                    connection.path = new ConnectionPath(connection, path);
                }

                const updateDesRevEnd = performance.now();
                const renderStart = performance.now();

                events.publishEvent(DRAW_PATHS, {paths: this.paths});
                this.updateBoardStatus();

                // TODO: make actions handle async processes
                //  (eg. publish the ACTION EXECUTED event after async processes
                //  are done)
                events.publish(ACTION_EXECUTED);

                const renderEnd = performance.now();

                if (Config.DEBUG) {
                    console.log('Spacial index initialization time: ', spatialIndexEnd - spatialIndexStart);
                    console.log('Determine paths that require change time: ', pathChangeEnd - pathChangeStart);
                    console.log('Update board status before async events time: ', updateBoardEnd - updateBoardStart);
                    console.log('Worker computation time: ', workerRuntime);
                    console.log('Total worker runtime: ', workerEnd - workerStart);
                    console.log('Update design revision time: ', updateDesRevEnd - updateDesRevStart);
                    console.log('Render and view update time: ', renderEnd - renderStart);
                    console.log('Total path computation time: ', performance.now() - start);
                }
            });

        } else {
            events.publishEvent(DRAW_PATHS, {paths: this.paths});
        }
    }

    get connections(): Connection[] {
        return this.connectionCollection.connections;
    }

    getResourceConnections() {
        return this.get('connections');
    }

    getNoConnections(): ExplicitRequireNoConnection[] {
        return this._noConnections.slice(); // defensive copy
    }

    getResourceNoConnections() {
        return this.get('explicit_require_no_connections');
    }

    public get dimensions(): Dimension[] {
        return this.dimensionCollection.dimensions;
    }

    getResourceDimensions(): DimensionServerResource[] {
        return this.get('dimensions');
    }

    saveImage(image_contents) {
        return this.save({image_contents: image_contents}, {patch: true})
            .fail(errorHandler.onFail)
            .done(() => {
                // Clear the contents after saving so the image does not
                // get replaced every time we save the design.
                this.setImageContents(null);
                events.publish(IMAGE_SAVE_COMPLETE);
            });
    }

    getImageContents() {
        return this.get('image_contents');
    }

    setImageContents(imgContents) {
        this.set('image_contents', imgContents);
    }

    public dimensionBoard(): void {
        this.addDimensionFromAttributes({
            anchor1: this.board.getAnchorByEdge("bottom"),
            anchor2: this.board.getAnchorByEdge("top")
        });
        this.addDimensionFromAttributes({
            anchor1: this.board.getAnchorByEdge("left"),
            anchor2: this.board.getAnchorByEdge("right")
        });
    }

    public loadConnections(): void {
        this.addConnectionsFromResources(this.getResourceConnections());
    }

    public addConnectionsFromResources(resources: ConnectionResource[]): void {
        this.connectionCollection.initializeFromResources(resources, this._placedModules);
    }

    public removeConnection(connection: Connection): void {
        this.connectionCollection.remove(connection);
    }

    public loadNoConnections(): void {
        this.addNoConnectionsFromResources(this.getResourceNoConnections());
    }

    public addNoConnectionsFromResources(resources: ExplicitRequireNoConnectionResource[]): void {
        for (const noConnectionResource of resources) {
            const requirer = this.getPlacedModuleByUuid(noConnectionResource.requirer_uuid);
            if (requirer) {
                const require = requirer.getRequireById(noConnectionResource.require_bus);
                if (require && require.isOptional) {
                    this.addNoConnection(require);
                }
            }
        }
    }

    public loadDimensions(): void {
        this.addDimensionsFromResources(this.getResourceDimensions());
    }

    public addDimensionsFromResources(resources: DimensionResource[] | DimensionServerResource[]): void {
        this.dimensionCollection.initializeFromResources(resources, this.dimensionables);
    }

    private finalize() {
        // First finish loading
        this.loadConnections();
        this.loadNoConnections();
        this.loadDimensions();

        // Then update everything
        this.updateElectrical();
        this.computeOverlaps();
        this.initializePathResources();
        this.computeOverlaps(); // Yes, you need to call this again, to refresh the overlaps before computing the paths.
        this.computePathIntersections();
        this.updateStatuses();
        this.updateEmptySavedDesignStatus();

        // Let the world know we're done!
        events.publish(DESIGN_LOADED);
    }

    markAsNew() {
        this.setId(null);
        this.set('created', null);
        this.set('updated', null);
        this.set('locked', false);
        this.set('board_url', '');
        this.set('product_url', '');
        this.setTitle(1);
        this.setImageContents(null);
        this.set('image_url', null); // we don't have image url for new designs until image is really saved
    }

    hasDimension(anchor1: Anchor, anchor2: Anchor): boolean {
        const dimension = this.dimensionCollection.getDimensionByAnchors(anchor1, anchor2);
        return dimension !== undefined;
    }

    addDimensionFromAttributes(attributes: DimensionAttributes): Dimension | undefined {
        return this.dimensionCollection.addDimensionFromAttributes(attributes);
    }

    public removeDimensionByAnchors(anchor1: Anchor, anchor2: Anchor): void {
        this.dimensionCollection.removeDimensionByAnchors(anchor1, anchor2)
    }

    public connectPair(require: RequireBus, provide: ProvideBus): void {
        require.disconnect();
        require.unsetNoConnect();
        this.addConnectionFromBuses(require, provide);
        require.autoConnectVlogicPower();
    }

    /**
     * Called to update the DesignRevision's electrical status and paths after making one or more connections.
     */
    public recomputeFromConnections(): void {
        this.computeOverlaps(); // Connections with invalid paths will set it's placed modules to have overlaps.
        this.computePathIntersections();
        this.updateElectrical();
    }

    /**
     * Connect the two buses together.
     */
    public addConnectionFromBuses(require: RequireBus,
                                  provide: ProvideBus): Connection {
        const connection = require.connect(provide);
        this.connectionCollection.add(connection);
        return connection;
    }

    public addNoConnection(require: RequireBus): ExplicitRequireNoConnection {
        const noConnection = require.makeNoConnect();
        this._noConnections.push(noConnection);
        return noConnection;
    }

    public removeNoConnection(noConnection: ExplicitRequireNoConnection): void {
        const index = this._noConnections.indexOf(noConnection);
        if (index > -1) {
            this._noConnections.splice(index, 1);
        }
    }

    setDirty(): void {
        this.set('dirty', true);
    }

    /**
     * True if this design has unsaved changes.
     */
    isDirty(): boolean {
        return Boolean(this.get('dirty'));
    }

    clearDirty(): void {
        this.set('dirty', false);
    }

    setSaving() {
        this.set('saving', true);
    }

    isSaving() {
        return Boolean(this.get('saving'));
    }

    clearSaving() {
        this.set('saving', false);
    }

    resetLinkedAnchors(): void {
        this.dimensionables.forEach((dimensionable: Dimensionable) => {
            dimensionable.resetLinkedAnchors();
        });
    }

    addEdgeConstraint(edgeAnchor: Anchor, edge: EdgePosition) {
        const board = this.board;
        this.addDimensionFromAttributes({
            anchor1: board.getAnchorByEdge(edge),
            anchor2: edgeAnchor,
            isEdgeConstraint: true,
        });
    }

    /**
     * Each require bus has a set of corresponding provide bus options that are compatible to it.
     * This resets the filtered provide buses, eg., when we are finished connecting the require bus.
     */
    resetConnectingModules(): void {
        for (const placedModule of this.getPlacedModules()) {
            placedModule.resetConnecting();
        }
        this.trigger(RESET_CONNECTING_MODULES);
    }

    getDesignId(): number {
        return this.get('design_id');
    }

    setDesignId(id) {
        this.set('design_id', id);
    }

    /**
     * Return the path of the permalink after the #! for this design.
     *
     * @returns {string}
     */
    getPermalinkBase() {
        let permalink = '/design/';
        if (!this.isNew()) {
            permalink += this.getDesignId() + '/';
        }
        return permalink;
    }

    upRev() {
        this.set('uprev', true);
        return this.save().success(() => this.unset('uprev'));
    }

    getDescription() {
        return this.get('design_description');
    }

    setDescription(description) {
        this.set('design_description', description);
    }

    getPublic() {
        return this.get('design_public');
    }

    setPublic(new_public) {
        this.set('design_public', Boolean(new_public));
    }

    getImageUrl() {
        return this.get('image_url');
    }

    hasImage() {
        return this.has('image_url') && (this.getImageUrl() !== '');
    }

    getDesignCreator(): string {
        return this.get('design_creator');
    }

    isCreatedBeforePathSpecs(): boolean {
        if (!this.firstSaved) {
            return false;
        }
        for (const conn of this.connections) {
            if (conn.provideBus.isDesignCreatedBeforePathSpec()) {
                return true;
            }
        }
        return false;
    }

    updateEmptySavedDesignStatus(): void {
        this.emptyDesign = this.getPlacedModules().length < 1;
    }

    emptyOnLastSave(): boolean {
        return this.emptyDesign;
    }
}
