import {BusCollection} from "./BusCollection";
import {ProvideBus} from "./ProvideBus";

export class ProvideBusCollection extends BusCollection<ProvideBus> {
    get model() {return ProvideBus}
}
