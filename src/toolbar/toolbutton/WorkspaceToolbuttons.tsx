import {AUTODOC, DEVICE_TREE, LOAD_DESIGN_DIALOG, PREVIEW3D, START_UPREV,} from "../events";
import events from "../../utils/events";
import userController from "../../auth/UserController";
import * as _ from "underscore";
import * as Backbone from "backbone";
import {DesignController} from "../../design/DesignController";
import {DesignSharingOptions, openShareDialog} from "../../design/sharing/view/DesignShareDialog";
import {Workspace} from "../../workspace/Workspace";
import {Toolbutton} from "./ToolButton";
import {powerFinderDialog} from "../WorkspaceWidgets";
import {openProductWindow} from "../../design/ProductDialog";
import {BoardBuilderDialogController} from "../../design/boardbuilder/BoardBuilderDialogController";
import * as React from "react";
import {CompiledCadToolbutton} from "./CompiledCadToolbutton";
import {openDownloadCadDialog} from "../../compiledcadsource/DownloadCadDialog";
import {OrderToolbutton} from "./OrderToolbutton";
import {DimensionToolbutton} from "./DimensionToolbutton";
import {BACK_TO_DASHBOARD} from "../../workspace/events";
import {FeatureFlag} from "../../auth/FeatureFlag";
import {openAutodocDialog} from "./dialog/AutodocDialog";
import {openAutoBspDialog} from "./dialog/AutoBspDialog";
import {LibraryController} from "../../module/LibraryController";
import {ThemeController} from "../../controller/ThemeController";


/**
 * @return Workspace toolbar buttons grouped in the order shown.
 */
export function getWorkspaceToolbuttons(workspace: Workspace): React.ReactComponentElement<typeof Toolbutton>[][] {
    const user = userController.getUser();
    const isNewWorkspaceModeShow = user.isFeatureEnabled(FeatureFlag.WORKSPACE_MODE);
    if (!isNewWorkspaceModeShow) {
        return [
            [
                dashboard(),
                builder(() => BoardBuilderDialogController.getInstance().openBoardBuilderDialog()),
                newDesign(),
                openDesign(),
                save(),
                saveAs(),
                share(),
            ],
            [
                connectionMode(workspace),
                dimensionMode(workspace),
            ],
            [
                powerFinder(),
                view3D(),
                autodoc(),
                autoBsp(workspace),
            ],
            [
                downloadCad(),
                uprev(),
            ],
            [
                order(workspace),
                product(),
            ]
        ];
    }
    return [
        [
            dashboard(),
            builder(() => BoardBuilderDialogController.getInstance().openBoardBuilderDialog()),
            newDesign(),
            openDesign(),
            save(),
            saveAs(),
            share(),
        ],
        [
            powerFinder(),
            view3D(),
            autodoc(),
            autoBsp(workspace),
        ],
        [
            downloadCad(),
            uprev(),
        ],
        [
            order(workspace),
            product(),
        ]
    ];
}

export function checkLogin(): string | null {
    const user = userController.getUser();

    if (!user || !user.isLoggedIn()) {
        return 'To enable this, please login.';
    }
    return null;
}

function newDesign(): React.ReactComponentElement<typeof Toolbutton> {
    return <Toolbutton
        id={'new'}
        title={'New'}
        onClick={() => Backbone.history.navigate(`#!/new`, {trigger: true})}
        tooltip={'Start a new design.'}
    />;
}

/**
 * TODO: Disable when loading designs
 *  (eg. on opening geppetto on the workspace while logged in,
 *  logging in while on the workspace)
 */
function openDesign(): React.ReactComponentElement<typeof Toolbutton> {
    return <Toolbutton
        id={'load'}
        title={'Open'}
        onClick={() => events.publish(LOAD_DESIGN_DIALOG)}
        tooltip={'Open a previously saved design.'}
        error={checkLogin()}
    />;
}

