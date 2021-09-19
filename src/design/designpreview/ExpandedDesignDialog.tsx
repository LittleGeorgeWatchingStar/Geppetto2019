import {AbstractDialog, Dialog, DialogOptions} from "../../view/Dialog";
import {Design} from "../Design";
import {Library} from "../../module/Library";
import * as $ from "jquery";
import eventDispatcher from "../../utils/events";
import {
    DESIGN_DELETE_COMPLETE, DesignRequestEvent,
    OPEN_DESIGN_SCHEMATIC
} from "../events";
import * as Config from "Config";
import userController from "../../auth/UserController";
import errorHandler from "../../controller/ErrorHandler";
import DialogManager from "../../view/DialogManager";
import * as licenseTemplate from "templates/license";
import {DesignController} from "../DesignController";
import SaveOrDiscardDialog from "../../view/SaveOrDiscardDialog";
import {TabNavigation} from "../../view/TabNavigation";
import {checkPermission} from "../../router";
import DeleteDialog from "../../view/DeleteDialog";
import {DesignSharingOptions, openShareDialog} from "../sharing/view/DesignShareDialog";
import validate from "../../utils/validate";
import {AUTODOC, DEVICE_TREE} from "../../toolbar/events";
import * as Backbone from "backbone";
import * as React from "react";
import * as ReactDOM from "react-dom";
import {Module} from "../../module/Module";
import {SyntheticEvent} from "react";
import {LibraryController} from "../../module/LibraryController";
import {ServerID} from "../../model/types";
import events from "../../utils/events";
import {TUTORIAL_TEXT_HIDE} from "../../tutorial/events";
import {SAVE_DESIGN} from "../../view/events";

export interface ExpandedDesignDialogOptions extends DialogOptions<any> {
    designId: ServerID;
    url: string;
    showLink?: boolean;
    showAutoBsp?: boolean;
}


/**
 * An expanded design view from when you click on a DesignPreview.
 * TODO converting to react view
 */
export class ExpandedDesignDialog extends AbstractDialog<any> {

    public designId: ServerID;
    private design: Design;
    private designLoading: boolean;

    private showLink: boolean;

    private url: string;
    private showAutoBsp: boolean;

    private library: Library;
    private libraryLoading: boolean;

    private titleText: string;

    private descriptionText: string;

    private error: boolean;

    initialize(options: ExpandedDesignDialogOptions) {
        super.initialize(options);

        this.designId = options.designId;

        this.designLoading = true;

        this.url = options.url;
        this.showLink = options.showLink;
        this.showAutoBsp = options.showAutoBsp;

        this.libraryLoading = true;
        LibraryController.getLibraryAsync().then(library => {
            this.libraryLoading = false;
            this.library = library;
            this.render();
        }, () => {
            this.libraryLoading = false;
            this.error = true;
            this.render();
        });

        this.error = false;

        const defaultWidth = $(window).width() * 0.6;
        const defaultHeight = $(window).height() * 0.8;
        const dialogWidth = Math.min(Math.max(700, defaultWidth), 800);
        const dialogHeight = Math.min(Math.max(550, defaultHeight), 675);
        this.option({
            height: dialogHeight,
            width: dialogWidth
        });
        this.listenTo(eventDispatcher, DESIGN_DELETE_COMPLETE, this.close);

        /**
         * React callbacks depend on 'this' being bound to avoid recreating the callback.
         */
        this.onClickSave = this.onClickSave.bind(this);
        this.render = this.render.bind(this);
        return this.render();
    }

    get className() {
        return "design-preview-expanded";
    }

