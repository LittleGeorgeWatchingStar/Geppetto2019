import * as React from "react";
import events from "../../utils/events";
import {HELP, REFOCUS} from "../events";
import {WorkingAreaToolbutton, WorkingAreaToolbuttonDirection} from "./WorkingAreaToolbutton";
import {Workspace} from "../../workspace/Workspace";
import {ActionLogs, actions} from "../../core/action";
import {ACTION_HISTORY, THREED_VIEW_BOARD} from "../../view/events";
import userController from "../../auth/UserController";
import {FeatureFlag} from "../../auth/FeatureFlag";
import {UserManualTab} from "../../help/UserManual";

export function getWorkingAreaToolbuttons(workspace: Workspace, actionLogs: ActionLogs): React.ReactComponentElement<typeof WorkingAreaToolbutton>[][] {
    const user = userController.getUser();
    const isWorkspaceThreeDModeShow = user.isFeatureEnabled(FeatureFlag.WORKSPACE_MODE_THREED);
    if (isWorkspaceThreeDModeShow) {
        return [
            [
                refocus()
            ],
            [
                zoomIn(workspace),
                zoomOut(workspace)
            ],
            [
                undo(actionLogs),
                actionLog(),
                redo(actionLogs),
            ],
            [
                threeDRender(),
            ],
            [
                help(),
            ]
        ];
    }

    return [
        [
            refocus()
        ],
        [
            zoomIn(workspace),
            zoomOut(workspace)
        ],
        [
            undo(actionLogs),
            actionLog(),
            redo(actionLogs),
        ],
        [
            help(),
        ]
    ];
}

function refocus(): React.ReactComponentElement<typeof WorkingAreaToolbutton> {
    return <WorkingAreaToolbutton
        id={'refocus'}
        onClick={() => events.publish(REFOCUS)}
        tooltip={'Recenter the workspace on the current design.'}
    />;
}

function zoomIn(workspace: Workspace): React.ReactComponentElement<typeof WorkingAreaToolbutton> {
    const checkError = () => {
        if (workspace.canZoomIn()) {
            return null;
        }
        return "Reached maximum zoom level.";
    };

    return <WorkingAreaToolbutton
        id={'zoom-in'}
        onClick={() => workspace.zoomInOnce()}
        tooltip={'Zoom in the workspace on the current design.'}
        buttonPosition={WorkingAreaToolbuttonDirection.left}
        error={checkError()}
    />;
}

function zoomOut(workspace: Workspace): React.ReactComponentElement<typeof WorkingAreaToolbutton> {
    const checkError = () => {
        if (workspace.canZoomOut()) {
            return null;
        }
        return "Reached minimum zoom level.";
    };

    return <WorkingAreaToolbutton
        id={'zoom-out'}
        onClick={() => workspace.zoomOutOnce()}
        tooltip={'Zoom out the workspace on the current design.'}
        buttonPosition={WorkingAreaToolbuttonDirection.right}
        error={checkError()}
    />;
}

function help(): React.ReactComponentElement<typeof WorkingAreaToolbutton> {
    return <WorkingAreaToolbutton
        id={'help'}
        onClick={() => events.publish(HELP, {selection: UserManualTab.HOME})}
        tooltip={'Display a comprehensive guide on how to use Geppetto.'}
    />;
}

function undo(actionLogs: ActionLogs): React.ReactComponentElement<typeof WorkingAreaToolbutton> {
    const checkError = () => {
        if (actionLogs.undo.length > 0) {
            return null;
        }
        return "No change has been made";
    }

    return <WorkingAreaToolbutton id={'undo'}
                                  onClick={() => actions.undo()}
                                  tooltip={'Undo the last action (ctrl + z)'}
                                  buttonPosition={WorkingAreaToolbuttonDirection.left}
                                  error={checkError()}/>;
}

function actionLog(): React.ReactComponentElement<typeof WorkingAreaToolbutton> {
    return <WorkingAreaToolbutton id={'action-log'}
                                  onClick={() => events.publish(ACTION_HISTORY)}
                                  tooltip={'Open the action history'}
                                  buttonPosition={WorkingAreaToolbuttonDirection.center}
                                  isToggleButton={true}/>;
}

function redo(actionLogs: ActionLogs): React.ReactComponentElement<typeof WorkingAreaToolbutton> {
    const checkError = () => {
        if (actionLogs.redo.length > 0) {
            return null;
        }
        return "No reverse change available";
    }

    return <WorkingAreaToolbutton id={'redo'}
                                  onClick={() => actions.redo()}
                                  tooltip={'Reverse the undo change (ctrl + shift + z)'}
                                  buttonPosition={WorkingAreaToolbuttonDirection.right}
                                  error={checkError()}/>;
}

function threeDRender(): React.ReactComponentElement<typeof WorkingAreaToolbutton> {
    return <WorkingAreaToolbutton id={'threed-render'}
                                  onClick={() => events.publish(THREED_VIEW_BOARD)}
                                  tooltip={'Active 3D Board Viewing'}
                                  isToggleButton={true}/>;
}