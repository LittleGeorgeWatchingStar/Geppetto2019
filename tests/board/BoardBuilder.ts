import {Board} from "../../src/model/Board";
import {Module} from "../../src/module/Module";
import {ModuleBuilder} from "../module/ModuleBuilder";
import {ServerID} from "../../src/model/types";
import {DesignRevisionBuilder} from "../design/DesignRevisionBuilder";
import {DesignRevision} from "../../src/design/DesignRevision";


/**
 * A builder that constructs custom Boards for unit tests. Not to be confused with the Board Builder feature.
 */
export class BoardBuilder {
    private design: DesignRevision;
    private id: ServerID;
    private module_revision: ServerID;
    private width: number;
    private height: number;
    private corner_radius: number;
    private x: number;
    private y: number;

    constructor() {
        // TODO: DesignRevisions created their own board
        this.design = new DesignRevision();
        this.id = 0;
        this.module_revision = 5;
        this.height = 400; // Board default height
        this.width = 1050; // Board default width
        this.corner_radius = 0;
        this.x = 0;
        this.y = 0;
    }

    public build(): Board {
        const board = new Board();
        board.set('id', this.id);
        board.set('module_revision', this.module_revision);
        board.resize(this.width, this.height);
        board.set('corner_radius', this.corner_radius);
        board.set('x', this.x);
        board.set('y', this.y);
        return board;
    }

    public withModuleRevision(revisionNo: number): BoardBuilder {
        this.module_revision = revisionNo;
        return this;
    }

    public withId(id: ServerID): BoardBuilder {
        this.id = id;
        return this;
    }

    public withWidth(width: number): BoardBuilder {
        this.width = width;
        return this;
    }

    public withHeight(height: number): BoardBuilder {
        this.height = height;
        return this;
    }

    public withPosition(x: number, y: number): this {
        this.x = x;
        this.y = y;
        return this;
    }

    public withRadius(radius: number): BoardBuilder {
        this.corner_radius = radius;
        return this;
    }
}
