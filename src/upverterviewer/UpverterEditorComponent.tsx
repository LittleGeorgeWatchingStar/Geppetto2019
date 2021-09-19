import * as React from "react";
import {UpverterEditorTool} from "./UpverterEditorTab";
import InnerHTML from 'dangerously-set-html-content';
import {getCadSourceGateway} from "../moduledataviewer/moduledatadetail/cadsource/CadSourceGateway";
import {ServerID} from "../model/types";

interface UpverterEditorContainerProps {
    cadSourceId: ServerID;
    tool: UpverterEditorTool
    isReadonly: boolean
}

interface UpverterViewerContainerState {
    toolHtmlString: string;
    isToolHtmlStringLoading: boolean,
}

/**
 * TODO: Consolidate with UpverterEditorTab
 */
export class UpverterEditorComponent extends React.Component<UpverterEditorContainerProps, UpverterViewerContainerState> {
    /**
     * TODO: Use observables and unsubscribe.
     */
    private mounted = false;

    constructor(props: UpverterEditorContainerProps) {
        super(props);
        this.state = {
            toolHtmlString: '',
            isToolHtmlStringLoading: false,
        };
    }

    public componentWillMount(): void {
        this.mounted = true;
        this.fetchToolHtmlString(this.props.tool);
    }

    public componentWillUnmount(): void {
        this.mounted = false;
    }

    public fetchToolHtmlString(tool: UpverterEditorTool): void {
        this.setState({
            toolHtmlString: '',
            isToolHtmlStringLoading: true,
        });
        getCadSourceGateway().getEditor(this.props.cadSourceId, tool, this.props.isReadonly).then(
            editor => {
                if (this.mounted) {
                    this.setState({
                        toolHtmlString: editor,
                        isToolHtmlStringLoading: false,
                    });
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

    render(): React.ReactNode {
        return (
            <div className="upverter-editor-container">
                {
                    !this.props.cadSourceId &&
                    <div className="error">Upverter source not found.</div>
                }
                {
                    this.props.cadSourceId &&
                    [
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
