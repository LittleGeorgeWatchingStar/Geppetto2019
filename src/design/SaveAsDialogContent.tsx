import * as React from "react";
import {DesignRevision} from "./DesignRevision";
import UserController from "../auth/UserController";
import {enumerateString} from "../utils/StringEnumerator";
import {Module} from "../module/Module";
import {HEADER, LIGHTS_SWITCHES, MECHANICAL} from "../module/Category";

interface SaveAsDialogContentProps {
    customMessage: string | null;
    design: DesignRevision;
    saveClose: () => void;
}

interface SaveAsDialogContentState {
    title: string;
    description: string;
    publicCheck: boolean;
}

export class SaveAsDialogContent extends React.Component<SaveAsDialogContentProps, SaveAsDialogContentState> {
    constructor(props: SaveAsDialogContentProps) {
        super(props);
        this.state = {
            title: this.getTitle(),
            description: this.props.design.getDescription() ? this.props.design.getDescription() : this.getDefaultDescription(),
            publicCheck: this.props.design.getPublic(),
        }
    }

    render() {
        const design = this.props.design;
        const titleError = !this.state.title && UserController.checkTitle(design.getDesignTitle());
        const descriptionError = !this.state.description && UserController.checkDescription(design.getDescription());
        const description = design.getDescription() ? design.getDescription() : this.getDefaultDescription();

        return (
            <div className="save-as-dialog">
                {this.props.customMessage &&
                <div className="custom-message-container">
                    {this.props.customMessage}
                </div>
                }

                <div className="save-as-title-container">
                    <label>Title:
                        <input name="title" type="Text" maxLength={100}
                               onChange={e => this.setState({title: e.target.value})} value={this.state.title}
                               className={titleError ? "error" : ''}/>
                    </label>
                    <p className="error">{titleError}</p>
                </div>
                <div className="save-as-description-container">
                    <label>Description:
                        <textarea name="description"
                                  cols={30} rows={6}
                                  className={descriptionError ? "error" : ''}
                                  onChange={e => this.setState({description: e.target.value})}
                                  defaultValue={description}>
                    </textarea>
                    </label>
                    <p className="error">{descriptionError}</p>
                </div>
                <div>
                    <label>Share with Community:
                        <input name="share" type="checkbox"
                               onChange={() => this.setState({publicCheck: !this.state.publicCheck})}
                               defaultChecked={this.state.publicCheck}/>
                    </label>
                    <a target="_blank" rel="license" href="//creativecommons.org/publicdomain/zero/1.0/">
                        <img className="creative-commons" src="//i.creativecommons.org/p/zero/1.0/80x15.png" alt="CC0"/>
                    </a>
                </div>
                {this.state.publicCheck &&
                <div>
                    <p>
                        <small>By sharing, you release your design to the public and waive all copyrights, so others may
                            copy, modify, and use it for any purpose.</small>
                    </p>
                    <p>
                        <a target="_blank" rel="license" href="//creativecommons.org/publicdomain/zero/1.0/"><small>View
                            the full license text</small></a>
                    </p>
                </div>}

                <div className="save-button-container">
                    <button className="save cta" onClick={() => this.onSave()}>Save</button>
                </div>
            </div>
        );
    }

    private onSave(): void {
        const design = this.props.design;
        design.setDesignTitle(this.state.title.trim());
        design.setDescription(this.state.description.trim());
        design.setPublic(this.state.publicCheck);
        if (!this.hasErrors()) {
            this.props.saveClose();
        }
    }

    private getTitle(): string {
        const designNames = UserController.getUser().getDesigns().map(d => d.getTitle());
        if (!this.props.design.getDesignTitle()) {
            return enumerateString('New Design', designNames);
        }
        return enumerateString(this.props.design.getDesignTitle(), designNames);
    }

    private getDefaultDescription(): string {
        const design = this.props.design;
        let COMorProcessor = '';
        let powerConnector = '';
        const other = [];
        for (const pm of design.getPlacedModules()) {
            const module = pm.module;
            if (module.isCOMorProcessor) {
                COMorProcessor = `Uses ${module.name} as its COM/processor.`;
            } else if (module.isPowerConnector) {
                powerConnector = `Powered by a ${module.name}.`
            } else if (this.isNotableModule(module) && other.length <= 10) {
                if (other.length === 0) {
                    other.push(`Functional modules include:`);
                }
                other.push(module.name);
            }
        }

        return [
            COMorProcessor,
            other.join('\n'),
            powerConnector
        ].join('\n\n').trim();
    }

    private isNotableModule(module: Module): boolean {
        return !module.isCategory(MECHANICAL) &&
            !module.isCategory(HEADER) &&
            !module.isCategory(LIGHTS_SWITCHES) &&
            !module.isPowerModule;
    }

    private hasErrors(): boolean {
        return null != UserController.checkTitle(this.props.design.getDesignTitle()) ||
            null != UserController.checkDescription(this.props.design.getDescription());
    }
}