    render() {
        // .title() is a dialog method that replaces the dialog header content.
        // Not to be confused with other title getter/setters.
        if (this.designLoading) {
            this.title('Loading...');
        } else if (this.error) {
            this.title(`Design ${this.designId} Not Found`);
        } else {
            this.title(`${this.design.getTitle()}`);

        }

        const modules = this.listModules();

        let element;

        if (this.error) {
            // TODO: Style this better.
            element = <div className="wrapper">
                <div className="info">
                    {`Design ${this.designId} Not Found`}
                    </div>
            </div>;
        } else if (this.loading) {
            element = <div className="loading"/>;
        } else {
            element = <div className="wrapper">
                <div className="info">
                    {this.header}
                    <div className="preview-icon-wrapper">
                        <div className="preview">
                            {this.previewImage}
                        </div>
                        <div className="icons">
                            {this.getIcons(modules.COMorProcessor)}
                        </div>
                    </div>
                    {this.description}
                    {this.saveButton}
                    {this.getModuleList(modules)}
                </div>
                {this.sidebar()}
            </div>;
        }
        ReactDOM.render(element, this.$el.get(0));
        return this;
    }

    public setDesign(design: Design | undefined, render: boolean = true) {
        this.designLoading = false;
        if (design) {
            this.design = design;
            this.titleText = this.design.getTitle();
            this.descriptionText = this.design.getDescription();
        } else {
            this.error = true;
        }

        if (render) {
            this.render();
        }
    }

    public setShowLink(showLink: boolean, render: boolean = true) {
        this.showLink = this.showLink;
        if (render) {
            this.render();
        }
    }

    private get loading(): boolean {
        return this.designLoading || this.libraryLoading;
    }

    private get header(): JSX.Element {
        if (this.isSaveAvailable()) {
            return this.editableHeader;
        }
        const title = this.userIsOwner() && this.design.isValidated() ?
            "Validated designs cannot be edited" : "";
        return <div>
            <div title={title}
                 className="name-container">
                {this.design.getTitle()}
            </div>
        </div>
    }

    private get editableHeader(): JSX.Element {
        const onChange = (e: SyntheticEvent<HTMLInputElement>) => {
            this.titleText = e.currentTarget.value;
            this.render();
        };
        const check = (e: SyntheticEvent<HTMLInputElement>) => {
            if (!e.currentTarget.value) {
                e.currentTarget.value = this.design.getTitle();
            }
            onChange(e);
        };
        const titleError = this.titleError;
        return <div>
            <label>
                <input type="text"
                       className={`name ${titleError ? 'error' : ''}`}
                       defaultValue={this.design.getTitle()}
                       onBlur={check}
                       onChange={onChange}/>
            </label>
            {titleError && <span className="error">{titleError}</span>}
        </div>;
    }

    private get previewImage(): JSX.Element {
        if (this.design.getImageUrl()) {
            return <img src={this.design.getImageUrl()}
                        alt={`Preview for ${this.design.getTitle()}`}/>
        }
        return <img src={`${Config.STATIC_URL}/image/ImageMissing.png`} alt="No Preview Available"/>
    }

    private getIcons(modules: Module[]): JSX.Element[] {
        return modules.map(m => m.icon ?
            <img src={m.icon}
                 className="icon"
                 alt={`${m.name} icon`}
                 title={`This design includes ${m.name}`}
                 key={m.id}/> : null)
    }

    private get description(): JSX.Element {
        if (this.isSaveAvailable()) {
            return this.editableDescription;
        }
        const title = this.userIsOwner() && this.design.isValidated() ?
            "Validated designs cannot be edited" : "";
        return <div>
            <div className="heading-container">
                <h3>Description</h3>
            </div>
            <div className="description-container"
                 title={title}>
                {this.design.getDescription()}
            </div>
        </div>
    }

    private get editableDescription(): JSX.Element {
        const onChange = (e: SyntheticEvent<HTMLTextAreaElement>) => {
            this.descriptionText = e.currentTarget.value;
            this.render();
        };
        const check = (e: SyntheticEvent<HTMLTextAreaElement>) => {
            if (!e.currentTarget.value) {
                e.currentTarget.value = this.design.getDescription();
            }
            onChange(e);
        };
        return <label>
                <span className="heading-container">
                    <span className="heading">Description</span>
                    <em>(Max: 500 characters)</em>
                </span>
            <textarea className="description-text"
                      maxLength={500}
                      defaultValue={this.design.getDescription()}
                      onBlur={check}
                      onChange={onChange}/>
        </label>;
    }

