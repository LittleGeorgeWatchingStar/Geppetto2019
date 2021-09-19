import * as React from "react";
import {PlacedModule} from "../../placedmodule/PlacedModule";
import {DesignRevision} from "../DesignRevision";
import {PlacedItem} from "../../placeditem/PlacedItem";
import {
    DesignErrorChecker,
    DesignErrorLog,
    PathErrors,
    PlacedItemErrors
} from "./DesignErrorChecker";
import {Analytics} from "../../marketing/Analytics";
import User from "../../auth/User";
import {LoginController} from "../../controller/Login";
import {DesignController} from "../DesignController";
import {ConnectionPath} from "../../connection/ConnectionPath";
import {ModuleRecommendationResource} from "./DesignRecommendationsGateway";
import {Workspace} from "../../workspace/Workspace";
import {DesignSuggestions} from "./DesignSuggestions";
import {Module} from "../../module/Module";
import {Board} from "../../model/Board";


export enum HelperTabs {
    HELPER = 'Helper',
    MODULE_LIST = 'ModuleList'
}

interface DesignHelperProps {
    moduleRecommendations: ModuleRecommendationResource[];
    design: DesignRevision;
    currentUser: User;
    workspace: Workspace;
    libraryModules: Module[];
    board: Board;
}

interface DesignHelperState {
    isOpen: boolean;
}

/**
 * A widget that tells the user:
 * 1) What needs to be done before the design is all green (ready to be submitted).
 * 2) The list of modules used in their current design.
 */
export class DesignHelper extends React.Component<DesignHelperProps, DesignHelperState> {

    constructor(props: DesignHelperProps) {
        super(props);
        this.state = {
            isOpen: true,
        }
        this.onClickOrder = this.onClickOrder.bind(this);
    }

    render(): JSX.Element {

        const errors = new DesignErrorChecker(this.props.design).generate();
        Analytics.designHelper.tabChanged(HelperTabs.HELPER);
        return (
            <>
                {!this.state.isOpen &&
                <button onClick={() => this.setOpen(true)}
                        className="design-helper-open-button workspace-widget-button"
                        title="Open design helper">
                    {this.getHelperTabButtonIcon(errors.numErrors)}
                </button>}
                {this.state.isOpen &&
                <div className="design-helper workspace-widget">
                    <div className="header">
                        <span>Design Helper {this.getHelperTabButtonIcon(errors.numErrors)} </span>
                        <button onClick={() => this.setOpen(false)}
                                className="widget-close-button"
                                title="Hide design helper">
                        </button>
                    </div>
                    <div className='container'>
                        {this.getTabs(errors)}
                    </div>
                </div>}
            </>
        );
    }

    private getTabs(errors: DesignErrorChecker): JSX.Element | null {
        const functionalComponents = this.props.design.getPlacedModules().filter(pm => pm.getRequires().length);
        if (!functionalComponents.length) {
            return <div className="empty-message">
                Your board doesn't have any functional components yet.
                <br/>
                <b className="suggestion"
                   onMouseOver={indicateLibraryModules}
                   onMouseOut={stopIndicatingLibraryModules}
                   title="Drag and drop a module from the right-hand library"> Try adding one.</b>
            </div>;
        }
        const componentOffBoard = this.props.design.getPlacedModules().filter(pm => this.props.board.isOutOfBounds(pm)).length > 0;
        const componentOverlapping = this.props.design.getPlacedModules().filter(pm => pm.overlaps()).length > 0;
        return (
            <div className="design-helper__list-containers">
                <div className="design-helper-board-status">
                    <h5>Board Status:</h5>
                    {componentOffBoard &&
                    <p className="design-helper-board-status-unready"><span></span> Module out of boundary.</p>}
                    {componentOverlapping && !componentOffBoard &&
                    <p className="design-helper-board-status-unready"><span></span> Modules overlapping.</p>}
                    {this.props.board.isConnected() && !componentOffBoard && !componentOverlapping &&
                    <p className="design-helper-board-status-connected"><span></span> Ready to order.</p>}
                    {this.props.board.isReady() && !this.props.board.isConnected() && !componentOffBoard && !componentOverlapping &&
                    <p className="design-helper-board-status-ready"><span></span> Connections reqired.</p>}
                    {!this.props.board.isConnected() && !this.props.board.isReady() && !componentOffBoard && !componentOverlapping &&
                    <p className="design-helper-board-status-unready"><span></span> Missing compatible module.</p>}
                </div>
                <div className="design-helper__error-list-container list-container">
                    {this.getHelperView(errors)}
                </div>
            </div>
        );
    }

    private getHelperTabButtonIcon(numErrors: number): JSX.Element | null {
        if (this.props.design.getPlacedModules().length === 0) {
            return null;
        }
        return numErrors ? <span className="error-count">{numErrors}</span> : <span className="complete"/>
    }

