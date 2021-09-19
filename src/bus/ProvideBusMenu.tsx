"use strict";

import {ProvideBusView} from "bus/ProvideBusView";
import {ProvideBus} from "./ProvideBus";
import ConnectionController from "../connection/ConnectionController";
import {BusMenuOptions} from "./BusMenu";
import {MOUSEENTER_PROVIDE, MOUSELEAVE_PROVIDE} from "./events";
import eventDispatcher from "utils/events";
import * as React from "react";
import * as Backbone from "backbone";
import * as ReactDOM from "react-dom";
import {CONNECTION_COMPLETE} from "../connection/events";
import events from "../utils/events";
import {model} from "../model";
import {PlacedModule} from "../placedmodule/PlacedModule";

/**
 * Renders the provide bus menu, which is the menu of options you see
 * when trying to connect a require bus.
 */
export class ProvideBusMenu extends Backbone.View<any> {
    private buses: ProvideBus[];
    private module: PlacedModule;

    get className() {
        return 'provide-bus-menu-container';
    }

    initialize(options: BusMenuOptions) {
        super.initialize(options);
        this.buses = options.buses.slice() as ProvideBus[];
        this.buses.sort(compareBuses);
        this.module = options.model;
        this.listenTo(events, CONNECTION_COMPLETE, () => this.render());
        this.render();
        return this;
    }

    render() {
        ReactDOM.render(<ProvideBusMenuView buses={this.buses} module={this.module}/>, this.el);
        return this;
    }

    remove() {
        ReactDOM.unmountComponentAtNode(this.el);
        return super.remove();
    }

    hide(): void {
        this.$el.stop().hide();
        /** @see fadeOut we never want to leave the opacity at a half-finished transition. **/
        this.$el.css('opacity', 1);
    }

    show(): void {
        this.$el.stop().show();
        /** @see fadeOut we never want to leave the opacity at a half-finished transition. **/
        this.$el.css('opacity', 1);
    }

    fadeOut(): void {
        if (this.el.style.display !== 'none') {
            // Even after fading to 0 opacity, the element still occupies space and can be interacted with.
            // display: none in the hide callback prevents that.
            this.$el.fadeTo(75, 0, () => this.hide());
        }
    }

    private onMouseEnter(): void {
        eventDispatcher.publish(MOUSEENTER_PROVIDE, this.cid);
    }

    events() {
        return {
            mouseenter: this.onMouseEnter,
            mouseleave: () => eventDispatcher.publish(MOUSELEAVE_PROVIDE),
        }
    }
}

/**
 * How to sort provide buses in the provide menu.
 */
function compareBuses(a: ProvideBus, b: ProvideBus): number {
    // First check if either bus is connected to the currently selected module.
    const selectedRequire = ConnectionController.getRequireToConnect();
    if (selectedRequire && selectedRequire.isConnectedToBus(a)) {
        return -1;
    }
    if (selectedRequire && selectedRequire.isConnectedToBus(b)) {
        return 1;
    }
    // Next check by priority...
    const byPriority = b.getPriority() - a.getPriority();
    if (0 === byPriority) {
        // ... then by title.
        return a.name.localeCompare(b.name, undefined, {numeric: true});
    }
    return byPriority;
}


interface ProvideBusMenuState {
    currentPage: number;
    isMousingOver: boolean;
}

interface ProvideBusMenuProps {
    buses: ProvideBus[];
    module: PlacedModule;
}

export class ProvideBusMenuView extends React.Component<ProvideBusMenuProps, ProvideBusMenuState> {

    static PAGINATE = 10;
    private readonly totalPages: number;

    constructor(props) {
        super(props);
        this.totalPages = Math.ceil(this.props.buses.length / ProvideBusMenuView.PAGINATE);
        this.state = {
            currentPage: 0,
            isMousingOver: false
        };
    }

    render(): JSX.Element {
        return (
            <div className="menu"
                 onMouseOver={() => this.setState({isMousingOver: true})}
                 onMouseOut={() => this.setState({isMousingOver: false})}
                 onWheel={event => this.scrollMenu(event)}>
                {this.totalPages > 1 && this.state.isMousingOver &&
                <div className="current-page-label"
                     title="Scroll to navigate options">
                    Page {this.state.currentPage + 1} of {this.totalPages}
                </div>}
                <h5>{this.props.module.name}</h5>
                <h6>Select a Provide Bus</h6>
                <ol className="menu-page">
                    {this.getCurrentPageBuses().map(bus => <ProvideBusView bus={bus}
                                                                           key={bus.cid}/>)}
                </ol>
                {this.totalPages > 1 && this.getMenuControl()}
                <div className="pointer left"/>
            </div>
        );
    }

    private getMenuControl(): JSX.Element {
        const isFirstPage = this.state.currentPage === 0;
        const isLastPage = this.state.currentPage === this.totalPages - 1;
        return (
            <div className="menu-control">
                <div className={`prev ${isFirstPage ? 'disabled-js' : ''}`}
                     onClick={() => this.flipPage(-1)} title="Previous page"/>
                <div className={`next ${isLastPage ? 'disabled-js' : ''}`}
                     onClick={() => this.flipPage(1)} title="More options"/>
            </div>
        );
    }

    private flipPage(direction: -1 | 1): void {
        const desiredIndex = this.state.currentPage + direction;
        if (desiredIndex >= 0 && desiredIndex < this.totalPages) {
            this.setState({
                currentPage: desiredIndex
            });
        }
    }

    private scrollMenu(event): void {
        if (event.deltaY < 0) {
            this.flipPage(-1);
        } else {
            this.flipPage(1);
        }
    }

    private getCurrentPageBuses(): ProvideBus[] {
        const startIndex = this.state.currentPage * ProvideBusMenuView.PAGINATE;
        return this.props.buses
            .filter(b => !b.implementsVlogicTemplate())
            .slice(startIndex, startIndex + ProvideBusMenuView.PAGINATE);
    }
}
