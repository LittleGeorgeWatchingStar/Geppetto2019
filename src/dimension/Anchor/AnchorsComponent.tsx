import {Workspace} from "../../workspace/Workspace";
import {Anchor} from "./Anchor";
import * as React from "react";
import {AnchorComponent} from "./AnchorComponent";

interface AnchorsComponentProps {
    workspace: Workspace;
    anchors: Anchor[];
}

export class AnchorsComponent
    extends React.Component<AnchorsComponentProps> {

    constructor(props: AnchorsComponentProps) {
        super(props);
    }

    public render(): React.ReactNode {
        return (this.props.anchors.map(anchor => {
            return <AnchorComponent key={anchor.uuid}
                                    anchor={anchor}
                                    workspace={this.props.workspace}/>
        }));
    }
}