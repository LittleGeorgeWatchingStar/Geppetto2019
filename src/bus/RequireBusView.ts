import * as Backbone from 'backbone';
import * as busTemplate from 'templates/bus';
import events from 'utils/events';
import {CONNECTION_COMPLETE} from "../connection/events";
import {getConnectionState} from "../core/NeedsConnections";
import {REQUIRE_DOUBLE_CLICK, SELECT_REQUIRE, SelectRequireEvent} from "./events";
import {RequireBus} from "./RequireBus";
import {PLACED_MODULE_SELECT} from "../placedmodule/events";
import {CANCEL_CONNECT} from "../workspace/events";
import ConnectionController from "../connection/ConnectionController";

export class RequireBusView extends Backbone.View<RequireBus> {

    protected bus: RequireBus;

    get tagName() {
        return 'li'
    }

    get className() {
        return 'bus';
    }

    initialize() {
        this.bus = this.model;

        this.$el.html(busTemplate({title: this.bus.name}));
        this.listenTo(this.bus, "change:options change:selected change:exclude", this.render);

        this.listenTo(events, CANCEL_CONNECT, () => this.render());
        // TODO this listener callback MUST come before ConnectionController's to work.
        this.listenTo(events, SELECT_REQUIRE, () => this.render());
        this.listenTo(events, CONNECTION_COMPLETE, () => this.render());
        this.listenTo(events, PLACED_MODULE_SELECT, () => this.render());

        this.render();
        return this;
    }

    render() {
        this.renderAttributes(['exclude']);
        this.$el.removeClass('unready ready connected ui-state-disabled selected');
        this.$el.addClass(getConnectionState(this.bus));
        const isSelected = ConnectionController.getRequireToConnect() === this.model;
        const isFaded = null != ConnectionController.getRequireToConnect() && !isSelected;
        this.$el.toggleClass('ui-state-disabled', isFaded);
        this.$el.toggleClass('selected', isSelected);
        return this;
    }

    private renderAttributes(attributes: string[]) {
        for (const attribute of attributes) {
            // classList works on both svgs and DOM nodes, as opposed to
            // jQuery's addClass/removeClass.
            this.model.get(attribute) ? this.el.classList.add(attribute) : this.el.classList.remove(attribute);
        }
    }

    click() {
        events.publishEvent(SELECT_REQUIRE, {model: this.bus} as SelectRequireEvent);
    }

    tryAutoConnect(): void {
        if (!this.model.isConnected()) {
            events.publishEvent(REQUIRE_DOUBLE_CLICK, {model: this.bus} as SelectRequireEvent);
        }
    }

    events() {
        return {
            click: this.click,
            dblclick: this.tryAutoConnect
        }
    }
}
