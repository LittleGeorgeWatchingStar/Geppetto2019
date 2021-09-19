import * as Backbone from 'backbone';
import {BusGroup} from "./BusGroup";

export class BusGroupCollection extends Backbone.Collection<BusGroup> {
    get model() {
        return BusGroup;
    }
}
