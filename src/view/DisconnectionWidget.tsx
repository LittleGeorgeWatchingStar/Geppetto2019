import * as Backbone from 'backbone';
import {ViewOptions} from 'backbone';
import {CONNECTION_COMPLETE} from 'connection/events';
import {RequireBus} from "../bus/RequireBus";
import {ProvideBus} from "../bus/ProvideBus";
import {SELECT_REQUIRE} from "../bus/events";
import events from "utils/events";
import * as $ from "jquery";
import {CANCEL_CONNECT} from "../workspace/events";
import {FinishConnection} from "../connection/actions";
import * as React from "react";
import * as ReactDOM from 'react-dom';


export interface DisconnectionWidgetOptions extends ViewOptions<any> {
    provideToDisconnect: ProvideBus,
    provideToConnect: ProvideBus,
    requireToConnect: RequireBus,
    listHeader: string
    message: string,
}

/**
 * Widget that lists bus connections and options for disconnecting.
 */
export class DisconnectionWidget extends Backbone.View<any> {

    private message: string;
    private provideToDisconnect: ProvideBus;
    private provideToConnect: ProvideBus;
    private requireToConnect: RequireBus;
    private listHeader: string;

    initialize(options: DisconnectionWidgetOptions) {
        super.initialize(options);
        this.message = options.message;
        this.provideToDisconnect = options.provideToDisconnect;
        this.provideToConnect = options.provideToConnect;
        this.requireToConnect = options.requireToConnect;
        this.listHeader = options.listHeader;

        this.listenTo(events, SELECT_REQUIRE, this.remove);
        this.listenTo(events, CANCEL_CONNECT, this.remove);
        this.listenTo(events, CONNECTION_COMPLETE, this.refresh);

        this.render();
        this.setupDraggable();

        return this;
    }

    get className() {
        return 'disconnect-widget';
    }

    public setPosition(target: HTMLElement): void {
        // The container (workspace) is smaller than the window. We want to ignore that so position aligns properly.
        this.$el.css('position', 'fixed');
        this.$el.position({
            my: 'left top',
            at: 'right top',
            of: target
        });
    }

    render() {
        const element = (
            <div>
                <button type="button"
                        className="x"/>
                <div className="connection-info">
                    {this.message}
                </div>
                <div className={"header-container"}>
                    <b>{this.listHeader}</b>
                </div>
                <ul>
                    {this.provideToDisconnect.getGraphChildren().map(c =>
                        <ConnectionNodeView provide={this.provideToDisconnect}
                                            requireToDisconnect={c}
                                            requireToConnect={this.requireToConnect}
                                            key={c.id}
                        />)}
                </ul>
            </div>
        );
        ReactDOM.render(element, this.el);
        return this;
    }

    remove() {
        ReactDOM.unmountComponentAtNode(this.el);
        return super.remove();
    }

    private setupDraggable(): void {
        this.$el.draggable({
            distance: 5, // Desensitize touch drag
            cancel: '.disconnect' // Do not allow dragging on the Disconnect button
        });
    }

    private refresh(): void {
        if (this.requireToConnect.isConnected() ||
            this.provideToConnect.hasEnoughCapacityFor(this.requireToConnect)) {
            this.remove();
        } else if (this.provideToDisconnect.hasConnection()) {
            this.render();
        }
    }

    events() {
        return {
            'click .x': this.remove
        };
    }
}

interface ConnectionNodeProps {
    requireToDisconnect: RequireBus;
    requireToConnect: RequireBus;
    provide: ProvideBus;
}

/**
 *  Represents an individual connection.
 */
class ConnectionNodeView extends React.Component<ConnectionNodeProps> {

    constructor(props: ConnectionNodeProps) {
        super(props);
    }

    render() {
        const reqToDisconnect = this.props.requireToDisconnect;
        return (
            <li>
                <div className={"list-item-label"}
                     onMouseOver={() => this.highlight()}
                     onMouseOut={() => this.stopHighlighting()}>
                    <div>
                        <span className={"module-name"}>{reqToDisconnect.moduleName}:</span>
                        <span className={"bus-name"}>{reqToDisconnect.name}</span>
                    </div>
                </div>
                <button className="action disconnect"
                        onClick={() => this.disconnect()}>
                    Disconnect
                </button>
                {this.canSwap() &&
                <button className="action swap"
                        onClick={() => this.swap()}>
                    Swap
                </button>}
            </li>
        );
    }

    componentWillUnmount(): void {
        this.stopHighlighting();
    }

    private canSwap(): boolean {
        const provide = this.props.provide;
        const reqToConnect = this.props.requireToConnect;
        if (reqToConnect.isConnected() || !provide.isCompatibleTo(reqToConnect)) return false;
        const reqToDisconnect = this.props.requireToDisconnect;
        if (provide.isPower()) {
            return provide.getRemaining() + reqToDisconnect.powerDraw >= reqToConnect.powerDraw;
        }
        return reqToDisconnect.getNumConnections() >= reqToConnect.getNumConnections();
    }

    private swap(): void {
        FinishConnection.addToStack(this.props.provide, this.props.requireToDisconnect);
        FinishConnection.addToStack(this.props.provide, this.props.requireToConnect);
    }

    private disconnect(): void {
        FinishConnection.addToStack(this.props.provide, this.props.requireToDisconnect);
    }

    /**
     * Indicates the placed module.
     */
    private highlight(): void {
        const pm = this.props.requireToDisconnect.placedModule;
        $("[uid='" + pm.cid + "'] .svg-container").addClass('fast-blink');
        this.fadeOutBlockingElements();
    }

    private stopHighlighting(): void {
        const pm = this.props.requireToDisconnect.placedModule;
        $("[uid='" + pm.cid + "'] .svg-container").removeClass('fast-blink');
        this.restoreElements();
    }

    /**
     * Fade out elements that may be covering the highlighted module.
     */
    private fadeOutBlockingElements(): void {
        this.fadeElements(200, 0.3);
    }

    private restoreElements(): void {
        this.fadeElements(100, 1);
    }

    private fadeElements(duration: number, opacity: number): void {
        // .stop() to avoid queuing the fading animations.
        $('.bus.require').stop().fadeTo(duration, opacity);
        $('.bus.provide').stop().fadeTo(duration, opacity);
    }
}
