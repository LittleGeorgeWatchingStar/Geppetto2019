import {PlacedModule} from "../../src/placedmodule/PlacedModule";
import {DesignRevisionBuilder} from "../design/DesignRevisionBuilder";

let id = 966;

/**
 * @deprecated use DesignRevision.addModule() instead
 */
export default function makePlacedModule(module, attributes?, designRev?) {
    attributes = Object.assign({
        id: id++,
        x: 20,
        y: 15,
        rotation: 0,
        module: 20,
        design_revision: 49,
    }, attributes);

    attributes.module = module;
    attributes.design_revision = designRev ? designRev : new DesignRevisionBuilder().build();
    return new PlacedModule(attributes);
}
