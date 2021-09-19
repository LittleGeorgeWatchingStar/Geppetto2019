import GeppettoModel from "model/GeppettoModel";
import {AssignableNetGroup} from "module/custom/AssignableNetGroup";
import {Feature} from "./feature/Feature";
import {FeatureCollection} from "./feature/FeatureCollection";
import {FeatureResource} from "./feature/api";
import {Footprint, Outline} from "./feature/footprint";
import {ServerID} from "../model/types";
import {Point, Polyline} from "../utils/geometry";
import {MarketingFeature, ModuleResource, PinPointResource} from "./api";
import {Category, COM, PROCESSOR} from "./Category";
import {BusGroupResource, BusResource} from "../bus/api";
import {
    Cpu,
    CpuBallToNetMapping
} from "../moduledataviewer/moduledatadetail/cpu/Cpu";


/**
 * A module in the library that is available for use.
 */
export class Module extends GeppettoModel {
    private detailsFetch: Promise<Module> | null = null;

    private _features: FeatureCollection;

    /** @deprecated Make private, don't remove */
    public outline: Outline;
    private footprint: Footprint;
    private polylines: Polyline[];

    get urlRoot() {
        return '/api/v3/module/library';
    }

    /** @deprecated use moduleId or revisionId to be explicit. */
    get idAttribute() {
        return 'revision_id';
    }

    defaults(): any {
        return {
            idAttribute: 'revision_id',
            description: null,
            pinpoints: []
        }
    }

    initialize(resource: ModuleResource) {
        this._features = this.initFeatures(resource.features);
    }

    public get name(): string {
        return this.get('name');
    }

    /**
     * @deprecated Use .name instead
     */
    public get title() {
        return this.name;
    }

    /**
     * @deprecated Use .name instead
     */
    getTitle() {
        return this.name;
    }

    /**
     * Every bus on the module is assigned a single voltage domain, which contains the allowed voltage levels the
     * bus can operate at.
     * This is a "detailed" field, so it may be undefined.
     */
    get voltageDomains(): BusGroupResource[] | undefined {
        return this.get('bus_groups');
    }

    public get summary(): string {
        return this.get('summary');
    }

    public get created(): string {
        return this.get('created');
    }

    public get launch(): string | undefined {
        return this.get('launch');
    }

    public get description(): string {
        return this.get('description');
    }

    public get thumbnailUrl(): string {
        return this.get('thumbnail_url');
    }

    public get orthographicUrl(): string {
        return this.get('ortho_image_url');
    }

    // Only available for detailed modules. It's null if it doesn't exist on the detailed module.
    public get cpu(): Cpu | null | undefined {
        return this.get('cpu');
    }

    // Only available for detailed modules.
    public get cpuBallToNetMappings(): CpuBallToNetMapping[] | undefined {
        return this.get('cpu_ball_to_net_mappings');
    }

    public get isMountingHole(): boolean {
        return this.name.includes('Mounting Hole');
    }

    public get edgeConstraints(): string[] {
        return this.footprint.features.edgeConstraints;
    }

    // Only available if the module is shared from other users
    public get authGroup(): [] | undefined {
        return this.get('auth_groups');
    }

    public compareLaunch(other: Module): number {
        if (!this.launch) return -1;
        if (!other.launch) return 1;
        return this.launch.localeCompare(other.launch);
    }

    /**
     * @deprecated use .description instead
     */
    getDescription() {
        return this.description;
    }

    /**
     * True if this module is a template module that customers use to
     * design their own custom module.
     */
    isTemplateModule(): boolean {
        return this.getAssignableNets().length > 0;
    }

    isCustomerModule(): boolean {
        return this.get('is_customer_module');
    }

    public get sku(): string{
        return this.get('sku');
    }

    /**
     * Performs a case-insensitive string comparison.
     */
    public isCategory(category: string): boolean {
        return this.categoryName.toLowerCase() === category.toLowerCase();
    }

    public get category(): Category {
        return this.get('category');
    }

    public get categoryName(): string {
        return this.category.name;
    }

    public get isPowerConnector(): boolean {
        return this.categoryName.toLowerCase().includes('power connector');
    }

    public get isPowerModule(): boolean {
        return this.categoryName.toLowerCase().includes('power');
    }

    public get isBarrelConnector(): boolean {
        return this.name.toLowerCase().includes('barrel connector');
    }

    public get isRegulator(): boolean {
        return ['regulator', 'ldo'].some(item => this.name.toLowerCase().includes(item));
    }

    public get isDummyPower(): boolean {
        return this.name.toLowerCase().includes('dummy');
    }

    public get isNC(): boolean {
        return this.name.toLowerCase().includes('nc');
    }

    public get isCOMorProcessor(): boolean {
        const category = this.categoryName.toLowerCase();
        return category === COM || category === PROCESSOR;
    }

    getAssignableNets(): AssignableNetGroup[] {
        const nets = this.get('user_assignable_nets');
        return nets ? nets.map(g => new AssignableNetGroup(g)) : [];
    }

    getMarketing(): MarketingFeature[] {
        return this.get('marketing');
    }

