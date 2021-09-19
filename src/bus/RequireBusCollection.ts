import {BusCollection} from "./BusCollection";
import {RequireBus} from "./RequireBus";

export class RequireBusCollection extends BusCollection<RequireBus> {
    get model() {return RequireBus}
}
