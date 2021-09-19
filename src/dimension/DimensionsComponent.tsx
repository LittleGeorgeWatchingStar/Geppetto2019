import * as React from "react";
import {Dimension} from "./Dimension";
import {DimensionComponent} from "./DimensionComponent";
import {Workspace} from "../workspace/Workspace";
import {Board} from "../model/Board";
import {Subscription} from "rxjs";
import {BoardEventsController} from "../model/BoardEventsController";
import {WorkspaceEventsController} from "../workspace/WorkspaceEventsController";

interface DimensionsComponentProps {
    workspace: Workspace;
    board: Board;
    dimensions: Dimension[];
}

interface DimensionsComponentState {
    workspaceIsDimensioning: boolean;
    workspaceScale: number;

    boardWidth: number;
    boardHeight: number;
}

export class DimensionsComponent
    extends React.Component<DimensionsComponentProps, DimensionsComponentState> {

    private subscriptions: Subscription[] = [];

    constructor(props: DimensionsComponentProps) {
        super(props);
        this.state = {
            ...this.fetchWorkspaceState(),
            ...this.fetchBoardState(),
        };
    }

    private fetchWorkspaceState(): Pick<DimensionsComponentState, 'workspaceIsDimensioning' | 'workspaceScale'> {
        return {
            workspaceIsDimensioning: this.props.workspace.isDimensioning(),
            workspaceScale: this.props.workspace.scale,
        };
    }

    private fetchBoardState(): Pick<DimensionsComponentState, 'boardWidth' | 'boardHeight'> {
        return {
            boardWidth: this.props.board.width,
            boardHeight: this.props.board.height,
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
            BoardEventsController.getInstance()
                .subscribe(() => {
                    this.setState(this.fetchBoardState);
                })
        );
    }

    public componentWillUnmount(): void {
        this.subscriptions.forEach(
            subscription => subscription.unsubscribe());
        this.subscriptions = [];
    }

    public render(): React.ReactNode {
        const dimensionComponents = [];
        let horLevel = 0;
        let verLevel = 0;
        this.props.dimensions.forEach(dimension => {
           if (dimension.isEdgeConstraint()) {
               return;
           }
           dimensionComponents.push(<DimensionComponent key={dimension.uuid}
                                                        workspaceIsDimensioning={this.state.workspaceIsDimensioning}
                                                        workspaceScale={this.state.workspaceScale}
                                                        boardWidth={this.state.boardWidth}
                                                        boardHeight={this.state.boardHeight}
                                                        level={dimension.isAnchorHorizontal() ? horLevel : verLevel}
                                                        dimension={dimension}/>);
           dimension.isAnchorHorizontal() ? horLevel++ : verLevel++;
        });

        return (dimensionComponents);
    }
}