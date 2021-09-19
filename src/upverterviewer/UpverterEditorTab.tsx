import * as React from "react";
import {getDesignRevisionGateway} from "../design/DesignRevisionGateway";
import InnerHTML from 'dangerously-set-html-content';
import events from "../utils/events";
import {BACK_TO_DASHBOARD} from "../workspace/events";
import {CompiledCadSourceJobController} from "../compiledcadsource/CompiledCadSourceJobController";
import {Subscription} from "rxjs";

const AUTH_REDIRECT_DELAY = 3 * 1000;

export enum UpverterEditorTool {
    SCHEMATIC = 'schematic',
    LAYOUT = 'pcb',
}

export interface UpverterEditorPayload {
    auth: boolean;
    content: string;
}

interface UpverterEditorContainerProps {
    designRevisionId: string;
}

interface UpverterViewerContainerState {
    tool: UpverterEditorTool;
    toolHtmlString: string;
    isToolHtmlStringLoading: boolean,
    authHandle?: number,
}


export class UpverterEditorContainer extends React.Component<UpverterEditorContainerProps, UpverterViewerContainerState> {
    /**
     * TODO: Use observables and unsubscribe.
     */
    private mounted = false;

    private subscriptions: Subscription[] = [];

    constructor(props: UpverterEditorContainerProps) {
        super(props);
        this.state = {
            tool: UpverterEditorTool.SCHEMATIC,
            toolHtmlString: '',
            isToolHtmlStringLoading: true,
        };
    }

    private fetchJob() {
        const job = CompiledCadSourceJobController.getInstance().job;
        if (job.isInFinalState) {
            this.fetchToolHtmlString(this.state.tool);
        }
    }

    public componentDidMount() {
        this.fetchJob();
        this.subscriptions.push(CompiledCadSourceJobController.getInstance().subscribe(() => {
            this.fetchJob();
        }));
        this.mounted = true;
    }

    public componentWillUnmount(): void {
        this.mounted = false;
        if (this.state.authHandle) {
            clearInterval(this.state.authHandle);
        }
        this.subscriptions.forEach(
            subscription => subscription.unsubscribe());
        this.subscriptions = [];
    }

    public fetchToolHtmlString(tool: UpverterEditorTool): void {
        this.setState({
            toolHtmlString: '',
            isToolHtmlStringLoading: true,
        });
        getDesignRevisionGateway().getUpverterEditor(this.props.designRevisionId, tool).then(
            editor => {
                if (this.mounted) {
                    this.setState({
                        toolHtmlString: editor.content,
                        isToolHtmlStringLoading: false,
                    });
                }
                if (editor.auth) {
                    this.setState({
                        authHandle: window.setInterval(() => this.pollAuth(tool), AUTH_REDIRECT_DELAY)
                    });
                    this.pollAuth(tool);
                }
            },
            () => {
                if (this.mounted) {
                    this.setState({
                        isToolHtmlStringLoading: false,
                    });
                }
            }
        );
    }

    private pollAuth(tool: UpverterEditorTool): void {
        getDesignRevisionGateway().getUpverterEditor(this.props.designRevisionId, tool).then(
            editor => {
                if (this.mounted && !editor.auth) {
                    clearInterval(this.state.authHandle);
                    this.setState({
                        toolHtmlString: editor.content,
                        isToolHtmlStringLoading: false,
                        authHandle: null,
                    });
                }
            },
            () => {
                if (this.mounted) {
                    this.setState({
                        isToolHtmlStringLoading: false,
                    });
                }
            })
    }

    public changeTool(tool: UpverterEditorTool): void {
        if (tool === this.state.tool) {
            return;
        }

        this.setState({
            tool: tool,
        });
        this.fetchToolHtmlString(tool);
    }

    public get gerberZipFileUrl(): string {
        return getDesignRevisionGateway().getUpverterGerberZipUrl(this.props.designRevisionId);
    }

    render(): React.ReactNode {
        return (
            <>
                <button className="multi-view-back-to-dashboard"
                        onClick={() => events.publish(BACK_TO_DASHBOARD)}
                        title="Back to dashboard"
                >Dashboard
                </button>
                <div className="upverter-editor-container">
                    {
                        !this.props.designRevisionId &&
                        <div className="error">Upverter source not found.</div>
                    }
                    {
                        this.props.designRevisionId &&
                        [
                            <div key={0} className="header">
                                <div className="tab-button-container">
                                    <button
                                        className={`tab-button${this.state.tool === UpverterEditorTool.SCHEMATIC ? ' active' : ''}`}
                                        onClick={() => this.changeTool(UpverterEditorTool.SCHEMATIC)}>Schematic
                                    </button>
                                    <button
                                        className={`tab-button${this.state.tool === UpverterEditorTool.LAYOUT ? ' active' : ''}`}
                                        onClick={() => this.changeTool(UpverterEditorTool.LAYOUT)}>Layout
                                    </button>
                                </div>
                                <div className="downloads-button-container">
                                    {
                                        (!this.state.isToolHtmlStringLoading && this.state.toolHtmlString) &&
                                        <a className="download-button cta"
                                           href={this.gerberZipFileUrl}
                                           target="_blank">Download Gerber Files</a>
                                    }
                                </div>
                            </div>,
                            <div key={1} className="upverter-editor-wrapper">
                                {
                                    this.state.isToolHtmlStringLoading &&
                                    <div className="loading">Loading...</div>
                                }
                                {
                                    (!this.state.isToolHtmlStringLoading && !this.state.toolHtmlString) &&
                                    <div className="error">Could not load Upverter Editor.</div>
                                }
                                {
                                    (!this.state.isToolHtmlStringLoading && this.state.toolHtmlString) &&
                                    <UpverterEditor htmlString={this.state.toolHtmlString}/>
                                }
                            </div>,
                        ]
                    }
                </div>
            </>
        );
    }
}

interface UpverterEditorProps {
    htmlString: string;
}

class UpverterEditor extends React.Component<UpverterEditorProps> {
    constructor(props: UpverterEditorProps) {
        super(props);
    }

    render(): React.ReactNode {
        return (
            <InnerHTML html={this.props.htmlString}/>
        );
    }
}