function save(): React.ReactComponentElement<typeof Toolbutton> {
    const checkError = () => {
        if (DesignController.isSaving()) {
            return "Already saving design, please wait.";
        }
        if (!DesignController.isDesignUnsaved()) {
            return "There are no unsaved changes.";
        }
    };

    return <Toolbutton
        id={'save'}
        title={'Save'}
        onClick={DesignController.save}
        tooltip={'Save your currently opened design.'}
        error={checkError()}
    />
}

function saveAs(): React.ReactComponentElement<typeof Toolbutton> {
    return <Toolbutton
        id={'save_as'}
        title={'Save As'}
        onClick={DesignController.saveAs}
        tooltip={'Save the current design as a new design.'}
        error={checkSaving() || checkLogin()}
    />;
}

function share(): React.ReactComponentElement<typeof Toolbutton> {
    return <Toolbutton
        id={'design-share'}
        title={'Share'}
        onClick={() => {
            const design = DesignController.getCurrentDesign();
            openShareDialog({
                designId: design.getDesignId(),
                designTitle: design.getDesignTitle(),
                designDescription: design.getDescription()
            } as DesignSharingOptions);
        }}
        error={checkSaved() || checkShareable()}
    />;
}

function builder(openBuilderDialog: () => void): React.ReactComponentElement<typeof Toolbutton> {
    return <Toolbutton
        id={'boardbuilder'}
        title={'Builder'}
        onClick={() => openBuilderDialog()}
        tooltip={'Quickly and easily add modules to the board.'}
    />;
}

function connectionMode(workspace: Workspace): React.ReactComponentElement<typeof Toolbutton> {
    return <Toolbutton
        id={'connect'}
        title={'Connect'}
        onClick={() => workspace.toggleConnecting()}
        tooltip={'Enable connections mode to establish required connections between modules.'}
        checkActive={workspace.isConnecting()}
    />;
}

function dimensionMode(workspace: Workspace): React.ReactComponentElement<typeof Toolbutton> {
    return <DimensionToolbutton
        id={'dimension'}
        title={'Dimension'}
        onClick={() => workspace.toggleDimensioning()}
        tooltip={'Enable dimension mode to precisely control the board size and spacing between modules.'}
        checkActive={workspace.isDimensioning()}
    />;
}

function view3D(): React.ReactComponentElement<typeof Toolbutton> {
    return <Toolbutton
        id={'view3D'}
        title={'3D View'}
        onClick={_.debounce(() => events.publish(PREVIEW3D), 500, true)}
        tooltip={'Display a 3D rendering of the current design and download a .stl file.'}
    />;
}

function powerFinder(): React.ReactComponentElement<typeof Toolbutton> {
    const checkError = () => {
        const libraryLoaded = LibraryController.getLibrary().models;
        if (libraryLoaded.length === 0) return 'Please wait, module library is loading.';
        return null;
    }

    return <Toolbutton
        id={'powerfinder'}
        title={'Find Power'}
        onClick={() => powerFinderDialog(false)}
        tooltip={'Recommended power sources for your modules.'}
        error={checkError()}
    />;
}

function downloadCad(): React.ReactComponentElement<typeof Toolbutton> {
    const checkError = () => {
        const design = DesignController.getCurrentDesign();
        if (design && design.emptyOnLastSave()) {
            if (design.getPlacedModules().length > 0) {
                return 'Please save your design first.';
            }
            return 'Unavailable to compile empty design.';
        }
        if (design && !design.isNew()) {
            return null;
        }
        return 'Please save your design first.';
    };

    return <CompiledCadToolbutton
        id={'download-cad'}
        title={'Download CAD'}
        onClick={() => openDownloadCadDialog()}
        tooltip={'Download CAD data for the design.'}
        error={checkError()}
    />;
}

function uprev(): React.ReactComponentElement<typeof Toolbutton> {
    const checkError = () => {
        const design = DesignController.getCurrentDesign();
        if (design && design.isPushed()) {
            return null;
        }
        return 'This design is not yet validated.';
    };

    return <Toolbutton
        id={'uprev'}
        title={'UpRev'}
        onClick={() => events.publish(START_UPREV)}
        isVisible={isEngineer()}
        tooltip={'Uprev the current design.'}
        error={checkError()}
    />;
}

