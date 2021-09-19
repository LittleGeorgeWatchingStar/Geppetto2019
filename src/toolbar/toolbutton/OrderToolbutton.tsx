import {Toolbutton, ToolbuttonProps, ToolbuttonState} from "./ToolButton";
import * as React from "react";
import {Subscription} from "rxjs";
import {LoginController} from "../../controller/Login";
import UserController from "../../auth/UserController";

interface OrderToolbuttonProps extends ToolbuttonProps {
}

interface OrderToolbuttonState extends ToolbuttonState {
    status: number | null;
}

export class OrderToolbutton extends Toolbutton<OrderToolbuttonProps, OrderToolbuttonState> {
    private subscriptions: Subscription[] = [];

    public constructor(props) {
        super(props);
    }

    public componentWillUnmount() {
        this.subscriptions.forEach(
            subscription => subscription.unsubscribe());
        this.subscriptions = [];
    }

    public render(): React.ReactNode {
        if (!this.isVisible) {
            return null;
        }
        const id = `${this.props.id}-icon`;
        const activeClass = this.isActive ? 'active-js' : '';
        const inactiveClass = this.isDisabled ? 'order-inactive' : '';

        return (
            <button id={this.props.id}
                    title={this.tooltip}
                    onClick={() => this.onClick()}
                    className={`${activeClass} toolbar-button ${inactiveClass}`}>
                <span id={id} className="toolbar-icon">
                </span>
                <span className="toolbar-text">
                    {this.props.title}
                </span>
            </button>
        );
    }

    protected onClick() {
        if(!this.isActive && !UserController.getUser().isLoggedIn()) return LoginController.getInstance().login();
        super.onClick();
    }
}