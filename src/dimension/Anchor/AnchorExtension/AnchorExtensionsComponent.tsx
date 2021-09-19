import {Workspace} from "../../../workspace/Workspace";
import * as React from "react";
import {AnchorExtension} from "./AnchorExtension";
import {AnchorExtensionComponent} from "./AnchorExtensionComponent";
import {AnchorExtensionsController} from "./AnchorExtensionsController";
import {Subscription} from "rxjs";

interface AnchorExtensionComponentsProps {
    workspace: Workspace;
}

interface AnchorExtensionComponentsState {
    anchorExtensions: AnchorExtension[];
}

export class AnchorExtensionComponents
    extends React.Component<AnchorExtensionComponentsProps, AnchorExtensionComponentsState> {

    private subscriptions: Subscription[] = [];

    constructor(props: AnchorExtensionComponentsProps) {
        super(props);
        this.state = {
            ...this.fetchAnchorControllerState(),
        };
    }

    private fetchAnchorControllerState(): AnchorExtensionComponentsState {
        return {
            anchorExtensions: AnchorExtensionsController.getInstance().extensions,
        }
    }

    public componentDidMount(): void {
        this.subscriptions.push(
            AnchorExtensionsController.getInstance()
                .subscribe(() => {
                    this.setState(this.fetchAnchorControllerState)
                })
        );
    }

    public componentWillUnmount(): void {
        this.subscriptions.forEach(
            subscription => subscription.unsubscribe());
        this.subscriptions = [];
    }

    public render(): React.ReactNode {
        return (this.state.anchorExtensions.map(anchorExtension => {
            return <AnchorExtensionComponent key={anchorExtension.uuid}
                                             workspace={this.props.workspace}
                                             anchor={anchorExtension.anchor}/>
        }));
    }
}