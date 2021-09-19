import * as Backbone from 'backbone';
import {alphanumCase} from 'lib/alphanum';
import {Bus} from "./Bus";

export class BusCollection<TModel extends Bus> extends Backbone.Collection<TModel> {

    compareTitles(a, b) {
        return alphanumCase(a.getTitle(), b.getTitle());
    }

    rotateProximityPoints() {
        this.map(bus => bus.rotateProximityPoint());
    }
}
