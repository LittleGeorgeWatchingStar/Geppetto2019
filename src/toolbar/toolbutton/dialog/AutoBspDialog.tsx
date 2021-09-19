import * as ReactDOM from "react-dom";
import * as React from "react";
import DialogManager from "../../../view/DialogManager";
import {AbstractDialog} from "../../../view/Dialog";
import {DesignRevision} from "../../../design/DesignRevision";
import {DesignController} from "../../../design/DesignController";
import events from "../../../utils/events";
import {DEVICE_TREE} from "../../events";

export function openAutoBspDialog(orderedDesign: boolean): void {
    const dialog = DialogManager.create(AutoBspDialog, {});
    ReactDOM.render(
        <AutoBspDialogContent designRevision={DesignController.getCurrentDesign()}
                              closeDialog={() => dialog.close()}
                              orderedDesign={orderedDesign}/>,
        dialog.el);
}

class AutoBspDialog extends AbstractDialog<any> {
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

interface AutoBspDialogContentProps {
    designRevision: DesignRevision;
    closeDialog: () => void;
    orderedDesign: boolean;
}

class AutoBspDialogContent extends React.Component<AutoBspDialogContentProps> {
    constructor(props: AutoBspDialogContentProps) {
        super(props);
    }

    componentDidMount() {
        if (this.props.orderedDesign) this.download();
    }

    render() {
        return (
            <div className="autodoc-dialog-body">
                <h3>Download AutoBsp</h3>
                {!this.props.orderedDesign &&
                <p>Please save your changes first to download the newest AutoBsp file.</p>
                }
                <p className="warning">The AutoBsp file will be generated based on the lastest saved design.</p>

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
        events.publishEvent(DEVICE_TREE, {
            design_revision_id: this.props.designRevision.getId(),
        });
    }
}
