import * as Backbone from 'backbone';
import PriceChange from 'price/PriceChange';

export default class PriceChangeCollection extends Backbone.Collection<PriceChange> {
    get model() {return PriceChange}
}