    private get saveButton(): JSX.Element | null {
        if (!this.isSaveAvailable()) return null;
        const isDisabled = this.titleText === this.design.getTitle() &&
            this.descriptionText === this.design.getDescription();
        return <div className="save-button-container">
            <button className="save cta"
                    onClick={this.onClickSave}
                    disabled={isDisabled}>Save text
            </button>
        </div>
    }

    private onClickSave(): void {
        if (this.design.isValidated() || this.titleError) {
            return;
        }
        this.render();
        this.design.save({
            title: this.titleText,
            description: this.descriptionText
        }, {patch: true})
            .done(() => {
                DesignController.checkRevisionDetailsUpdate(this.design);
                events.publish(SAVE_DESIGN);
                this.render();
            })
            .fail(errorHandler.onFail);
    }

    private getModuleList(modules): JSX.Element {
        return <div className="modules">
            <h3 className="modules-header">Modules</h3>
            {modules.COMorProcessor.length > 0 &&
            <div>
                <h4>COM / Processor</h4>
                <ul className="module-list">
                    {modules.COMorProcessor.map(m => <li key={m.name}>{m.name}</li>)}
                </ul>
            </div>}
            {modules.other.length > 0 &&
            <div>
                <h4>Functionality</h4>
                <ul className="module-list">
                    {modules.other.map(m => <li key={m.name}>{m.name}</li>)}
                </ul>
            </div>}
            {modules.power.length > 0 &&
            <div>
                <h4>Power</h4>
                <ul className="module-list">
                    {modules.power.map(m => <li key={m.name}>{m.name}</li>)}
                </ul>
            </div>}
        </div>
    }

    private sidebar(): JSX.Element {
        return <div className="options">
            <div className="publish-details">
                {this.design.isPublic() &&
                <div>
                    <a rel="license" target="_blank"
                       href="//creativecommons.org/publicdomain/zero/1.0/">
                        <img src="//i.creativecommons.org/p/zero/1.0/80x15.png"
                             alt="CC0"/>
                    </a>
                </div>
                }
                {!this.userIsOwner() &&
                <div className="owner"> by {this.design.getCreatorFirstName()}</div>
                }
            </div>

            <div className="menu">
                {this.productUrl}
                {this.openButton}
                {this.shareButton}
                {this.setPublicButton}
                <hr/>
                <div className="downloads">
                    {this.autobsp}
                    {this.autodoc}
                    {this.schematics}
                </div>
                {this.shareableLink}
                {this.deleteNode}
            </div>
        </div>
    }

    private get productUrl(): JSX.Element | null {
        if (!this.design.getProductUrl()) return null;
        return (
            <a href={this.design.getProductUrl()} target="_blank">
                <button className="product">
                    {this.design.hasProductPrice() ?
                        `In store: $${this.design.getProductPrice()}` : "View in store↗"}
                </button>
            </a>
        );
    }

    private get openButton(): JSX.Element {
        const onClick = () => {
            if (!DesignController.hasUnsavedChanges()) {
                this.openDesign();
                return;
            }
            DialogManager.create(SaveOrDiscardDialog, {
                title: 'Open Design',
                callBack: () => this.openDesign(),
                action: 'to open an existing design'
            });
        };
        return <button className="open cta"
                       onClick={onClick}>
            {this.design.getProductUrl() && !this.userIsOwner() ? 'Use Free Template' : 'Open design'}
        </button>
    }

    private openDesign(): void {
        this.close();
        TabNavigation.openWorkspace();
        checkPermission(this.design);
    }

    private get shareButton(): JSX.Element | null {
        if (!this.userIsOwner()) return null;
        const onClick = () => {
            this.close();
            openShareDialog({
                designId: this.design.getId(),
                designTitle: this.design.getTitle(),
                designDescription: this.design.getDescription()
            } as DesignSharingOptions);
        };
        return <button className="share"
                       onClick={onClick}>Share</button>
    }

    private get setPublicButton(): JSX.Element | null {
        if (this.design.isPublic() || !this.userIsOwner()) return null;
        const onClick = () => {
            DialogManager.create(Dialog, {
                title: 'License Agreement',
                html: licenseTemplate({static_url: Config.STATIC_URL})
            }).confirm(() => {
                this.design.save({'public': true}, {patch: true})
                    .fail(errorHandler.onFail);
                this.render();
            });
        };
        return <button className="public"
                       onClick={onClick}>Set public</button>
    }

