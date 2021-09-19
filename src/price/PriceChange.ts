import GeppettoModel from 'model/GeppettoModel';

export default class PriceChange extends GeppettoModel {

    defaults() {
        return {
            vlogic_group: '',
            bus_group: ''
        };
    }

    initialize(attributes) {
        if (attributes.busgroup_vlogic) {
            this.setVlogicBusGroup(attributes.busgroup_vlogic);
        }
        if (attributes.level) {
            this.setLevel(attributes.level);
        }
        if (attributes.placed_module) {
            this._setPlacedModule(attributes.placed_module);
        }
        return this;
    }

    getVlogicBusGroup() {
        return this.get('vlogic_group')
    }

    setVlogicBusGroup(group) {
        this.set('vlogic_group', group)
    }

    getLevel() {
        return this.get('level')
    }

    setLevel(level) {
        this.set('level', level)
    }

    getChangeInPrice() {
        return this.get('change_in_price')
    }

    _setPlacedModule(placedModule) {
        this.set('placed_module', placedModule)
    }
}
