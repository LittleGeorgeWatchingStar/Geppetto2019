import * as ReactDOM from "react-dom";
import * as React from "react";
import DialogManager from "../../../view/DialogManager";
import {AbstractDialog} from "../../../view/Dialog";
import {DesignRevision} from "../../../design/DesignRevision";
import {DesignController} from "../../../design/DesignController";
import events from "../../../utils/events";
import {AUTODOC} from "../../events";

export function openAutodocDialog(orderedDesign: boolean): void {
    const dialog = DialogManager.create(AutodocDialog, {});
    ReactDOM.render(
        <AutodocDialogContent designRevision={DesignController.getCurrentDesign()}
                              closeDialog={() => dialog.close()}
                              orderedDesign={orderedDesign}/>,
        dialog.el);
}

class AutodocDialog extends AbstractDialog<any> {
    initialize(options) {
        super.initialize(options);
        this.option({
            width: 600,
            height: 230,
        });
        this.title('Warning');
        return this;
    }

    public get className(): string {
        return 'download-cad-dialog';
    }
}

interface AutodocDialogContentProps {
    designRevision: DesignRevision;
    closeDialog: () => void;
    orderedDesign: boolean;
}

class AutodocDialogContent extends React.Component<AutodocDialogContentProps> {
    constructor(props: AutodocDialogContentProps) {
        super(props);
    }

    componentDidMount() {
        if (this.props.orderedDesign) this.download();
    }

    render() {
        return (
            <div className="autodoc-dialog-body">
                <h3>Download Autodoc</h3>
                {!this.props.orderedDesign &&
                <p>Please save your changes first to download the newest Autodoc file.</p>
                }
                <p className="warning">The Autodoc file will be generated based on the lastest saved design.</p>

                <div className="autodoc-button-div">
                    <button className="autodoc-download-button"
                            onClick={() => this.download()}>Download
                    </button>
                </div>
            </div>
        );
    }

    private download(): void {
        this.props.closeDialog();
        events.publishEvent(AUTODOC, {
            design_revision_id: this.props.designRevision.getId(),
        });
    }
}
