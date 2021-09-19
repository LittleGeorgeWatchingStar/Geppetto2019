import {BusGroupCollection} from "bus/BusGroupCollection";
import {ProvideBusCollection} from "bus/ProvideBusCollection";
import {RequireBusCollection} from "bus/RequireBusCollection";
import {Outline} from "module/feature/footprint";
import {PlacedItem} from "../placeditem/PlacedItem"
import {Module} from "module/Module";
import PriceChangeCollection from "price/PriceChangeCollection";
import * as _ from "underscore";
import events from "utils/events";
import {BusGroupResource, BusResource} from "../bus/api";
import {Bus} from "../bus/Bus";
import {BusCollection} from "../bus/BusCollection";
import {BusGroup} from "../bus/BusGroup";
import {ExclusionSet} from "../bus/exclusion/ExclusionSet";
import {ProvideBus} from "../bus/ProvideBus";
import {RequireBus} from "../bus/RequireBus";
import {Connection} from "../connection/Connection";
import {AutoConnectEvent} from "../connection/events";
import {PathObstacle} from "../path/Path";
import {NeedsConnections} from "../core/NeedsConnections";
import {EdgePosition} from "../dimension/Dimensionable";
import {ServerID} from "../model/types";
import {BomChoice, BomOption} from "../module/BomOption/BomOption";
import {Polyline} from "../utils/geometry";
import {BUILDER, COM, HEADER, PROCESSOR} from "../module/Category";
import {Feature} from "../module/feature/Feature";
import {FeatureCollection} from "../module/feature/FeatureCollection";
import {MODULE_INIT_BUSES} from "../module/events";
import {PlacedModuleResource} from "./api";
import {
    createModuleAnchor,
    ModuleAnchor
} from "../dimension/Anchor/ModuleAnchor";
import {Anchor} from "../dimension/Anchor/Anchor";
import {BusRecommendationResource} from "../module/api";
import {BomChoiceResource, BomOptionResource} from "../module/BomOption/api";
import {ExplicitRequireNoConnection} from "../connection/ExplicitRequireNoConnection";
import {DesignRevision} from "../design/DesignRevision";

type Edges = { [position: string]: ModuleAnchor[] };

export type ProviderOptions = { [cid: string]: ProvideBus[] };


export interface PlacedModuleAttributes {
    uuid?: string;
    module: Module;
    design_revision: DesignRevision;
    x: number;
    y: number;
    rotation: number;
}

let selectedBusName: string;

/**
 * A module that has been placed onto a design.
 */
