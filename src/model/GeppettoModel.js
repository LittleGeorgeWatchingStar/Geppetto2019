import * as Backbone from "backbone";

export default class GeppettoModel extends Backbone.Model {

    url() {
        let url = super.url();
        if (url.charAt(url.length - 1) !== '/') {
            url += '/';
        }
        return url;
    }

    getId() {
        return this.get('id');
    }

    setId(id) {
        this.set('id', id);
    }
}
