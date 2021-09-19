import {DesignRevision} from "../../src/design/DesignRevision";
import {Module} from "../../src/module/Module";
import {PlacedModule} from "../../src/placedmodule/PlacedModule";
import {Point, Vector2D} from "../../src/utils/geometry";
import {ModuleBuilder} from "../module/ModuleBuilder";
import {DesignRevisionBuilder} from "../design/DesignRevisionBuilder";

export class PlacedModuleBuilder {
    private module: Module;
    private designRevision: DesignRevision;
    private position: Vector2D;
    private rotation: number;
    private id: number;
    private uuid: string;

    constructor() {
        this.module = new ModuleBuilder().build();
        this.designRevision = new DesignRevisionBuilder().build();
        this.position = Point.origin();
        this.rotation = 0;
    }

    public withModule(module: Module): this {
        this.module = module;
        return this;
    }

    public withId(id: number): this {
        this.id = id;
        return this;
    }

    public withUuid(uuid: string): this {
        this.uuid = uuid;
        return this;
    }

    public withPosition(x: number, y: number): this {
        this.position = {x: x, y: y};
        return this;
    }

    public withDesignRevision(revision: DesignRevision): this {
        this.designRevision = revision;
        return this;
    }

    public withRotation(rotation: number): this {
        this.rotation = rotation;
        return this;
    }

    public build(): PlacedModule {
        const pm = this.designRevision.addModule(this.module, this.position, 0, this.uuid);
        if (typeof this.id !== 'undefined') {
            pm.setId(this.id);
        }
        pm.rotateTo(this.rotation);
        return pm;
    }
}
