import * as React from "react";
import {PricingModel} from "../price/Pricing";
import {Workspace} from "../workspace/Workspace";
import * as Config from "Config";
import {DesignRevision} from "../design/DesignRevision";
import {PromotionController} from "../promotions/PromotionController";
import {Subscription} from "rxjs";
import UserController from "../auth/UserController";
import {LoginController} from "../controller/Login";
import {PartnerTheme, ThemeController} from "../controller/ThemeController";


const month = [
    "Jan.",
    "Feb.",
    "March",
    "April",
    "May",
    "June",
    "July",
    "Aug.",
    "Sept.",
    "Oct.",
    "Nov.",
    "Dec."
];

interface PriceProps {
    workspace: Workspace;
    design: DesignRevision;
}

interface PriceState {
    feeMessage: string | null;
    promotionMessage: string | null;
}

export class PriceView extends React.Component<PriceProps, PriceState> {
    private subscriptions: Subscription[] = [];

    private LEAD_TIME = 20; // days

    constructor(props) {
        super(props);
        this.state = {
            ...this.fetchPromotionControllerState()
        };
    }

    private fetchPromotionControllerState(): PriceState {
        return {
            feeMessage: PromotionController.getInstance().feeMessage || 'Set-up fee: $1999',
            promotionMessage: PromotionController.getInstance().priceMessage,
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

    render(): JSX.Element | null {
        const quantityPrices = this.quantityPrices;
        const user = UserController.getUser();

        return (
            <>
                {!this.props.workspace.isPriceActive &&
                <button onClick={() => this.props.workspace.togglePriceActive()}
                        className="price-chart-open-button workspace-widget-button"
                        title="Display the board cost chart">
                    {this.state.promotionMessage &&
                    <span></span>
                    }
                </button>}
                {this.props.workspace.isPriceActive &&
                <div className="price-chart workspace-widget">
                    <div className="header">
                        <span>Price</span>
                        <button onClick={() => this.props.workspace.togglePriceActive()}
                                className="widget-close-button"
                                title="Hide price chart">
                        </button>
                    </div>
                    <div className="container">
                        {Config.GUMSTIX_PRICING && user.isLoggedIn() &&
                        <div className="price-chart-gumstix">
                            <div className="price-chart__setup-fee">
                                {this.state.feeMessage}
                            </div>
                            <div className="price-chart__ship-date"
                                 title="Order today and your board will ship by this date">
                                Ships <b>{this.shipDateFrom(new Date())}</b>
                            </div>
                            <div className="price-chart__detailed-info">
                                {ThemeController.getInstance().SHIPPING_INFO_URL &&
                                <a href={ThemeController.getInstance().SHIPPING_INFO_URL}
                                   target="_blank">
                                    Detailed Pricing & Shipping Info↗
                                </a>}
                            </div>
                        </div>}
                        {user.isLoggedIn() &&
                        <div className="price-chart-price-table">
                            <table>
                                <thead>
                                <tr>
                                    <th>Quantity</th>
                                    <th>Per Unit</th>
                                </tr>
                                </thead>
                                <tbody>
                                {
                                    Object.keys(quantityPrices).map(q =>
                                        <tr key={q}>
                                            <td>{q}</td>
                                            <td>${quantityPrices[q]}</td>
                                        </tr>
                                    )
                                }
                                </tbody>
                            </table>

                            {this.state.promotionMessage &&
                            <div className="promotion">
                                <div className="alert alert-success"
                                     dangerouslySetInnerHTML={{__html: this.state.promotionMessage}}/>
                            </div>
                            }
                        </div>}
                        {!user || !user.isLoggedIn() &&
                        <div className="price-login-container">
                            <p>Please login to see the price.</p>
                            <button onClick={() => LoginController.getInstance().login()}>Login</button>
                        </div>
                        }
                    </div>
                </div>}
            </>
        );
    }

    private shipDateFrom(date: Date): string {
        date.setDate(date.getDate() + 21);
        return month[date.getMonth()] + ' ' + date.getDate();
    }

    private get quantityPrices(): { [quantity: string]: number } {
        if (ThemeController.getInstance().THEME === PartnerTheme.ADLINK) {
            const quantityPriceMap = {};
            const price = PricingModel.designUnitPrice(this.props.design, 1,
                this.LEAD_TIME);
            const key = '1 - 100';
            quantityPriceMap[key] = price ? price.toFixed(2) : '-';
            return quantityPriceMap;
        }

        const quantities = [1];
        if (Config.GUMSTIX_PRICING) {
            quantities.push(100, 480);
        }
        const quantityPriceMap = {};
        quantities.forEach((quantity, i) => {
            const price = PricingModel.designUnitPrice(this.props.design, quantity,
                this.LEAD_TIME);
            const next = quantities[i + 1];
            const suffix = next ? ` - ${next - 1}` : '+';
            const key = `${quantity}${suffix}`; // Eg. 1-59 or 240+
            quantityPriceMap[key] = price ? price.toFixed(2) : '-';
        });
        return quantityPriceMap;
    }
}