    /**
     * Get the first icon uri for this module, if any.
     */
    public get icon(): string | undefined {
        for (const icon of this.getMarketing()) {
            if (icon.image_uri) {
                return icon.image_uri;
            }
        }
    }

    private initFeatures(featureList: FeatureResource[]): FeatureCollection {
        const collection = new FeatureCollection();
        for (const feature of featureList) {
            collection.add(feature);
        }

        this.outline = collection.displayOutline();
        this.footprint = collection.footprint();
        if (!this.footprint) {
            console.error(this, this.name, this.revisionNo, 'has no footprint');
        }

        /* Used for generating SVGs
         * These do not get updated when the module rotates
         */
        this.polylines = this.footprint.polylines;

        return collection;
    }

    /**
     * The latest revision ID. This updates whenever there is a new version of the module.
     */
    getId(): ServerID {
        return this.revisionId;
    }

    /**
     * The database ID of this module revision.
     * Used to differentiate stable and non-stable versions of a module,
     * which can form separate items in the library panel.
     */
    public get revisionId(): ServerID {
        return this.get('revision_id');
    }

    getRevisionId(): ServerID {
        return this.revisionId;
    }

    /**
     * The human-friendly version number.
     */
    public get revisionNo(): number {
        return this.get('revision_no');
    }

    getRevisionNo() {
        return this.revisionNo;
    }

    /**
     * NOTE: This is an integer from server response.
     */
    public get moduleId(): ServerID {
        return this.get('module_id');
    }

    /**
     * @deprecated use get moduleId
     */
    getModuleId() {
        return this.moduleId;
    }

    public get features(): Feature[] {
        return this._features.models.slice();
    }

    public cloneFeatures(): FeatureCollection {
        return this._features.cloneCollection();
    }


    private get polylinesPoints(): Point[] {
        let points = [];
        this.polylines.forEach(polyline => {
            points = [...points, ...polyline.points];
        });
        return points;
    }

    getHeight(): number {
        let minY = Infinity;
        let maxY = -Infinity;
        for (const point of this.polylinesPoints) {
            if (point.y < minY) {
                minY = point.y;
            }
            if (point.y > maxY) {
                maxY = point.y;
            }
        }
        return maxY - minY;
    }

    getWidth(): number {
        let minX = Infinity;
        let maxX = -Infinity;
        for (const point of this.polylinesPoints) {
            if (point.x < minX) {
                minX = point.x;
            }
            if (point.x > maxX) {
                maxX = point.x;
            }
        }
        return maxX - minX;
    }

    getArea(): number {
        return this.polylines
            .map(polyline => polyline.area())
            .reduce((prev, current) => prev + current);
    }

    getPrice(): number {
        return this.get('price') || 0;
    }

    getFormattedPrice(): string {
        return '$' + this.getPrice().toFixed(2);
    }

    /** @deprecated */
    getOutline(): Outline {
        return this.outline;
    }

    public get outlineMinPoint(): Point {
        return new Point(this.outline.xmin, this.outline.ymin);
    }

    getFootprintPolylines(): Polyline[] {
        return this.polylines;
    }

    isDev(): boolean {
        return this.get('dev');
    }

    isStable(): boolean {
        return this.get('stable');
    }

    isEnabled(): boolean {
        return this.get('enabled');
    }

    isExpired(): boolean {
        return this.get('expired');
    }

    /**
     * @deprecated use isExpired() instead
     */
    isInactive(): boolean {
        return this.get('inactive');
    }

    isRestricted(): boolean {
        return this.get('restricted');
    }

    public get pinpoints(): PinPointResource[] {
        return this.get('pin_points');
    }

    public get functionalGroupName(): string | undefined {
        return this.get('functional_group_name');
    }

    public get functionalGroup(): ServerID | undefined {
        return this.get('functional_group');
    }

    public isFunctionalGroup(groupId: ServerID): boolean {
        return (undefined != groupId) && (groupId === this.functionalGroup);
    }

    public isVisibleToUser(user): boolean {
        const isExpired = this.isInactive() || this.isExpired();
        return !isExpired || user.isEngineer();
    }

    public get isSummary(): boolean {
        return this.get('is_summary');
    }

    /**
     * Requires are only available when details have been loaded.
     * @see loadDetails
     */
    public get requires(): BusResource[] | undefined {
        return this.get('requires');
    }

    /**
     * Provides are only available when details have been loaded.
     * @see loadDetails
     */
    public get provides(): BusResource[] | undefined {
        return this.get('provides');
    }

    public get groundNets(): string[]{
        return this.get('ground_nets');
    }

    public loadDetails(moduleGateway): Promise<Module> {
        if (!this.detailsFetch) {
            this.detailsFetch = new Promise<Module>((resolve, reject) => {
                if (this.isSummary) {
                    const moduleFetching = moduleGateway.getDetailedModule(this.getId());
                    moduleFetching
                        .done(module => {
                            this.set(module.attributes);
                            resolve(this);
                        })
                        .fail(() => reject());
                } else {
                    resolve(this);
                }
            });
        }
        return this.detailsFetch;
    }
}