export class PlacedModule extends PlacedItem implements
    NeedsConnections,
    PathObstacle {

    private provides: ProvideBusCollection;
    private requires: RequireBusCollection;
    private busgroups: BusGroupCollection;
    private pricechanges: PriceChangeCollection;
    private _edges: Edges;

    private _features: FeatureCollection;
    protected _anchors: ModuleAnchor[];

    /**
     * Sets of mutually-exclusive require buses.
     */
    private _exclusionSets: ExclusionSet[];
    private _bomOptions: BomOption[];

    public upgraded = false;

    defaults(): any {
        return {
            // These come from the server
            x: 0,
            y: 0,
            rotation: 0,
            choices: [],
            custom_name: null,

            // These are intended to drive local events
            ready: false,
            connected: false,
            overlaps: false,

            // Indicates that overlaps need to be recalculated.
            has_moved: true,

            // other local data that is not persisted to the server
            // while connecting, the provide buses this placed module offers
            // for the connecting require bus to connect to
            options: []
        };
    }

    initialize(attributes: PlacedModuleAttributes) {
        this.initFeatures();
        this.upgraded = false;
        this.provides = new ProvideBusCollection();
        this.requires = new RequireBusCollection();
        this.busgroups = new BusGroupCollection();
        this.pricechanges = new PriceChangeCollection();
        this._exclusionSets = [];
        this._bomOptions = [];
        super.initialize(attributes);

        this._edges = null;
        this.refreshConstraints();

        if (!this.module.isSummary) {
            this.initBuses();
        }
    }

    /**
     * True if the "detailed" version of the module, which has additional data needed
     * for this object to function, is still loading.
     */
    isLoading(): boolean {
        return this.module.isSummary;
    }

    get name(): string {
        return this.module.name;
    }

    get moduleId(): ServerID {
        return this.module.moduleId;
    }

    public hasFunctionalGroup(): boolean {
        return undefined != this.module.functionalGroup;
    }

    /**
     * The working BOM options chosen on GWeb.
     */
    public get selectedChoices(): BomChoice[] {
        return this.bomOptions
            .map(b => b.selected)
            .filter(c => !c.isDefault); // Apparently we only store BomChoices that are not the default.
    }

    public get options(): ProvideBus[] {
        return this.get('options').slice();
    }

    /**
     * The BOM options chosen on this placed module when loaded from the server.
     */
    private get choices(): BomOptionResource[] {
        return this.get('choices').slice();
    }

    private get selectedChoiceIds(): ServerID[] {
        return this.selectedChoices.map(c => c.id);
    }

    private get selectedChoiceResources(): BomChoiceResource[] {
        return this.selectedChoices.map(c => c.resource);
    }

    public initBuses(): void {
        // first initialize bus groups as BusGroup objects
        this.initBusGroups();

        this.provides.reset();
        const provides = this.detailField('provides');
        if (provides) {
            for (const bus of provides) {
                this.addProvide(bus);
            }
        }

        this.requires.reset();
        const requires = this.detailField('requires');
        if (requires) {
            for (const bus of requires) {
                this.addRequire(bus);
            }
        }
        this.initBomOptions();
        this.initExclusions();
        this.initPriceChanges();
        this.rotateProximityPoints();
        events.publishEvent(MODULE_INIT_BUSES, {module: this} as AutoConnectEvent);

        this.trigger('initBuses', this);
    }

    private initBusGroups() {
        const busGroups = this.detailField('bus_groups');
        if (busGroups) {
            for (const group of busGroups) {
                this.addBusGroup(group);
            }
        }
    }

    public get recommendedBuses(): BusRecommendationResource[] | undefined {
        return this.detailField('recommended_buses');
    }

    public addBusGroup(attributes: BusGroupResource): BusGroup {
        return this.busgroups.add(Object.assign({
            placed_module: this
        }, attributes));
    }

    public addProvide(attributes: BusResource): ProvideBus {
        return this.initBus(this.provides, attributes);
    }

    public addRequire(attributes: BusResource): RequireBus {
        return this.initBus(this.requires, attributes);
    }

    private initBus<T extends Bus>(buses: BusCollection<T>, bus: BusResource): T {
        return buses.add(Object.assign({
            placed_module: this,
            busgroup: this.busgroups.get(bus.bus_group.id)
        }, bus));
    }

    private initPriceChanges() {
        const priceChanges = _(this.detailField('price_changes'));
        priceChanges.each((priceChange, id) => {
            this.pricechanges.add(Object.assign({
                id: id,
                placed_module: this,
                busgroup_vlogic: this.busgroups.get(priceChange.vlogic_group),
                level: priceChange.level
            }, priceChange));
        });
    }

    private rotateProximityPoints() {
        // If proximity point is rotated, rotate it on initialize
        let rotation = this.rotation;
        if (rotation > 0) {
            while (rotation > 0) {
                this.requires.rotateProximityPoints();
                this.provides.rotateProximityPoints();
                rotation -= 90;
            }
        }
    }

    /**
     * The Module of which this is an instance.
     */
    public get module(): Module {
        return this.get('module');
    }

    /**
     * @returns A field from the module's detail view, which is only
     * accessible once the module has been placed and fully loaded.
     *
     * That's why we break the encapsulation of the module here.
     * @deprecated Use descriptively-named getters instead.
     */
    private detailField(field: string): any {
        return this.module.get(field);
    }

    private initExclusions() {
        this._exclusionSets = [];

        this.requires.each((require: RequireBus) => require.initExclusions());

        this.requires.each((require: RequireBus) => {
            const exclusions = require.getExclusions();

            if (exclusions.length === 0) {
                return;
            }

            // Find an existing set that contains the current require bus.
            const existingSet = this._exclusionSets.find((exclusion_set: ExclusionSet) => {
                return exclusion_set.contains(require);
            });

            if (existingSet) {
                existingSet.addAll(exclusions);
            } else {
                this._exclusionSets.push(new ExclusionSet(exclusions));
            }
        });
    }

    public get exclusionSets(): ExclusionSet[] {
        return this._exclusionSets.slice();
    }

    public getRequireInclusions(require: RequireBus): RequireBus[] {
        const exclusionSets = this._exclusionSets.find((exclusionSet: ExclusionSet) => {
            return exclusionSet.contains(require);
        });
        return exclusionSets.getInclusions(require);
    }

    /**
     * Deep copy all features from unplaced module.
     */
    private initFeatures(): void {
        const collection = this.module.cloneFeatures();

        let rotation = this.rotation;
        while (rotation > 0) {
            collection.rotate();
            rotation -= 90;
        }
        this._features = collection;
    }

    public remove(): void {
        this.removeFeatures();
        this.disconnect();
        this.unsetNoConnects();
        super.remove();
    }

    toString(): string {
        return `${this.name} at ${this.position}`;
    }

    getRevisionId(): ServerID {
        return this.module.revisionId;
    }

    get bomOptions(): BomOption[] {
        return this._bomOptions;
    }

    get bomOptionResources(): BomOptionResource[] {
        return this.detailField('bom_options');
    }

    hasBomOptions(): boolean {
        return this.bomOptionResources && this.bomOptionResources.length > 0;
    }

    getPrice(): number {
        let price = this.module.getPrice();
        _.each(this.selectedChoices,
            choice => price += choice.price
        );
        price += this._getVlogicPriceChanges();
        return price
    }

    _getVlogicPriceChanges() {
        let price = 0;
        this.busgroups.each(group => {
            let minDrop = null;
            // Only include price change drop if any of the buses from the group is connected.
            // Calculate option that will result in minimal price drop.
            // Also list of the acceptable levels must match price change power bus group level.
            if (group.isAnyRequireConnected() || group.isAnyProvideConnected()) {
                this.pricechanges.each(priceChange => {
                    const vlogicGroup = priceChange.getVlogicBusGroup();
                    if (group.equals(vlogicGroup) && group.canAcceptAnyLevel([priceChange.getLevel()])) {
                        const currentPrice = +priceChange.getChangeInPrice();
                        if (minDrop == null) {
                            minDrop = currentPrice
                        }
                        minDrop = Math.min(minDrop, currentPrice);
                    }
                });
            }
            if (minDrop) {
                price += minDrop;
            }
        });
        return price;
    }

    public get customName(): string {
        return this.get('custom_name') || this.name;
    }

    setCustomName(name: string): void {
        if (this.name === name) {
            this.set('custom_name', null);
        } else {
            this.set('custom_name', name);
        }
    }

    /**
     * @deprecated use .name instead
     */
    getTitle(): string {
        return this.name;
    }

    public get summary(): string {
        return this.module.summary;
    }

    public get revisionNo(): number {
        return this.module.revisionNo;
    }

    /**
     * The URL of the model file.
     */
    getModelFile(): string {
        /**
         * By default, return the model file of the module.
         * If a selected choice has a new model file, use that instead
         */
        let model_file = this.detailField('model_file');
        _.each(this.selectedChoices, choice => {
            if (choice.modelFile) {
                model_file = choice.modelFile
            }
        });
        return model_file;
    }

    getDescription(): string {
        return this.module.description;
    }

    public getOutline(): Outline {
        return this._features.outline();
    }

    public getDisplayOutline(): Outline {
        return this._features.displayOutline();
    }

    public getFootprintFeatures(): FeatureCollection {
        return this._features.footprint().features;
    }

    public getFootprintPolylines(): Polyline[] | null {
        const footprint = this._features.footprint();
        if (!footprint) {
            return null;
        }
        return footprint.polylines;
    }

    public getPathWallPolylines(): Polyline[] | null {
        const pathWall = this._features.pathWall();
        if (!pathWall) {
            return null;
        }
        return pathWall.polylines;
    }

    public get pathKeepouts(): Polyline[] {
        const pathWallPolylines = this.getPathWallPolylines();
        if (!pathWallPolylines) {
            return this.keepouts;
        }
        return pathWallPolylines.map(polyline => polyline.shift(this.position));
    }

    public get orthographicUrl(): string {
        for (const choice of this.selectedChoices) {
            if (choice.orthographicUrl) {
                return choice.orthographicUrl;
            }
        }
        return this.module.orthographicUrl;
    }

    setReady(isReady: boolean) {
        this.set('ready', isReady);
    }

    isReady(): boolean {
        return Boolean(this.get('ready'));
    }

    setConnected(isConnected: boolean) {
        this.set('connected', isConnected);
    }

    isConnected(): boolean {
        return Boolean(this.get('connected'));
    }

    //////////////////////// VLOGIC

    /**
     * Checks that any VLOGIC power buses are auto-connected or
     * disconnected as required.
     *
     * @param group: the bus group whose vlogic require we wish to connect.
     */
    autoConnectVlogicPower(group: BusGroup): void {
        const vlogic_require = group.getRequireVlogicPowerBus();
        // only autoconnect if vlogic bus is in the same group
        if (!vlogic_require) {
            return;  // nothing to do
        }
        console.assert(vlogic_require.isPartOfGroup(group));

        if (vlogic_require.isConnected()) {
            if (!this._isValidVlogicConnection(vlogic_require)) {
                // VLOGIC power bus is already connected, but is no longer
                // valid. Reconnect it.
                vlogic_require.disconnect();
                this._findProvideAndConnectVlogic(vlogic_require, group);
            }
            // VLOGIC power bus is connected properly, do nothing.
        } else {
            this._findProvideAndConnectVlogic(vlogic_require, group);
        }
    }

    public get downstreamPowerConnections(): Connection[] {
        return this.providedPowerConnections
            .filter(conn => !conn.isVlogic);
    }

    public get downstreamPowerDraw(): number {
        let powerDraw = 0;
        for (const connection of this.providedPowerConnections) {
            powerDraw = powerDraw + connection.powerDraw;
        }
        return powerDraw;
    }

    public get requiredConnections(): Connection[] {
        return this.designRevision.connections
            .filter(conn => conn.isTo(this));
    }

    public get providedConnections(): Connection[] {
        return this.designRevision.connections
            .filter(conn => conn.isFrom(this));
    }

    public get requireNoConnections(): ExplicitRequireNoConnection[] {
        return this.designRevision.getNoConnections()
            .filter(noConn => noConn.requirer === this);
    }

    private get providedPowerConnections(): Connection[] {
        return this.designRevision.connections
            .filter(conn => conn.isFrom(this))
            .filter(conn => conn.isPower);
    }

    /**
     * True if this module is currently at the top of the power tree (ie,
     * has no power inputs from other modules).
     * note: VLogic is excluded from the power tree.
     */
    public get isPowerRoot(): boolean {
        const hasConnectedPowerRequires = this.powerRequires.some(require =>
            require.isConnected() && !require.needsVlogicPower());

        if (hasConnectedPowerRequires) {
            return false;
        }

        return this.powerProvides.some(provide =>
            !provide.implementsVlogicTemplate());
    }

    private _isValidVlogicConnection(vlogic_require: RequireBus) {
        const vlogic_provide = vlogic_require.getConnectedProvide();
        const provide_module = vlogic_provide.getPlacedModule();
        return this.requires.some(require => {
            return require.isPartOfGroup(vlogic_require.getBusGroup())
                && require.isVariableNonVlogic()
                && require.isConnectedToModule(provide_module);
        });
    }

    private _findProvideAndConnectVlogic(vlogic_require: RequireBus,
                                         group: BusGroup) {
        /* Search through all connected modules for one that can provide
         * VLOGIC power. */
        const provideModule = group.getUpstreamModules().find(
            placedModule => !!placedModule.getVlogicCompatibleProvide(vlogic_require));

        if (provideModule) {
            this.designRevision.addConnectionFromBuses(
                vlogic_require, provideModule.getVlogicCompatibleProvide(vlogic_require));
        }
    }

    public rotate(): void {
        if (!this.canBeRotated()) {
            return;
        }

        this.deleteDimensions();

        const oldCentroid = this.centroid;
        this.set('rotation', this.normalizeRotation(this.rotation + 90));
        this.requires.rotateProximityPoints();
        this.provides.rotateProximityPoints();
        this._features.rotate();
        this.rotateAnchors();
        this.has_moved = true;

        const translate = oldCentroid.subtract(this.centroid);
        if (this.rotation == 0 || this.rotation == 180) {
            this.translate(Math.floor(translate.x), Math.floor(translate.y));
        } else {
            this.translate(Math.ceil(translate.x), Math.ceil(translate.y));
        }

        this.refreshConstraints();
        this.trigger('rotate', this);
    }

    private constrain(): void {
        const board = this.board;

        const edges = this._edges;
        for (const position in edges) {
            edges[position].forEach((edgeAnchor: ModuleAnchor) => {
                let dx = 0;
                let dy = 0;

                const boardAnchor = board.getAnchorByEdge(position as EdgePosition);

                switch (position) {
                    case 'top':
                    case 'bottom':
                        dy = boardAnchor.boardY - edgeAnchor.boardY;
                        break;
                    case 'right':
                    case 'left':
                        dx = boardAnchor.boardX - edgeAnchor.boardX;
                        break;
                }

                this.translate(dx, dy);
            });
        }
    }

    private initBomOptions(): void {
        if (!this.bomOptionResources) return;
        this._bomOptions = this.bomOptionResources.map(r => new BomOption(r));
        for (const choice of this.choices) {
            for (const bomOption of this.bomOptions) {
                if (bomOption.selectMatch(choice)) {
                    break;
                }
            }
        }
    }

    /**
     * Update the status booleans after a connection has been made or
     * removed.
     */
    updateStatus(): void {
        // Exclude requireBuses with exclusions, check them when checking exclusionSets.
        let ready = this.requires.all(
            require => (require.isReady() || require.hasExclusions() || require.isNoConnect() || require.isVlogicConnectionNotRequired()));

        // Exclude requireBuses with exclusions, check them when checking exclusionSets.
        let connected = this.requires.all(
            require => (require.isConnected() || require.hasExclusions() || require.isNoConnect() || require.isVlogicConnectionNotRequired()));

        for (const exclusionSet of this._exclusionSets) {
            ready = ready && (exclusionSet.isReady() || exclusionSet.isNoConnect());
            connected = connected && (exclusionSet.isConnected() || exclusionSet.isNoConnect());
        }

        this.setReady(ready);
        this.setConnected(connected);
    }

    /**
     * Returns those provide buses of this module that match the require
     * bus `requireBus`.
     */
    getMatchingProvideBuses(requireBus: RequireBus): ProvideBus[] {
        return this.provides.filter(
            provideBus => provideBus.isMatch(requireBus) &&
                provideBus.hasEnoughTotalCapacityFor(requireBus));
    }

    getProvideById(id: ServerID): ProvideBus {
        return this.provides.get(id);
    }

    /**
     * Find a provide bus by passing a test function.
     */
    public findProvide(test: (provide: ProvideBus) => boolean): ProvideBus | undefined {
        return this.provides.models.find(test);
    }

    /**
     * Find a require bus by passing a test function.
     */
    public findRequire(test: (require: RequireBus) => boolean): RequireBus | undefined {
        return this.requires.models.find(test);
    }

    public getRequireById(id: ServerID): RequireBus | undefined {
        return this.requires.get(id);
    }

    /**
     * All of the power provide buses of this module
     */
    get powerProvides(): ProvideBus[] {
        return this.filterProvides(provide => provide.isPower());
    }

    /**
     * Find a provide bus that has a higher priority for the require, or at least
     * is fully compatible with it.
     */
    public getCompatibleProvide(require: RequireBus): ProvideBus | undefined {
        let backupProvide = null;
        for (const provide of this.provides.models) {
            if (provide.canBeConnectedTo(require)) {
                if (require.isHighPriority(provide)) {
                    return provide;
                }
                if (!backupProvide) {
                    backupProvide = provide;
                }
            }
        }
        return backupProvide;
    }

    /**
     * Returns the first provide bus that is a match for the require.
     */
    public getVlogicCompatibleProvide(require: RequireBus): ProvideBus | undefined {
        return this.findProvide((provide) =>
            provide.isMatch(require) &&
            !provide.hasMatchingStopPriority(require)
        );
    }

    /**
     * Get a list of provide buses that match the given test function.
     */
    public filterProvides(test: (provide: ProvideBus) => boolean): ProvideBus[] {
        return this.provides.models.filter(test);
    }

    public get powerRequires(): RequireBus[] {
        return this.filterRequires(require => require.isPower());
    }

    /**
     * Get a list of require buses that match the given test function.
     */
    public filterRequires(test: (require: RequireBus) => boolean): RequireBus[] {
        return this.requires.models.filter(test);
    }

    getRequires(): RequireBus[] {
        return this.requires.models.slice(); // defensive copy
    }

    getProvides(): ProvideBus[] {
        return this.provides.models.slice(); // defensive copy
    }

    disconnect(): void {
        this._disconnectProvides();
        this._disconnectRequires();
    }

    private removeFeatures(): void {
        this._features.set([]);
        this._features = null;
    }

    _disconnectProvides(): void {
        this.provides.each(provide => provide.disconnect());
    }

    _disconnectRequires(): void {
        this.requires.each(require_bus => require_bus.disconnect());
    }

    unsetNoConnects(): void {
        this.requires.each(require => require.unsetNoConnect());
    }

    resetConnecting(): void {
        this.provides.each(provide => provide.resetConnecting());
        this.setOptions([]);
    }

    setOptions(options: ProvideBus[]) {
        this.set('options', options);
    }

    /**
     * Can upload/download CSV connections.
     */
    public canTransferConnections(): boolean {
        return this.module.isCategory(COM)
            || this.module.isCategory(HEADER)
            || this.module.isCategory(PROCESSOR)
            || this.module.isCategory(BUILDER);
    }

    ////////////////////// Dimensioning interface

    public get features(): Feature[] {
        return this._features.models.slice(); // defensive copy
    }

    public getFeature(featureId: ServerID): Feature | undefined {
        return this._features.get(featureId);
    }

    protected refreshConstraints(): void {
        console.assert(!this.hasLockedDimensions());

        // refreshing edges relies on the outline computed in "super.refreshFeatures()"
        this.resetEdgesConstraints();
        this.registerEdgeDimensions();
        this.constrain();
    }

    private resetEdgesConstraints(): void {
        console.assert(!this.hasLockedDimensions());

        const edgeAnchors = this._anchors.filter((anchor: Anchor) => {
            return anchor.isEdgeConstraint()
        });

        const footprintFeatures = this.getFootprintFeatures();
        const features = {
            top: footprintFeatures.top(),
            right: footprintFeatures.right(),
            bottom: footprintFeatures.bottom(),
            left: footprintFeatures.left()
        };

        this._edges = {top: [], right: [], bottom: [], left: []};

        for (const key in features) {
            edgeAnchors.forEach(edgeAnchor => {
                if (features[key] === edgeAnchor.feature) {
                    const index = this._edges[key].indexOf(edgeAnchor);
                    if (index === -1) {
                        this._edges[key].push(edgeAnchor);
                    }
                }
            });
        }
    }

    /**
     * Registers edge dimensions to lock module to board edge
     */
    private registerEdgeDimensions(): void {
        const designRevision = this.designRevision;

        const edges = this._edges;
        for (const key in edges) {
            edges[key].forEach((edgeAnchor: ModuleAnchor) => {
                designRevision.addEdgeConstraint(edgeAnchor, key as EdgePosition);
            });
        }
    }

    hasRequires(): boolean {
        return this.requires && this.requires.length > 0;
    }

    isStable(): boolean {
        return this.module.isStable();
    }

    isDev(): boolean {
        return this.module.isDev();
    }

    isRestricted(): boolean {
        return this.module.isRestricted();
    }

    /** @deprecated */
    isInactive(): boolean {
        return this.module.isInactive();
    }

    protected initAnchors(): void {
        this._anchors = [];
        const features = this._features.models;
        features.forEach((feature: Feature) => {
            if (feature.isType('footprint') ||
                feature.isType('edge') ||
                feature.isType('feature')) {
                const anchor = createModuleAnchor(this, feature);
                this._anchors.push(anchor);
            }
        });
        this.resetLinkedAnchors();
    }

    public resetLinkedAnchors(): void {
        this._anchors.forEach((anchor: ModuleAnchor) => {
            anchor.resetLinkedAnchors()
        });
        // Links the anchors within the dimensionable (Anchors are set to link
        // because a place module is not resizable)
        this._anchors.forEach((anchor: ModuleAnchor) => {
            anchor.linkDimensionableAnchors();
        });
    }

    private get edgeConstraints(): EdgePosition[] {
        const constraints = [];
        const edges = this._features.filter(line => line.isEdge());
        for (const edge of edges) {
            if (edge.isVertical()) {
                if (edge.minX === this.xMin) {
                    constraints.push('left');
                } else {
                    constraints.push('right');
                }
            } else if (edge.isHorizontal()) {
                if (edge.minY === this.yMin) {
                    constraints.push('bottom');
                } else {
                    constraints.push('top');
                }
            }
        }
        return constraints;
    }

    public hasEdgeConstraint(edge: EdgePosition): boolean {
        return undefined != this.edgeConstraints.find(constraint => constraint === edge);
    }

    public getAnchorByEdge(edge: EdgePosition): ModuleAnchor {
        const feature = this._features[edge]();
        return this._anchors.find((edgeAnchor: ModuleAnchor) => {
            return feature === edgeAnchor.feature;
        });
    }

    ////////////////////// Bus Infomation

    public getSelectedBusName(): string {
        return selectedBusName;
    }

    static setSelectedBusName(busName): void {
        if (busName) return selectedBusName = busName;
    }

    /////////////////////////  Server

    public toJSON() {
        return {
            uuid: this.uuid,
            custom_name: this.get('custom_name'),
            x: this.boardPosition.x,
            y: this.boardPosition.y,
            rotation: this.rotation,
            module_revision: this.getRevisionId(),
            choices: this.selectedChoiceIds,
        };
    }

    public toResource(): PlacedModuleResource {
        return {
            id: this.id,
            uuid: this.uuid,
            module_id: this.module.moduleId,
            module_revision: this.module.getRevisionId(),
            revision_no: this.revisionNo,
            module_name: this.name,
            x: this.position.x,
            y: this.position.y,
            rotation: this.rotation,
            custom_name: this.customName,
            choices: this.selectedChoiceResources
        };
    }

    getRotation(): number{
        return this.get('rotation');
    }
}
