import {Tab} from "../view/DesignsTab";
import {TabSpec} from "../view/TabNavigation";
import * as ReactDOM from "react-dom";
import * as React from "react";
import {DesignController} from "../design/DesignController";
import {CompiledCadSourceJob} from "../compiledcadsource/CompiledCadSourceJob";
import {DesignRevision} from "../design/DesignRevision";
import {CompiledCadSourceJobController} from "../compiledcadsource/CompiledCadSourceJobController";
import {Subscription} from "rxjs";
import events from "../utils/events";
import {BACK_TO_DASHBOARD} from "../workspace/events";

export class CadViewerTab implements Tab {
    private subscriptions: Subscription[] = [];

    public url: string;
    public $el: JQuery;

    private designRevision: DesignRevision | null;

    constructor(tabSpec: TabSpec) {
        this.url = tabSpec.url;
        this.$el = $("<div class='tabview cad-viewer'></div>");
    }

    onOpen(): void {
        this.designRevision = DesignController.getCurrentDesign();
        const job = CompiledCadSourceJobController.getInstance().job;

        ReactDOM.render(
            <CadViewerContainer designRev={this.designRevision}
                                compiledCadJob={job}/>,
            this.$el[0]);
        this.$el.show();

        this.subscriptions.push(CompiledCadSourceJobController.getInstance().subscribe(() => {
            const job = CompiledCadSourceJobController.getInstance().job;
            ReactDOM.render(
                <CadViewerContainer designRev={this.designRevision}
                                    compiledCadJob={job}/>,
                this.$el[0]);
            this.$el.show();
        }));
    }

    onClose(): void {
        this.$el.hide();
        this.subscriptions.forEach(
            subscription => subscription.unsubscribe());
        this.subscriptions = [];
        ReactDOM.unmountComponentAtNode(this.$el[0]);
    }
}

interface CadViewerContainerProps {
    designRev: DesignRevision | null;
    compiledCadJob: CompiledCadSourceJob | null;
}

export class CadViewerContainer extends React.Component<CadViewerContainerProps> {
    constructor(props: CadViewerContainerProps) {
        super(props);
    }

    public isDesignRevisionDirty(): boolean {
        if (this.props.designRev) {
            return this.props.designRev.isDirty();
        }
        return false;
    }

    public isCompiledCadJobOutOfDate(): boolean {
        if (this.props.designRev && this.props.compiledCadJob) {
            return this.props.designRev.lastSaved > this.props.compiledCadJob.created;
        }
        return false;
    }


    render(): React.ReactNode {
        let warningMessage;
        if (this.isCompiledCadJobOutOfDate()) {
            warningMessage = 'Compiled CAD shown was created before the latest save.'
        } else if (this.isDesignRevisionDirty()) {
            warningMessage = 'Compiled CAD shown does not show unsaved design changes.'
        } else if (!this.props.compiledCadJob) {
            warningMessage = 'design does not have compiled CAD.'
        } else if (!this.props.compiledCadJob.isInFinalState) {
            warningMessage = 'CAD compilation is still in progress.'
        } else if (!this.props.compiledCadJob.downloadUrl) {
            warningMessage = 'Error occurred during compilation, please compile design again.';
        }

        return (
            <>
                <button className="multi-view-back-to-dashboard"
                        onClick={() => events.publish(BACK_TO_DASHBOARD)}
                        title="Back to dashboard"
                >Dashboard
                </button>
                <div className="cad-viewer-container">
                    {
                        warningMessage &&
                        <div className="error">{warningMessage}</div>
                    }
                    {
                        this.props.compiledCadJob &&
                        this.props.compiledCadJob.downloadUrl &&
                        <CadViewer cadZipUrl={this.props.compiledCadJob.downloadUrl}/>
                    }
                </div>
            </>
        );
    }
}


interface CadViewerProps {
    cadZipUrl: string;
}

class CadViewer extends React.Component<CadViewerProps> {

    constructor(props: CadViewerProps) {
        super(props);
    }

    /**
     * Since the Altium Viewer script seems to be coded for a static page,
     * make a static page in an iframe to display the Altium Viewer.
     */
    public get iframeSrcDoc(): string {
        return `<!DOCTYPE html>
<html>
    <head>
        <style type="text/css">
            html,
            body {
                margin: 0px;
                width: 100%;
                height: 100%;
            }
            .altium-ecad-viewer {
                max-width: none !important;
                max-height: none !important;
            }
        </style>
        <script src="https://viewer.altium.com/client/static/js/embed.js"></script>
    </head>
    <body>
        <div class="altium-ecad-viewer" data-project-src="${this.props.cadZipUrl}"></div>
    </body>
</html>`;
    }

    render(): React.ReactNode {
        return (
            <iframe className="cad-viewer-iframe"
                    allowFullScreen={true}
                    frameBorder="0"
                    seamless={true}
                    srcDoc={this.iframeSrcDoc}/>
        );
    }
}
