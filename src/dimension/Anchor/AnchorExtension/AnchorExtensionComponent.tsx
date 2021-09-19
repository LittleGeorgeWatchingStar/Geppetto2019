import * as React from "react";
import {Anchor} from "../Anchor";
import {Workspace} from "../../../workspace/Workspace";
import * as $ from "jquery";
import {DimensionDirection} from "../../DimensionController";
import {Subscription} from "rxjs";
import {AnchorEventsController} from "../AnchorEventsController";
import {DimensionableEventsController} from "../../DimensionableEventsController";
import {WorkspaceEventsController} from "../../../workspace/WorkspaceEventsController";


interface AnchorExtensionComponentProps {
    workspace: Workspace;
    anchor: Anchor;
}

interface AnchorExtensionComponentState {
    workspaceScale: number;

    anchorDirection: DimensionDirection;
    anchorX: number | undefined;
    anchorY: number | undefined;

    dimensionableBoardX: number;
    dimensionableBoardY: number;
}

export class AnchorExtensionComponent
    extends React.Component<AnchorExtensionComponentProps, AnchorExtensionComponentState> {

    private subscriptions: Subscription[] = [];

    constructor(props: AnchorExtensionComponentProps) {
        super(props);
        this.state = {
            ...this.fetchWorkspaceState(),
            ...this.fetchAnchorState(),
            ...this.fetchDimensionableState(),
        };
    }

    private fetchWorkspaceState(): Pick<AnchorExtensionComponentState, 'workspaceScale'> {
        return {
            workspaceScale: this.props.workspace.scale,
        };
    }

    private fetchAnchorState(): Pick<AnchorExtensionComponentState, 'anchorDirection' | 'anchorX' | 'anchorY'> {
        return {
            anchorDirection: this.props.anchor.direction,
            // Could use anchor.boardX or anchor.boardY instead, but the
            // dimensionable change subscription would be less clear.
            anchorX: this.props.anchor.direction === DimensionDirection.VERTICAL ? this.props.anchor.x : undefined,
            anchorY: this.props.anchor.direction === DimensionDirection.HORIZONTAL ? this.props.anchor.y : undefined,
        };
    }

    private fetchDimensionableState(): Pick<AnchorExtensionComponentState, 'dimensionableBoardX' | 'dimensionableBoardY'> {
        return {
            dimensionableBoardX: this.props.anchor.dimensionable.boardPosition.x,
            dimensionableBoardY: this.props.anchor.dimensionable.boardPosition.y,
        };
    }

    public componentDidMount(): void {
        this.subscriptions.push(
            WorkspaceEventsController.getInstance()
                .subscribe(() => {
                    this.setState(this.fetchWorkspaceState);
                })
        );

        this.subscriptions.push(
            AnchorEventsController.getInstance()
                .subscribe(this.props.anchor, () => {
                    this.setState(this.fetchAnchorState);
                })
        );

        this.subscriptions.push(
            DimensionableEventsController.getInstance()
                .subscribe(this.props.anchor.dimensionable, () => {
                    this.setState(this.fetchDimensionableState);
                })
        );
    }

    public componentWillUnmount(): void {
        this.subscriptions.forEach(
            subscription => subscription.unsubscribe());
        this.subscriptions = [];
    }

    public render(): React.ReactNode {
        // TODO: Don't use JQuery, get the position another way.
        const $board = $('#board');
        const board_top = $board.position().top;
        const board_height = $board.height();

        const style = {};
        switch (this.state.anchorDirection) {
            case DimensionDirection.HORIZONTAL:
                style['top'] = board_top + board_height - ((this.state.dimensionableBoardY + this.state.anchorY) * this.state.workspaceScale);
                break;
            case DimensionDirection.VERTICAL:
                style['left'] = $board.position().left + ((this.state.dimensionableBoardX + this.state.anchorX) * this.state.workspaceScale);
                break;
        }

        return (
            <div className={'extension-line ' + this.state.anchorDirection}
                 style={style}/>
        );
    }
}