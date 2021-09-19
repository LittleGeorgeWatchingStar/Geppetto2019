import {Toolbutton, ToolbuttonProps, ToolbuttonState} from "./ToolButton";
import {Subscription} from "rxjs";
import {PromotionController} from "../../promotions/PromotionController";
import * as React from "react";

interface PriceToolbuttonProps extends ToolbuttonProps {
}

interface PriceToolbuttonState extends ToolbuttonState {
    promotionMessage: string | null;
}

export class PriceToolbutton extends Toolbutton<PriceToolbuttonProps, PriceToolbuttonState> {
    private subscriptions: Subscription[] = [];

    public constructor(props) {
        super(props);
        this.state = {
            ...this.fetchPromotionControllerState(),
        };
    }

    private fetchPromotionControllerState(): PriceToolbuttonState {
        return {
            promotionMessage: PromotionController.getInstance().priceToolbuttonMessage,
        }
    }

    public componentDidMount(): void {
        this.subscriptions.push(PromotionController.getInstance().subscribe(() => {
            this.setState(this.fetchPromotionControllerState)
        }));
    }

    public componentWillUnmount(): void {
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

        const title = this.state.promotionMessage ? this.state.promotionMessage : this.tooltip;

        return (
            <button id={this.props.id}
                    disabled={this.isDisabled}
                    title={title}
                    onClick={() => this.onClick()}
                    className={`${activeClass} toolbar-button`}>
                <span id={id} className="toolbar-icon">
                </span>
                <span className="toolbar-text">
                    {this.props.title}
                    {this.state.promotionMessage &&
                        <span className="promotion-icon"/>}
                </span>
            </button>
        );
    }
}