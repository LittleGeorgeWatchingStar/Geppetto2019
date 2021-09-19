import {SubMenu} from "../../view/SubMenu";
import {RequireBus} from "../RequireBus";
import {getConnectionState} from "../../core/NeedsConnections";
import * as $ from "jquery";
import events from "../../utils/events";
import {CANCEL_CONNECT} from "../../workspace/events";
import {REMOVE_MODULE_FINISH} from "../../module/events";
import {CONNECTION_COMPLETE} from "../../connection/events";
import {PLACED_MODULE_SELECT} from "../../placedmodule/events";
import * as React from "react";
import * as ReactDOM from "react-dom";
import {OptionalRequireBusView} from "./OptionalRequireBusView";
import {OptionalNoConnectView} from "./OptionalNoConnectView";
import ConnectionController from "../../connection/ConnectionController";
import {REQUIRE_DOUBLE_CLICK, REQUIRE_NO_CONNECT_CLICK, SELECT_REQUIRE} from "../events";


export class OptionalRequireBusMenu extends SubMenu {
    protected bus: RequireBus;
    private $optionsContainer;

    get className() {
        return 'bus optional';
    }

    initialize(): this {
        this.bus = this.model;
        super.initialize();

        this.listenTo(this.bus, "change:options change:selected change:exclude change:explicit_require_no_connection", this.render);

        this.listenTo(events, SELECT_REQUIRE, () => this.render());
        this.listenTo(events, CANCEL_CONNECT, () => this.render());
        this.listenTo(events, REMOVE_MODULE_FINISH, () => this.render());
        this.listenTo(events, CONNECTION_COMPLETE, () => this.render());
        this.listenTo(events, PLACED_MODULE_SELECT, () => this.render());

        this.render();
        return this;
    }

    protected createMenu(): void {
        super.createMenu();
        this.$el.append(this.getOptions());
    }

    protected get submenuItemContent(): string {
        return `<span class="bus-name">${this.bus.name}</span>`;
    }

    private getOptions(): JQuery {
        this.$optionsContainer = $('<ol class="bus sub-options">');
        return this.$optionsContainer;
    }

    remove() {
        ReactDOM.unmountComponentAtNode(this.$optionsContainer.get(0));
        return super.remove();
    }

    render() {
        this.$el.removeClass('unready ready connected');
        if (this.bus.isNoConnect()) {
            this.$el.addClass('connected')
        } else {
            this.$el.addClass(getConnectionState(this.bus));
        }

        const onClickNoConnect = () => {
            events.publishEvent(REQUIRE_NO_CONNECT_CLICK, {model: this.bus});
        };

        const onClickBus = () => {
            events.publishEvent(SELECT_REQUIRE, {model: this.bus});
        };

        const onDoubleClickBus = () => {
            if (!this.bus.isConnected()) {
                events.publishEvent(REQUIRE_DOUBLE_CLICK, {model: this.bus});
            }
        };

        ReactDOM.render(
            [
                <OptionalNoConnectView
                    key={1}
                    bus={this.bus}
                    noConnect={this.bus.isNoConnect()}
                    requireToConnect={ConnectionController.getRequireToConnect()}
                    onClick={onClickNoConnect} />,
                <OptionalRequireBusView
                    key={2}
                    bus={this.bus}
                    connectionState={getConnectionState(this.bus)}
                    requireToConnect={ConnectionController.getRequireToConnect()}
                    onClick={onClickBus}
                    onDoubleClick={onDoubleClickBus} />
            ],
            this.$optionsContainer.get(0));

        return this;
    }
}


