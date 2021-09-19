import * as React from "react";
import {ReactNode} from "react";
import * as Config from "Config";
import {LoginController} from "../../controller/Login";
import {Design} from "../../design/Design";
import {Library} from "../../module/Library";
import {DesignPreview} from "./DesignPreview";
import {UserContext} from "../../auth/UserContext";
import {Module} from "../../module/Module";
import {default as UserController} from "../../auth/UserController";
import {MECHANICAL} from "../../module/Category";
import {DesignPreviewFilter} from "../DesignPreviewFilter";
import {DashboardContent} from "./DashboardContent";
import {ThemeController} from "../../controller/ThemeController";
import {ServerID} from "../../model/types";


interface DesignPreviewsProps {
    library: Library;
    libraryLoading: boolean;

    url: string;
    pageTitle: string;
    designType: string;

    designs: Design[];
    isDesignsLoading: boolean;

    selectedModuleIds: Set<ServerID>;
    onClearSelectedModuleIds: () => void;
    onSelectModule: (module: Module) => void;
}

interface DesignPreviewsState {
    displayDesigns: Design[];
    searchInput: string;
}

export class DesignPreviews extends React.Component<DesignPreviewsProps, DesignPreviewsState> {
    static contextType = UserContext;
    context!: React.ContextType<typeof UserContext>;

    constructor(props: DesignPreviewsProps) {
        super(props);
        this.state = {
            searchInput: '',
            displayDesigns: this.getDisplayDesigns(
                props.designs,
                '',
                props.selectedModuleIds),
        };
    }

    componentWillReceiveProps(nextProps: Readonly<DesignPreviewsProps>) {
        if (nextProps.designType !== this.props.designType) {
            this.setState({
                searchInput: '',
                displayDesigns: this.getDisplayDesigns(
                    nextProps.designs,
                    '',
                    nextProps.selectedModuleIds),
            });
        } else {
            this.setState({
                displayDesigns: this.getDisplayDesigns(
                    nextProps.designs,
                    this.state.searchInput,
                    nextProps.selectedModuleIds),
            });
        }
    }

    render(): ReactNode {
        const designs = this.props.designs ? this.props.designs : [];
        const totalDesigns = this.state.displayDesigns ? this.state.displayDesigns.length : 0;

        return (
            <div className={this.props.designType + " tabview"} key={0}>
                <div className="tabview-header">
                    <div className="masthead">
                        <div className="tab-title">
                            <span className="title-prefix">
                                <img
                                    src={`${Config.STATIC_URL}/image/icons/${ThemeController.getInstance().GENERAL_LOGO}`}
                                    alt="Geppetto Logo"/>
                            </span>
                            {this.props.pageTitle}
                        </div>
                        {!this.props.isDesignsLoading && <>
                            <div className="count">
                                SHOWING <strong
                                className="showing">{totalDesigns}</strong> of <strong
                                className="total">{designs.length}</strong> DESIGNS
                            </div>
                            <div className="search-container">
                                <input type="search"
                                       placeholder="Search Designs..."
                                       value={this.state.searchInput}
                                       onChange={event => this.onChangeSearchInput(event.target.value)}
                                       disabled={this.props.isDesignsLoading}/>
                                {this.state.searchInput.length > 0 &&
                                <span className="reset-icon" onClick={() => this.onChangeSearchInput('')}/>}
                            </div>
                        </>}
                    </div>
                </div>
                <div className="tabview-body">
                    <div className={`shutter shutter-${ThemeController.getInstance().THEME} tab-shutter`}/>
                    {!this.props.libraryLoading &&
                    <div className="new-filter-container">
                        <DesignPreviewFilter
                            modules={this.filteredModules}
                            onClearSelectedModuleIds={() => this.props.onClearSelectedModuleIds()}
                            onSelectModule={(module) => this.props.onSelectModule(module)}
                            selectedModuleIds={this.props.selectedModuleIds}/>
                        <hr/>
                    </div>}
                    <div className={`design-container ${this.props.selectedModuleIds.size > 0 ? 'design-container-extra-padding' : ''}`}>
                        <div className="tabview-module-container info-container"/>
                        {this.props.isDesignsLoading ?
                            // TODO: Make loader look better.
                            <span>Loading...</span> :
                            <ul className="design-preview-list">
                                {this.getPreviews(this.state.displayDesigns)}
                            </ul>
                        }
                    </div>
                </div>
                {!this.context.isLoggedIn() &&
                (this.props.designType === DashboardContent.MY_DESIGNS || this.props.designType === DashboardContent.SHARED) &&
                this.loginRequired
                }
            </div>
        );
    }

    private get loginRequired(): JSX.Element {
        return (<div className="message-container logged-out">
            <div className="message-body">
                <h3>Please log in to view the designs</h3>
                <button
                    className="cta log-in"
                    onClick={() => LoginController.getInstance().login()}>
                    Log in
                </button>
            </div>
        </div>);
    }

    private getPreviews(designs: Design[]): JSX.Element[] {
        if (this.props.designType === DashboardContent.PARTNER) {
            return designs.map(design =>
                <DesignPreview
                    design={design}
                    url={this.props.url}
                    library={this.props.library}
                    key={design.id}
                    canOrder={true}/>);
        }
        return designs.map(design =>
            <DesignPreview
                design={design}
                url={this.props.url}
                library={this.props.library}
                key={design.id}/>);
    }

    /**
     * @result All modules used in this tab's designs, except
     * for Mechanical modules and board "module."
     */
    private get filteredModules(): Module[] {
        if (!this.props.library) return [];
        const designModuleIds = {};
        const filtered = [];
        if (this.props.designs) {
            for (const design of this.props.designs) {
                for (const moduleId of design.moduleIds) {
                    designModuleIds[moduleId] = designModuleIds[moduleId] ? designModuleIds[moduleId] + 1 : 1;
                }
            }
        }
        for (const module of this.props.library.filterVisibleTo(UserController.getUser())) {
            if (designModuleIds[module.moduleId] &&
                module.categoryName.toLowerCase() !== MECHANICAL) {
                filtered.push(module);
            }
        }
        return filtered;
    }

    private onChangeSearchInput(input: string): void {
        this.setState({
            searchInput: input,
            displayDesigns: this.getDisplayDesigns(
                this.props.designs,
                input,
                this.props.selectedModuleIds
            ),
        });
    }

    private getDisplayDesigns(designs: Design[],
                              searchInput: string,
                              selectedModuleIds: Set<ServerID>): Design[] {
        let filteredDesigns = designs;

        if (searchInput) {
            filteredDesigns = filteredDesigns.filter(value => {
                return value.contains(searchInput);
            });
        }

        if (selectedModuleIds.size !== 0) {
            filteredDesigns = filteredDesigns.filter(design => {
                let show = true;
                selectedModuleIds.forEach(id => {
                    if (!design.containsModuleId(id)) {
                        show = false;
                    }
                });
                return show;
            });
        }
        return filteredDesigns;
    }
}
