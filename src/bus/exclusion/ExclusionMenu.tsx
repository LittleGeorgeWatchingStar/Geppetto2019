import * as $ from "jquery";
import {ExclusionView} from "./ExclusionView";
import {ExclusionSet} from "./ExclusionSet";
import {SubMenu} from "../../view/SubMenu";
import {CONNECTION_COMPLETE} from "../../connection/events";
import events from "../../utils/events";
import {PLACED_MODULE_SELECT} from "../../placedmodule/events";
import {CANCEL_CONNECT} from "../../workspace/events";
import {REMOVE_MODULE_FINISH} from "../../module/events";
import {EXCLUSION_SET_NO_CONNECT_CLICK, SELECT_REQUIRE} from "../events";
import * as ReactDOM from "react-dom";
import * as React from "react";
import ConnectionController from "../../connection/ConnectionController";
import {ExclusionNoConnectView} from "./ExclusionNoConnectView";

/**
 * The menu of mutually-exclusive require buses.
 */
export class ExclusionMenu extends SubMenu {
    private $noConnectContainer;

    get className(): string {
        return 'exclusion-menu';
    }

    initialize() {
        super.initialize();

        this.listenTo(events, SELECT_REQUIRE, () => this.render());
        this.listenTo(events, CANCEL_CONNECT, () => this.render());
        this.listenTo(events, REMOVE_MODULE_FINISH, () => this.render());
        this.listenTo(events, CONNECTION_COMPLETE, () => this.render());
        this.listenTo(events, EXCLUSION_SET_NO_CONNECT_CLICK, () => this.render());
        this.listenTo(events, PLACED_MODULE_SELECT, () => this.render());

        (this.collection as ExclusionSet).each(require => {
            this.listenTo(require, "change:explicit_require_no_connection", this.render);
        });

        this.render();
        return this;
    }

    protected createMenu(): void {
        super.createMenu();
        this.$el.append(this.getOptions());
    }

    protected get submenuItemContent(): string {
        return '<span>Choose</span>';
    }

    private getOptions(): JQuery {
        const inclusionSets = (this.collection as ExclusionSet).getInclusionSets();
        const $options = $('<ol class="bus sub-options">');

        if ((this.collection as ExclusionSet).isOptional()) {
            this.$noConnectContainer = $('<div class="inclusions">');
            $options.append(this.$noConnectContainer);
        }

        inclusionSets.forEach(inclusions => {
            const $inclusions = $('<div>');
            $inclusions.addClass('inclusions');
            inclusions.forEach(inclusion => {
                const exclusion_view = new ExclusionView({model: inclusion});
                $inclusions.append(exclusion_view.$el);
                this.listenTo(inclusion, "change:options", this.render);
            });
            $options.append($inclusions);
        });
        return $options;
    }

    render() {
        const menu = this.$el;
        menu.removeClass('unready ready connected');
        const exclusionSet = this.collection as ExclusionSet;

        if (exclusionSet.isConnected() || exclusionSet.isNoConnect()) {
            menu.addClass('connected');
        } else if (exclusionSet.isReady()) {
            menu.addClass('ready');
        } else {
            menu.addClass('unready');
        }

        if (exclusionSet.isOptional()) {
            this.$el.addClass('optional');
        }

        if (this.$noConnectContainer) {
            const onClickNoConnect = () => {
                events.publishEvent(EXCLUSION_SET_NO_CONNECT_CLICK, {model: this.collection as ExclusionSet});
            };

            ReactDOM.render(
                <ExclusionNoConnectView
                    exclusionSet={(this.collection as ExclusionSet)}
                    noConnect={(this.collection as ExclusionSet).isNoConnect()}
                    requireToConnect={ConnectionController.getRequireToConnect()}
                    onClick={onClickNoConnect} />,
                this.$noConnectContainer.get(0))
        }

        return this;
    }
}
