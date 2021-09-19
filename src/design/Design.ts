import * as _ from 'underscore';
import GeppettoModel from 'model/GeppettoModel';
import User from "../auth/User";
import {DesignRevision} from "./DesignRevision";
import {ServerID} from "../model/types";
import {Module} from "../module/Module";


/**
 * A summary containing basic information about a design. Used in design previews.
 */
export class Design extends GeppettoModel {

    defaults() {
        return {
            creator: '',
            title: '',
            description: '',
            'public': false,
            uri: '',
            revision_data: {},
            current_revision: {},
            image_url: '',
            module_ids: [],
            product_url: '',
            external_product_url: '',
            owner_full_name: ''
        };
    }

    get urlRoot() {
        return '/api/v3/design/design';
    }

    initialize() {
        return this;
    }

    public get moduleIds(): number[] {
        return this.get('module_ids');
    }

    getCreatorFirstName() {
        return this.get('creator_first_name');
    }

    // TODO Owner (mutable) and Creator (immutable) are now separate fields server-side.
    // We haven't fully transitioned into a consistent usage for each.
    getOwnerFullName(): string {
        return this.get('owner_full_name');
    }

    private get ownerID(): ServerID {
        return this.get('owner');
    }

    public get created(): string {
        return this.get('created');
    }

    public get updated(): string {
        return this.get('updated');
    }

    isOwnedBy(user: User): boolean {
        return this.ownerID === user.getId();
    }

    parse(design_resource, options) {
        if (options && !options.parse) {
            return;
        }

        if ('current_revision' in design_resource) {
            design_resource.revision_data = design_resource.current_revision;
        }
        return design_resource;
    }

    toJSON() {
        const json: any = {
            title: this.getTitle(),
            description: this.getDescription(),
            'public': this.isPublic()
        };

        if (this.isNew()) {
            json.initial_revision = this.getCurrentRevision().toJSON();
        }

        return json;
    }

    /**
     * True if the current revision of this design contains `module`.
     */
    containsModule(module: Module) {
        return this.containsModuleId(module.moduleId);
    }

    containsModuleId(moduleId: ServerID): boolean {
        return _.contains(this.moduleIds, moduleId);
    }

    contains(term) {
        if (!term) {
            return true;
        }
        const pattern = term.toLowerCase();
        return this.getTitle().toLowerCase().indexOf(pattern) > -1
            || this.getDescription().toLowerCase().indexOf(pattern) > -1;

    }

    isPublic() {
        return this.get('public');
    }

    public isValidated(): boolean {
        return this.getProductUrl() !== '';
    }

    setPublic(public_status: boolean): void {
        this.set('public', public_status)
    }

    getDescription() {
        return this.get('description');
    }

    setDescription(description) {
        this.set('description', description);
    }

    getTitle() {
        return this.get('title');
    }

    setTitle(title) {
        this.set('title', title);
    }

    getImageUrl() {
        return this.get('image_url');
    }

    hasImage() {
        return Boolean(this.getImageUrl());
    }

    getProductUrl() {
        return this.get('external_product_url') ? this.get('external_product_url') : this.get('product_url');
    }

    getProductPrice() {
        return this.get('product_price');
    }

    hasProductPrice() {
        return this.getProductPrice() > 0;
    }

    // the current revision attribute is only used for sending data to the server
    setCurrentRevision(revision: DesignRevision): void {
        this.set('current_revision', revision);
    }

    getCurrentRevision(): DesignRevision {
        return this.get('current_revision');
    }

    getCurrentRevisionId(): ServerID {
        return this.get('current_revision_id');
    }

    public compareOwnerName(other: Design): number {
        return this.getOwnerFullName().localeCompare(other.getOwnerFullName());
    }

    public compareCreated(other: Design): number {
        return this.created.localeCompare(other.created);
    }

    public compareUpdated(other: Design): number {
        return this.updated.localeCompare(other.updated);
    }
}
