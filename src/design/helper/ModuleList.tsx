import * as React from "react";
import {DesignRevision} from "../DesignRevision";
import {DesignErrorChecker, PlacedItemErrors} from "./DesignErrorChecker";
import {PlacedModule} from "../../placedmodule/PlacedModule";
import {HelperTabs, toggleBlink} from "./DesignHelper";
import {Analytics} from "../../marketing/Analytics";
import {ModuleRecommendationResource} from "./DesignRecommendationsGateway";
import User from "../../auth/User";
import {Workspace} from "../../workspace/Workspace";
import {Module} from "../../module/Module";
import {PlacedItem} from "../../placeditem/PlacedItem";

interface ModuleListProps {
    moduleRecommendations: ModuleRecommendationResource[];
    design: DesignRevision;
    currentUser: User;
    workspace: Workspace;
    libraryModules: Module[];
}

interface ModuleListState {
    isOpen: boolean;
}

export class ModuleList extends React.Component<ModuleListProps, ModuleListState> {

    constructor(props: ModuleListProps) {
        super(props);
        this.state = {
            isOpen: false,
        }
    }

    render(): JSX.Element {
        const placedModules = this.props.design.getPlacedModules();
        const errors = new DesignErrorChecker(this.props.design).generate();
        Analytics.designHelper.tabChanged(HelperTabs.MODULE_LIST);

        return (
            <>
                {!this.state.isOpen &&
                <button onClick={() => this.setOpen(true)}
                        className="module-list-open-button workspace-widget-button"
                        title="Open module used list">
                    {this.getErrorModuleNumber() > 0 &&
                    <span>{this.getErrorModuleNumber()}</span>
                    }
                </button>}
                {this.state.isOpen &&
                <div className="module-list-widget workspace-widget">
                    <div className="header">
                        <span>Modules Used ({placedModules.length})</span>
                        <button onClick={() => this.setOpen(false)}
                                className="widget-close-button"
                                title="Hide module used list">
                        </button>
                    </div>
                    <div className="module-list__module-list-container container">
                        <ul>
                            {this.getListModuleItems(errors)}
                        </ul>
                    </div>
                </div>}
            </>
        );
    }

    private getListModuleItems(moduleErrors: DesignErrorChecker): JSX.Element[] {
        return moduleErrors.moduleCodes.map(log => {
            const code = log.errorCode as PlacedItemErrors;
            const pm = log.item as PlacedModule;
            // TODO: Add CSS class for the selected module. External selection doesn't update this properly yet.
            return (
                <li key={pm.uuid}
                    className={this.getErrorSelector(code)}
                    title={this.getPMErrorMessage(pm, code)}
                    onClick={() => this.onClick(pm)}
                    onMouseOver={() => toggleBlink(pm, true)}
                    onMouseOut={() => toggleBlink(pm, false)}>
                    <span className="module-name">
                        {pm.customName}
                    </span>
                </li>
            )
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

    private getErrorModuleNumber(): number {
        const errorModules = new DesignErrorChecker(this.props.design).generate().moduleCodes.filter(log => log.errorCode !== PlacedItemErrors.NONE);
        return errorModules.length ? errorModules.length : 0;
    }

    private onClick(item: PlacedItem): void {
        Analytics.designHelper.listItemClick(HelperTabs.MODULE_LIST);
        this.props.design.selectPlacedItem(item);
        this.setState({}); // Rerender
    }

    /**
     * @return A CSS selector based on the error code.
     */
    private getErrorSelector(errorCode: PlacedItemErrors): string {
        switch (errorCode) {
            case PlacedItemErrors.NONE:
                return '';
            case PlacedItemErrors.UNCONNECTED:
                return 'unconnected';
            case PlacedItemErrors.OFF_BOARD:
            case PlacedItemErrors.COLLISION:
                return 'collision';
        }
    }

    private setOpen(isOpen: boolean): void {
        this.setState({
            isOpen: isOpen
        });
    }
}