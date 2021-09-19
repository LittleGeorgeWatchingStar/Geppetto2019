import {Toolbutton, ToolbuttonProps, ToolbuttonState} from "./ToolButton";
import {Subscription} from "rxjs";
import * as React from "react";
import {DesignController} from "../../design/DesignController";
import {DimensionEventsController} from "../../dimension/DimensionEventsController";
import {DimensionCollectionEventsController} from "../../dimension/DimensionCollectionEventsController";
import {DimensionToolbuttonLockTooltipController} from "./DimensionToolbuttonLockTooltipController";

let dimensionTooltip;

interface DimensionToolbuttonProps extends ToolbuttonProps {
}

interface DimensionToolbuttonState extends ToolbuttonState {
    showLockIcon: boolean;
    showLockTooltip: boolean;
}

export class DimensionToolbutton extends Toolbutton<DimensionToolbuttonProps, DimensionToolbuttonState> {
    private subscriptions: Subscription[] = [];

    public constructor(props) {
        super(props);
        this.state = {
            ...this.fetchDimensionLockState(),
            ...this.fetchDimensionLockTooltipState(),
        };
    }

    private fetchDimensionLockState(): Pick<DimensionToolbuttonState, 'showLockIcon'> {
        const designRev = DesignController.getCurrentDesign();

        const showLockIcon = designRev ?
            designRev.dimensions.some(dimension => {
                return dimension.isLockedByUser() ||
                    (!dimension.isLocked() && !dimension.canResize()); // Implicitly locked.
            }) :
            false;

        return {
            showLockIcon: showLockIcon,
        }
    }

    private fetchDimensionLockTooltipState(): Pick<DimensionToolbuttonState, 'showLockTooltip'> {
        return {
            showLockTooltip: DimensionToolbuttonLockTooltipController.getInstance().showLockTooltip,
        }
    }

    public componentDidMount(): void {
        this.subscriptions.push(
            DimensionCollectionEventsController.getInstance()
                .subscribe(() => {
                    this.setState(this.fetchDimensionLockState);
                })
        );

        this.subscriptions.push(
            DimensionEventsController.getInstance()
                .subscribeAll(() => {
                    this.setState(this.fetchDimensionLockState);
                })
        );

        this.subscriptions.push(
            DimensionToolbuttonLockTooltipController.getInstance()
                .subscribe(() => {
                    this.setState(this.fetchDimensionLockTooltipState);
                })
        );
    }

    public componentWillUnmount(): void {
        this.subscriptions.forEach(
            subscription => subscription.unsubscribe());
        this.subscriptions = [];
    }

    public render(): React.ReactNode {
        const id = `${this.props.id}-icon`;
        const activeClass = this.isActive ? 'active-js' : '';

        return (
            <button id={this.props.id}
                    disabled={this.isDisabled}
                    title={this.tooltip}
                    onClick={() => this.onClick()}
                    className={`${activeClass} toolbar-button`}>
                <span id={id} className="toolbar-icon">
                </span>
                <span className="toolbar-text">
                    {this.props.title}
                    {this.state.showLockIcon &&
                        <span className="lock-icon"/>
                    }
                </span>
                {this.state.showLockTooltip &&
                    <div className="dimension-tooltip">
                        The dimensions are locked, please unlock before moving/reszing.
                    </div>
                }
            </button>
        );
    }
}