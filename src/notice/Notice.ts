import GeppettoModel from 'model/GeppettoModel';

export default class Notice extends GeppettoModel {

    defaults() {
        return {
            text: ''
        }
    }

    getText() {
        return this.get('text');
    }
}
