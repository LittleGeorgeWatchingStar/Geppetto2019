import GeppettoModel from "model/GeppettoModel";
import {CollaborationResource} from "./api";
import {Design} from "../Design";

/**
 * A Collaboration is a relationship between the design 'owner' and
 * another user.
 */
export class Collaboration extends GeppettoModel {

    public static VIEW_PERMISSION = 'view';

    public static EDIT_PERMISSION = 'edit';

    public originalPermission: string;

    defaults() {
        return {
            collaboration_name: '',
            collaboration_email: '',
            permission: Collaboration.VIEW_PERMISSION,
            date: '',
            delete: false
        };
    }

    initialize(options: CollaborationResource) {
        super.initialize(options);
        this.originalPermission = this.permission;
    }

    public get name(): string {
        return this.get('collaboration_name');
    }

    public setName(name: string): void {
        this.set('collaboration_name', name);
    }

    public get email(): string {
        return this.get('collaboration_email');
    }

    public setEmail(email: string): void {
        this.set('collaboration_email', email);
    }

    public get permission(): string {
        return this.get('permission');
    }

    public setPermission(permission: string): void {
        this.set('permission', permission);
    }

    public hasChanges(): boolean {
        return this.permission !== this.originalPermission ||
            this.isDelete;
    }

    public get isDelete(): boolean {
        return this.get('delete');
    }

    public setDelete(isDelete: boolean): void {
        this.set('delete', isDelete);
    }

    public get created(): string {
        return this.get('date');
    }

    public compareCreated(other: Collaboration): number {
        return this.created.localeCompare(other.created);
    }

    toJSON(): CollaborationResource {
        return {
            collaboration_name: this.name,
            collaboration_email: this.email,
            permission: this.permission,
            date: this.created
        };
    }
}