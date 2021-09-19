import {getConnectionState} from "../../core/NeedsConnections";
import {SelectRequireEvent} from "../events";
import {RequireBusView} from "../RequireBusView";
import ConnectionController from "../../connection/ConnectionController";

export class ExclusionView extends RequireBusView {

    get className() {
        return 'bus exclusion';
    }

    render() {
        this.$el.removeClass('unready ready connected ui-state-disabled');
        this.$el.addClass(getConnectionState(this.bus));
        const isSelected = ConnectionController.getRequireToConnect() === this.model;
        const isFaded = null != ConnectionController.getRequireToConnect() && !isSelected;
        this.$el.toggleClass('ui-state-disabled', isFaded);
        this.$el.toggleClass('selected', isSelected);
        return this;
    }
}
