import * as React from "react";
import {Toolbutton} from "./toolbutton/ToolButton";
import UserController from "../auth/UserController";


interface ToolbarProps {
    toolbuttonGroups: React.ReactComponentElement<typeof Toolbutton>[][];
}

/**
 * Renders a toolbar view from toolbutton props.
 */
export class Toolbar extends React.Component<ToolbarProps> {
    constructor(props: ToolbarProps) {
        super(props);
    }

    public render() {
        const views = [];
        this.props.toolbuttonGroups.forEach((group, i) => {
            for (const button of group) {
                views.push(<div key={button.props.id}>{button}</div>);
            }
            if (!UserController.getUser() || !UserController.getUser().isLoggedIn()) {
                if (i < this.props.toolbuttonGroups.length - 1) {
                    views.push(<div className="toolbar-group-divider"
                                    key={i}/>);
                }
            } else {
                if (i !== this.props.toolbuttonGroups.length - 1) {
                    views.push(<div className="toolbar-group-divider"
                                    key={i}/>);
                }
            }
        });
        return (
            <div className="toolbar"
                 style={{maxWidth: this.getToolbarWidth()}}>
                {views}
            </div>
        );
    }

    /**
     * For responsiveness with flex-box.
     */
    private getToolbarWidth(): string {
        let numTools = 0;
        for (const group of this.props.toolbuttonGroups) {
            const visible = group.filter(p => p.props.isVisible);
            numTools += visible.length;
        }
        return `${numTools * 5}rem`;
    }
}