function autodoc(): React.ReactComponentElement<typeof Toolbutton> {
    const onClick = () => {
        const design = DesignController.getCurrentDesign();
        if (design && !design.isNew() && design.isDirty()) {
            return openAutodocDialog(isValidated());
        }
        events.publishEvent(AUTODOC, {
            design_revision_id: design.getId(),
        });
    };

    const checkError = () => {
        const design = DesignController.getCurrentDesign();
        if (design && !design.isNew()) {
            return null;
        }
        return 'Please save your design first.';
    };

    return <Toolbutton
        id={'autodoc'}
        title={'AutoDoc'}
        onClick={onClick}
        tooltip={'Download PDF file containing everything you and your colleagues need to know about your board.'}
        error={checkError()}
    />;
}

function autoBsp(workspace: Workspace): React.ReactComponentElement<typeof Toolbutton> {
    const onClick = () => {
        const design = DesignController.getCurrentDesign();
        if (design && !design.isNew() && design.isDirty()) {
            return openAutoBspDialog(isValidated());
        }
        events.publishEvent(DEVICE_TREE, {
            design_revision_id: design.getId(),
        });
    };

    const checkError = () => {
        const design = DesignController.getCurrentDesign();
        if (design && !design.isNew()) {
            return null;
        }
        return 'Please Save your design first.';
    };

    return <Toolbutton
        id={'autobsp'}
        title={'AutoBSP'}
        onClick={onClick}
        tooltip={'Download board support package including instructions and device tree files.'}
        error={checkError()}
        isVisible={workspace.autoBsp}
    />;
}

export function order(workspace: Workspace): React.ReactComponentElement<typeof Toolbutton> {
    return <OrderToolbutton
        id={'order'}
        title={'Order'}
        onClick={DesignController.validate}
        tooltip={'Create a product page for your board, purchase it, and receive pre-tested boards in 15 business days.'}
        isVisible={workspace.storeFront && !isValidated()}
        error={(checkLogin()
            || nonEngineerGuard(
                () => (checkConnected() || checkPushable())
            )
        )}
    />;
}

function product(): React.ReactComponentElement<typeof Toolbutton> {
    return <Toolbutton
        id={'shop'}
        title={'Shop'}
        onClick={() => openProductWindow(DesignController.getCurrentDesign())}
        tooltip={'Purchase your board and/or related schematics and CAD files.'}
        isVisible={isValidated()}
    />;
}

function dashboard(): React.ReactComponentElement<typeof Toolbutton> {
    return <Toolbutton
        id={'dashboard'}
        title={'Dashboard'}
        onClick={() => {
            events.publish(BACK_TO_DASHBOARD);
        }}
        tooltip={'Back to the dashboard.'}
        theme={ThemeController.getInstance().THEME}
    />;
}

/**
 * End of toolbuttons.
 */

function checkSaved(): string | null {
    if (DesignController.isDesignUnsaved()) {
        return 'To enable this, please save your design first.';
    }
    return null;
}

function isEngineer(): boolean {
    const user = userController.getUser();
    if (user) {
        return user.isEngineer();
    }
    return false;
}

function nonEngineerGuard(guard: () => string | null): string | null {
    if (isEngineer()) {
        return null;
    }

    return guard();
}

function checkShareable(): string | null {
    if (isOwner()) {
        return null;
    }
    return 'Only the design owner can share the design.';
}

function checkPushable(): string | null {
    if (isOwner() || isEngineer()) {
        return null;
    }
    return 'Only the design owner can submit the design to the store.';
}

function isOwner(): boolean {
    const user = userController.getUser();
    const design = DesignController.getCurrentDesign();
    return design && design.isOwner(user);
}

function isValidated(): boolean {
    const design = DesignController.getCurrentDesign();
    return design && design.isPushed();
}

function checkConnected(): string | null {
    const design = DesignController.getCurrentDesign();
    if (design && design.connected()) {
        return null;
    }
    return 'To complete the current design, ensure all modules are connected, non-overlapping, and within the board.';
}

function checkSaving(): string | null {
    if (DesignController.isSaving()) {
        return "Already saving design, please wait."
    }
    return null;
}
