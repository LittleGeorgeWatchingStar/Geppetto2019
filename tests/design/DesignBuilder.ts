import {DesignRevision} from "../../src/design/DesignRevision";
import {DesignRevisionBuilder} from "./DesignRevisionBuilder";
import {Design} from "../../src/design/Design";
import {ServerID} from "../../src/model/types";

export class DesignBuilder {
    private id: number;
    private currentRevisionId: number;
    private title: string;
    private description: string;
    private designRevision: DesignRevision;
    private created: Date;
    private updated: Date;
    private moduleIds: number[] | ServerID[];
    private imageUrl: string;
    private productUrl: string;
    private ownerId: number;
    private ownerName: string;

    constructor() {
        this.title = 'Design title';
        this.description = 'Design description';
        this.designRevision = new DesignRevisionBuilder().build();
        this.created = new Date();
        this.updated = new Date();
    }

    public withId(id: number): this {
        this.id = id;
        return this;
    }

    public withTitle(title: string): this {
        this.title = title;
        return this;
    }

    public withDescription(description: string): this {
        this.description = description;
        return this;
    }

    public withCreated(created: Date): this {
        this.created = new Date(created);
        return this;
    }

    public withUpdated(date: Date): this {
        this.updated = new Date(date);
        return this;
    }

    public withDesignRevision(designRevision: DesignRevision): this {
        this.designRevision = designRevision;
        return this;
    }

    public withModuleIds(moduleIds: number[] | ServerID[]): this {
        this.moduleIds = moduleIds;
        return this;
    }

    public withImageUrl(url: string): this {
        this.imageUrl = url;
        return this;
    }

    public withProductUrl(url: string): this {
        this.productUrl = url;
        return this;
    }

    public withOwnerId(ownerId: number): this {
        this.ownerId = ownerId;
        return this;
    }

    public withOwnerName(name: string): this {
        this.ownerName = name;
        return this;
    }

    public withCurrentRevisionId(id: number): this {
        this.currentRevisionId = id;
        return this;
    }

    public build(): Design {
        return new Design({
            id: this.id,
            title: this.title,
            description: this.description,
            current_revision: this.designRevision,
            created: this.created.toISOString(),
            updated: this.updated.toISOString(),
            module_ids: this.moduleIds,
            image_url: this.imageUrl,
            product_url: this.productUrl,
            owner_full_name: this.ownerName,
            owner: this.ownerId,
            current_revision_id: this.currentRevisionId
        });
    }
}
