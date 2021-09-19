import {DesignRevision} from "../../src/design/DesignRevision";

export class DesignRevisionBuilder {
    private fields = {
        id: 1,
        title: '1',
        design_title: 'Test design revision',
        design_id: 1,
        design_owner: 2,
        created: null,
        locked: false,
        uri: '',
        board_url: '',
        product_url: '',
        height: 0,
        width: 0,
        connections: [],
        explicit_require_no_connections: [],
        dimensions: [],
        image_url: '',
        dirty: false,
        new: true
    };

    public build(): DesignRevision {
        return new DesignRevision(this.fields);
    }

    public withTitle(title: string): this {
        this.fields.title = title;
        return this;
    }

    public withName(name: string): this {
        this.fields.design_title = name;
        return this;
    }

    public withOwner(id: number): this {
        this.fields.design_owner = id;
        return this;
    }

    public withFirstSaved(date: Date): this {
        this.fields.created = date.toISOString();
        return this;
    }

    public withDesignId(id: number): this {
        this.fields.design_id = id;
        return this;
    }

    public withId(id: number): this {
        this.fields.id = id;
        return this;
    }

    public withImage(url: string): this {
        this.fields.image_url = url;
        return this;
    }

    public withDimension(height: number, width: number): this {
        this.fields.height = height;
        this.fields.width = width;
        return this;
    }

    public asPushed(board_url="Board URL"): this {
        this.fields.locked = true;
        this.fields.board_url = board_url;
        return this;
    }

    public asDirty(): this {
        this.fields.dirty = true;
        return this;
    }
}
