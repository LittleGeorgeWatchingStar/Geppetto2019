import GeppettoModel from 'model/GeppettoModel';
import {DesignRevision} from "../design/DesignRevision";

interface CartAttributes {
    designRevision: DesignRevision;
}

/**
 * For completing a design and adding it to the store.
 */
export default class Cart extends GeppettoModel {

    private designRevision: DesignRevision;

    get urlRoot() {return "/api/v3/production/builds/"}

    initialize(options: CartAttributes) {
        this.designRevision = options.designRevision;

        this.set({
            permalink: this.designRevision.getDesignPermalink()
        });
    }

    toJSON() {
        return {
            revision: this.designRevision.getId(),
            permalink: this.get('permalink')
        };
    }
}
