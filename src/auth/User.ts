import {Design} from "../design/Design";
import {UserResource} from "./api";
import {BETA_TESTER, ENGINEER, Group} from "./Group";
import {DesignController} from "../design/DesignController";
import {EngineeringToolFlag, FeatureFlag} from "./FeatureFlag";
import {Observable, Subject} from "rxjs";
import * as Config from 'Config';

/**
 * A Geppetto user.
 */
export default class User {
    // TODO: Use one change$ observable once all the subscribers are react components.
    private _changeFeatureFlags$: Subject<undefined> = new Subject<undefined>();
    public readonly changeFeatureFlags$: Observable<undefined> = this._changeFeatureFlags$.asObservable();

    private _id: any;
    private designs: Design[] = [];
    private groups: Group[] = [];
    private featureFlags: FeatureFlag[] = [];
    private username: string = '';
    private firstName: string = '';
    private lastName: string = '';
    private email: string = '';

    constructor(payload?: any) {
        if (payload) {
            this.initializeFromPayload(payload);
        }
    }

    /**
     * Helper method to make the transition from Backbone easier.
     * Payload intentionally typed as any.
     */
    private initializeFromPayload(payload: any) {
        if (payload.id) {
            this._id = payload.id;
        }
        if (payload.designs) {
            this.designs = payload.designs;
        }
        if (payload.groups) {
            this.groups = payload.groups;
        }
        if (payload.feature_flags) {
            this.featureFlags = payload.feature_flags;
        }
        if (payload.username) {
            this.username = payload.username;
        }
        if (payload.first_name) {
            this.firstName = payload.first_name;
        }
        if (payload.last_name) {
            this.lastName = payload.last_name;
        }
        if (payload.email) {
            this.email = payload.email;
        }
    }

    get id(): any {
        return this._id;
    }

    getId(): any {
        return this.id;
    }

    isLoggedIn(): boolean {
        return this.uuid !== '';
    }

    get uuid(): string {
        return this.username;
    }

    isEngineer(): boolean {
        return this.getGroups().some(group => group.name === ENGINEER);
    }

    isBetaTester(): boolean {
        return this.getGroups().some(group => group.name === BETA_TESTER);
    }

    isFeatureEnabled(feature: FeatureFlag | EngineeringToolFlag): boolean {
        return Config.AUTO_ENABLED_FLAGS.some(flag => flag === feature) ||
            this.featureFlags.some(flag => flag === feature);
    }

    /**
     * A promise returning designs owned by this user.
     */
    fetchDesigns(limit?: number): JQuery.jqXHR<Design[]> {
        const params = {
            owner: this.uuid ? this.uuid : '_anonymous_',
        };
        if (limit) {
            params['limit'] = limit
        }
        return DesignController.fetchDesigns(params).done(designs => this.designs = designs);
    }

    /**
     * A promise returning designs for which this user is a collaborator.
     */
    fetchCollaboratorDesigns(): JQuery.jqXHR<Design[]> {
        const params = {
            collaborator: this.getEmail() ? this.getEmail() : '_anonymous_'
        };
        return DesignController.fetchDesigns(params);
    }

    getDesigns(): Design[] {
        return this.designs;
    }

    public findDesignByTitle(title: string): Design | undefined {
        return this.designs.find(design => {
            return design.getTitle().toLowerCase() === title.toLowerCase();
        });
    }

    getGroups(): Group[] {
        return this.groups;
    }

    getFirstName(): string {
        return this.firstName;
    }

    getLastName(): string {
        return this.lastName;
    }

    getFullName(): string {
        return `${this.getFirstName()} ${this.getLastName()}`.trim();
    }

    getEmail(): string {
        return this.email;
    }

    public updateProfile(data: UserResource): void {
        this.email = data.email;
        this.firstName = data.first_name;
        this.lastName = data.last_name;
    }

    public updateFlags(data: UserResource): void {
        this.featureFlags = data.feature_flags;
        this._changeFeatureFlags$.next();
    }
}