    private getHelperView(errors: DesignErrorChecker): JSX.Element {
        if (errors.numErrors === 0) {
            return this.validDesignSuggestions;
        }
        return (
            <ul className="design-helper__error-list">
                {this.getPlacedModuleErrors(errors).concat(
                    this.getLogoErrors(errors),
                    this.getPathErrors(errors))}
            </ul>
        );
    }

    private get validDesignSuggestions(): JSX.Element {
        const isLoggedIn = this.props.currentUser.isLoggedIn();
        return (
            <div className="design-helper-valid-design-suggestions">Your design looks good to go!
                {!isLoggedIn &&
                <span> To save your progress, please
                    <b className="cta-link"
                       onClick={() => LoginController.getInstance().login()}> log in</b> first.</span>}
                {isLoggedIn && !this.props.design.isPushed() &&
                    <button className="order-button"
                            onClick={this.onClickOrder}>Order</button>}
                <DesignSuggestions design={this.props.design}
                                   moduleRecommendations={this.props.moduleRecommendations}
                                   workspace={this.props.workspace}
                                   libraryModules={this.props.libraryModules}/>
            </div>
        );
    }

    private onClickOrder(): void {
        DesignController.validate();
        Analytics.designHelper.clickValidate();
    }

    private getPlacedModuleErrors(errors: DesignErrorChecker): JSX.Element[] {
        return errors.moduleErrorCodes.map(log => {
            const pm = log.item as PlacedModule;
            const code = log.errorCode as PlacedItemErrors;
            return (
                <li key={pm.uuid}>
                    <div onClick={() => this.onClick(pm)}
                         onMouseOver={() => toggleBlink(pm, true)}
                         onMouseOut={() => toggleBlink(pm, false)}>
                        <b className="module-name">{pm.name}</b> {this.getPMErrorMessage(pm, code)}
                    </div>
                </li>
            );
        });
    }

    private getPathErrors(errors: DesignErrorChecker): JSX.Element[] {
        return errors.pathErrorCodes.map((log, i) => {
            const connection = (log.item as ConnectionPath).connection;
            const message = this.getPathErrorMessage(log);
            return (
                <li key={i}
                    onMouseOver={() => {
                        toggleBlink(connection.provider, true);
                        toggleBlink(connection.requirer, true);
                    }}
                    onMouseOut={() => {
                        toggleBlink(connection.provider, false);
                        toggleBlink(connection.requirer, false);
                    }}>{message}</li>
            );
        });
    }

    private getPathErrorMessage(log: DesignErrorLog): JSX.Element {
        const connection = (log.item as ConnectionPath).connection;
        const from = connection.providerName;
        const to = connection.requirerName;
        switch (log.errorCode) {
            case PathErrors.COLLISION:
                return <span>The path from <b>{from}</b> to <b>{to}</b> is obstructed</span>;
            case PathErrors.DISTANCE:
                return <span>The distance between <b>{from}</b> and <b>{to}</b> is too long</span>;
        }
    }

    private getLogoErrors(errors: DesignErrorChecker): JSX.Element[] {
        return errors.logoErrorCodes.map(log => {
            const code = log.errorCode as PlacedItemErrors;
            const logo = log.item as PlacedItem;
            return <li key={logo.uuid}
                       onClick={() => this.onClick(logo)}
                       onMouseOver={() => toggleBlink(logo, true)}
                       onMouseOut={() => toggleBlink(logo, false)}>
                <span className="module-name">SVG image</span> {this.getErrorMessage(code)}
            </li>
        });
    }

    private getPMErrorMessage(pm: PlacedModule, errorCode: PlacedItemErrors): string {
        if (errorCode === PlacedItemErrors.UNCONNECTED) {
            const reqsNeeded = pm.getRequires().filter(r => !r.isConnected() && !r.implementsVlogicTemplate());
            if (reqsNeeded.length >= 3) {
                return `needs connections`;
            }
            return `needs a connection for ${reqsNeeded.map(r => r.name).join(', ')}`;
        }
        return this.getErrorMessage(errorCode);
    }

    /**
     * @return a message for PlacedItem error codes.
     */
    private getErrorMessage(errorCode: PlacedItemErrors): string {
        switch (errorCode) {
            case PlacedItemErrors.NONE:
                return '';
            case PlacedItemErrors.OFF_BOARD:
                return `is off the board's edge`;
            case PlacedItemErrors.COLLISION:
                return `is overlapping another block`;
        }
    }

    private onClick(item: PlacedItem): void {
        Analytics.designHelper.listItemClick(HelperTabs.HELPER);
        this.props.design.selectPlacedItem(item);
        this.setState({}); // Rerender
    }

    private setOpen(isOpen: boolean): void {
        this.setState({
            isOpen: isOpen
        });
    }
}

/**
 * TODO gross! These methods indicate the associated view.
 */
export function toggleBlink(item: PlacedItem, isActive: boolean) {
    $(`[uid='${item.cid}'] .svg-container`).toggleClass('fast-blink', isActive);
}

function indicateLibraryModules(): void {
    $('.module-tile').addClass('fast-blink');
}

function stopIndicatingLibraryModules(): void {
    $('.module-tile').removeClass('fast-blink');
}