    private get shareableLink(): JSX.Element | null {
        if (!this.showLink) return null;
        const onClick = (e: SyntheticEvent<HTMLTextAreaElement>) => {
            e.currentTarget.select();
        };
        return <div>
            <hr/>
            <label className="shareable-link">
                Shareable Link
                <textarea readOnly
                          onClick={onClick}
                          value={window.location.href}/>
            </label>
        </div>
    }

    private get deleteNode(): JSX.Element | null {
        if (!this.userIsOwner()) return null;
        if (!this.design.isValidated()) {
            const onClick = () => DialogManager.create(DeleteDialog, {model: this.design});
            return (
                <div>
                    <hr/>
                    <button className="delete"
                            onClick={onClick}>
                        Delete
                    </button>
                </div>
            );
        }
        return (
            <div>
                <hr/>
                <i>Validated designs can't be deleted or altered.</i>
            </div>
        );
    }

    private listModules(): {
        COMorProcessor: Module[],
        other: Module[],
        power: Module[]
    } {
        const COMorProcessor = [];
        const other = [];
        const power = [];
        const checked = {};
        if (!this.libraryLoading && !this.designLoading && this.design) {
            for (const id of this.design.moduleIds) {
                const module = this.library.findByModuleId(id);
                if (checked[id] || !module) {
                    continue;
                }
                checked[id] = true;
                if (module.isCOMorProcessor) {
                    COMorProcessor.push(module);
                } else if (module.isPowerModule) {
                    power.push(module);
                } else {
                    other.push(module);
                }
            }
        }
        return {
            COMorProcessor: COMorProcessor,
            other: other.sort((a, b) => a.categoryName.localeCompare(b.categoryName)),
            power: power
        };
    }

    private userIsOwner(): boolean {
        const user = userController.getUser();
        return this.design.isOwnedBy(user);
    }

    private isSaveAvailable(): boolean {
        return this.userIsOwner() && !this.design.isValidated();
    }

    /**
     * Returns an error string if the title:
     * 1) Is blank or contains invalid characters.
     * 2) Is duplicate to another design title.
     */
    private get titleError(): string | undefined {
        if (!validate.isValid(this.titleText)) {
            return 'Invalid characters.';
        }
        const user = userController.getUser();
        const isDuplicate = user.findDesignByTitle(this.titleText);
        if (isDuplicate && this.titleText !== this.design.getTitle()) {
            return 'You already have a design with this name.';
        }
    }

    private get autobsp(): JSX.Element {
        if (!this.showAutoBsp) {
            return null;
        }
        const onClick = () => {
            eventDispatcher.publishEvent(DEVICE_TREE, {
                design_revision_id: this.design.getCurrentRevisionId()
            } as DesignRequestEvent);
        };
        return <button className="autobsp"
                       onClick={onClick}>Auto BSP</button>
    }

    private get autodoc(): JSX.Element {
        const onClick = () => {
            eventDispatcher.publishEvent(AUTODOC, {
                design_revision_id: this.design.getCurrentRevisionId()
            } as DesignRequestEvent);
        };
        return <button className="autodoc"
                       onClick={onClick}>Documentation</button>
    }

    private get schematics(): JSX.Element {
        if (!userController.getUser().isBetaTester()) {
            return null;
        }
        if (!this.design.isValidated()) {
            return null;
        }
        const onClick = () => {
            eventDispatcher.publishEvent(OPEN_DESIGN_SCHEMATIC, {
                design_revision_id: this.design.getCurrentRevisionId()
            } as DesignRequestEvent);
            return false; // Prevent click from focusing on this dialog
        };
        return <button className="schematic"
                       onClick={onClick}>Schematics</button>
    }

    close() {
        Backbone.history.navigate(`!/${this.url}`);
        ReactDOM.unmountComponentAtNode(this.$el.get(0));
        super.close();
    }
}