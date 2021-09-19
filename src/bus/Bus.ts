import GeppettoModel from "model/GeppettoModel";
import {PathSpec} from "../connection/PathSpec";
import {DesignRevision} from "../design/DesignRevision";
import {Level} from "../model/types";
import {PlacedModule} from "../placedmodule/PlacedModule";
import {Point} from "../utils/geometry";
import {BusResource} from "./api";
import {BusGroup} from "./BusGroup";
import {BusPriority} from "./BusPriority";
import {BusTemplate} from "./BusTemplate";


/**
 * A bus is a data or power connection between two modules.
 */
export class Bus extends GeppettoModel {

    defaults() {
        return {
            placed_module: null,
            proximityPoint: null,
            exclusions: [],
            graph: {
                parent_nodes: [],
                children_nodes: [],
                visited: false
            },
            priorities: [],
            templates: []
        };
    }

    initialize(attributes: BusResource, placed_module: PlacedModule) {
        if (placed_module && placed_module.hasOwnProperty('id')) {
            this.setPlacedModule(placed_module);
        }
        // TODO change this! The manual addition means it's often undefined and broken in tests.
        if (attributes.busgroup) {
            this.set('busgroup', attributes.busgroup);
        }
        this._initializeProximity();
    }

    _initializeProximity() {
        const proximity = this.get('proximity_point');
        if (proximity != null) {
            this.set('proximityPoint', new Point(proximity.x, proximity.y));
        }
    }

    /**
     * A key that uniquely identifies the placed module on the board.
     */
    getPlacedModuleUuid(): string {
        return this.getPlacedModule().uuid;
    }

    toString(): string {
        const pm = this.getPlacedModule();
        return `${this.name} on ${pm.name}`;
    }

    public implementsVlogicTemplate(): boolean {
        return this.templates.some(t => t.name === 'VLOGIC');
    }

    /**
     * The voltage levels that this bus can accept.
     */
    getDeterminedLevels(): Level[] {
        return this.getBusGroup() ? this.getBusGroup().getDeterminedGroupLevels() : [];
    }

    isVariableLevel(): boolean {
        return this.getBusGroup() ? this.getBusGroup().isVariableLevel() : false;
    }

    isPartOfGroup(bus_group: BusGroup | undefined): boolean {
        return this.getBusGroup() ? this.getBusGroup().equals(bus_group) : false;
    }

    public recalculateDeterminedLevels(): void {
        if (this.getBusGroup()) {
            this.getBusGroup().recalculateDeterminedLevels();
        }
    }

    public get templates(): BusTemplate[] {
        return this.get('templates');
    }

    isPower(): boolean {
        return this.get('is_power');
    }

    get placedModule(): PlacedModule {
        return this.get('placed_module');
    }

    getPlacedModule(): PlacedModule {
        return this.placedModule;
    }

    setPlacedModule(placed_module: PlacedModule) {
        this.set('placed_module', placed_module);
    }

    get designRevision(): DesignRevision {
        return this.placedModule.designRevision;
    }

    /**
     * True if this bus is a member of `placedModule`.
     */
    public belongsTo(placedModule: PlacedModule): boolean {
        return placedModule.cid === this.getPlacedModule().cid;
    }

    public get name(): string {
        return this.get('name');
    }

    /**
     * @deprecated use .name instead
     */
    getTitle(): string {
        return this.name;
    }

    public get moduleName(): string {
        return this.placedModule.name;
    }

    getMilliwatts(): number {
        return this.get('milliwatts');
    }

    getNumConnections(): number {
        return this.get('num_connections');
    }

    getPriorities(): BusPriority[] {
        return this.get('priorities');
    }

    getBusGroup(): BusGroup | undefined {
        return this.get('busgroup');
    }

    /**
     * TODO this is wrong. This is the number of total connections allowed,
     * not how many this bus is currently connected to.
     */
    hasConnection(): boolean {
        return this.getNumConnections() >= 1;
    }

    /**
     * The proximity point of this bus relative to the module.
     */
    public get proximityPoint(): Point | null {
        return this.get('proximityPoint');
    }

    rotateProximityPoint(): void {
        const proximity = this.proximityPoint;
        if (proximity) {
            this.set('proximityPoint', proximity.rotate());
        }
    }

    /**
     * The proximity point of this bus relative to the design, not the module.
     */
    public get placedProximityPoint(): Point | null {
        return (this.proximityPoint
            ? this.proximityPoint.add(this.placedModule.position)
            : null);
    }

    /**
     * If this bus needs to have a clear routing path for its
     * connection (eg, due to high-speed signals), the PathSpec
     * describes the constraints on that path.
     */
    public get pathSpec(): PathSpec | null {
        const spec = {
            width: this.get('path_width'),
            minLength: this.get('min_path_length'),
            maxLength: this.get('max_path_length'),
        };
        if (!this.isCompleteSpec(spec) || this.isDesignCreatedBeforePathSpec()) {
            return null;
        }
        return spec;
    }

    private isCompleteSpec(spec: PathSpec): boolean {
        const isNumber = (value) => typeof value === 'number';
        return (isNumber(spec.width)
            && isNumber(spec.minLength)
            && isNumber(spec.maxLength)
        );
    }

    public isDesignCreatedBeforePathSpec(): boolean {
        const pathCreated = this.get('path_created');
        const revisionFirstSaved = this.designRevision.firstSaved;
        if (!revisionFirstSaved || !pathCreated) {
            return false;
        }
        return revisionFirstSaved.localeCompare(pathCreated) < 0;
    }
}
