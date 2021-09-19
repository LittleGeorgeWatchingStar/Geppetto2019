import * as React from "react";
import {RefObject} from "react";
import {Workspace} from "../../workspace/Workspace";
import {Anchor} from "./Anchor";
import {DimensionController, DimensionDirection} from "../DimensionController";
import {Point} from "../../utils/geometry";
import {AnchorExtension} from "./AnchorExtension/AnchorExtension";
import {AnchorExtensionsController} from "./AnchorExtension/AnchorExtensionsController";
import {Subscription} from "rxjs";
import {AnchorEventsController} from "./AnchorEventsController";
import {WorkspaceEventsController} from "../../workspace/WorkspaceEventsController";

interface AnchorComponentProps {
    workspace: Workspace;
    anchor: Anchor;
}

interface AnchorComponentState {
    workspaceIsDimensioning: boolean;

    dimensioningDirection: DimensionDirection;

    anchorDirection: DimensionDirection;
    anchorPoint1: Point;
    anchorPoint2: Point;
}

export class AnchorComponent
    extends React.Component<AnchorComponentProps, AnchorComponentState> {

    private subscriptions: Subscription[] = [];

    private extension: AnchorExtension | null = null;

    private readonly el: RefObject<SVGGElement>;

    constructor(props: AnchorComponentProps) {
        super(props);
        this.el = React.createRef<SVGGElement>();
        this.state = {
            ...this.fetchWorkspaceState(),
            ...this.fetchDimensionControllerState(),
            ...this.fetchAnchorState(),
        }
    }

    public componentDidMount(): void {
        this.subscriptions.push(
            WorkspaceEventsController.getInstance()
                .subscribe(() => {
                    this.setState(this.fetchWorkspaceState);
                })
        );

        this.subscriptions.push(
            DimensionController.getInstance()
                .subscribe(() => {
                    this.setState(this.fetchDimensionControllerState);
                })
        );

        this.subscriptions.push(
            AnchorEventsController.getInstance()
                .subscribe(this.props.anchor, () => {
                    this.setState(this.fetchAnchorState);
                })
        );

        /**
         * Stop it from clicking the Dimensionable as well.
         *
         * NOTE: Use native onClick because react onClick is only one onClick
         *  event globally, so it doesn't play nicely with native onclick events
         *  sometimes. Dimensionable onClick event is native, and stopPropagation
         *  to it would prevent react's onClick.
         *
         * TODO: Change back to react onClick once all onClick are converted
         *  to react.
         */
        if (this.el.current) {
            this.el.current.onclick = (event: MouseEvent) => {
                event.stopImmediatePropagation();
                this.onClick();
            };
        }
    }

    private fetchWorkspaceState(): Pick<AnchorComponentState, 'workspaceIsDimensioning'> {
        return {
            workspaceIsDimensioning: this.props.workspace.isDimensioning(),
        };
    }

    private fetchDimensionControllerState(): Pick<AnchorComponentState, 'dimensioningDirection'> {
        return {
            dimensioningDirection: DimensionController.getInstance().dimensionDirection,
        };
    }

    private fetchAnchorState(): Pick<AnchorComponentState, 'anchorDirection' | 'anchorPoint1' | 'anchorPoint2'> {
        return {
            anchorDirection: this.props.anchor.direction,
            anchorPoint1: this.props.anchor.point1,
            anchorPoint2: this.props.anchor.point2,
        };
    }

    public componentWillUnmount(): void {
        this.subscriptions.forEach(
            subscription => subscription.unsubscribe());
        this.subscriptions = [];

        if (this.extension) {
            AnchorExtensionsController.getInstance().removeExtension(this.extension);
        }
    }

    private onClick(): void {
        if (!this.props.anchor.direction) {
            return
        }

        DimensionController.getInstance().onClickDimensionAnchor(this.props.anchor);
    }

    private onMouseOver(): void {
        if (this.extension === null) {
            this.extension = AnchorExtensionsController.getInstance().addExtension(this.props.anchor);
        }
    }

    private onMouseLeave(): void {
        if (this.extension) {
            AnchorExtensionsController.getInstance().removeExtension(this.extension);
            this.extension = null;
        }
    }

    public render(): React.ReactNode {
        const isVisible = this.state.workspaceIsDimensioning &&
            (
                this.state.dimensioningDirection === this.state.anchorDirection ||
                this.state.dimensioningDirection === DimensionDirection.NONE
            );

        return (
            <g className="anchor"
               ref={this.el}
               style={{
                   display: isVisible ? 'block' : 'none',
               }}
               // onClick={() => this.onClick()}
               onMouseOver={() => this.onMouseOver()}
               onMouseOut={() => this.onMouseLeave()}>
                <line className="line"
                      x1={this.state.anchorPoint1.x}
                      y1={this.state.anchorPoint1.y}
                      x2={this.state.anchorPoint2.x}
                      y2={this.state.anchorPoint2.y}/>
                <line className="click-helper"
                      x1={this.state.anchorPoint1.x}
                      y1={this.state.anchorPoint1.y}
                      x2={this.state.anchorPoint2.x}
                      y2={this.state.anchorPoint2.y}/>
            </g>
        );
    }
}