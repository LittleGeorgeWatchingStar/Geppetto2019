import * as React from "react";
import {Design} from "./Design";
import {DesignController, DesignLoader} from "./DesignController";
import DialogManager from "../view/DialogManager";
import SaveOrDiscardDialog from "../view/SaveOrDiscardDialog";
import {ReactNode, RefObject} from "react";
import {ServerID} from "../model/types";
import moment = require("moment");

interface OpenDialogContentProps {
    designs: Design[];
    closeDialog: () => void;
}

interface OpenDialogContentState {
    displayedDesigns: Design[];
    selectedDesign: Design | null;
}

export class OpenDialogContent extends React.Component<OpenDialogContentProps, OpenDialogContentState> {
    inputRef: RefObject<HTMLInputElement>;

    constructor(props: OpenDialogContentProps) {
        super(props);
        this.state = {
            displayedDesigns: this.props.designs,
            selectedDesign: null
        }

        this.inputRef = React.createRef<HTMLInputElement>();
    }

    render() {
        const openDisabled = !this.state.selectedDesign ? 'open-button-disabled' : '';

        return (
            <div className="open-dialog-content">
                <div className="open-dialog-menu">
                    <span className="open-dialog-menu-title">All Designs</span>
                    <div className="open-dialog-search">
                        <input type="search"
                               placeholder="Search Design..."
                               ref={this.inputRef}
                               onChange={e => this.filterDesign(e.target.value)}/>
                        {this.inputRef.current &&
                        this.inputRef.current.value.length > 0 &&
                        <span className="search-reset" onClick={() => this.resetFilter()}/>}
                    </div>
                </div>
                <ol>
                    {this.state.displayedDesigns.map((value, i) => {
                        return this.designListItem(value, i);
                    })}
                </ol>
                <hr/>
                <div className="open-dialog-buttons">
                    <button className={`open-button ${openDisabled}`}
                            onClick={() => this.openDesign(this.state.selectedDesign.getCurrentRevisionId())}>Open
                    </button>
                    <button className="close-button"
                            onClick={() => this.props.closeDialog()}>Close
                    </button>
                </div>
            </div>
        );
    }

    private designListItem(design: Design, key: number): ReactNode {
        const selectedDesign = this.state.selectedDesign && this.state.selectedDesign.getId() === design.getId();
        const designUpdatedTime = moment(design.updated).format('YYYY-MM-DD HH:mm:ss');

        return (
            <li className={`open-dialog-item ${selectedDesign ? 'ui-state-highlight' : ''}`}
                onClick={() => this.setState({selectedDesign: design})}
                onDoubleClick={() => this.openDesign(design.getCurrentRevisionId())}
                key={key}>
                <div className="open-dialog-design-title">
                    {design.getTitle()}
                </div>
                <div className="open-dialog-design-time">
                    {designUpdatedTime}
                </div>
            </li>
        )
    }

    private openDesign(id: ServerID): void {
        const openCallback = () => DesignLoader.of(id).open();
        this.props.closeDialog();

        if (DesignController.hasUnsavedChanges()) {
            DialogManager.create(SaveOrDiscardDialog, {
                title: 'Open Design',
                callBack: openCallback,
                action: 'to open a existing design'
            });
        } else {
            openCallback();
        }
    }

    private filterDesign(input: string): void {
        let filteredDesigns = [];
        if (input) {
            filteredDesigns = this.props.designs.filter(design => {
                return design.contains(input);
            });
        } else {
            filteredDesigns = this.props.designs;
        }
        this.setState({displayedDesigns: filteredDesigns});
    }

    private resetFilter(): void {
        this.inputRef.current.value = '';
        this.setState({displayedDesigns: this.props.designs});
    }
}