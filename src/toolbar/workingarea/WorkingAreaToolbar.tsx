import * as React from "react";
import {WorkingAreaToolbutton} from "./WorkingAreaToolbutton";

interface ToolbarProps {
    toolbuttonGroups: React.ReactComponentElement<typeof WorkingAreaToolbutton>[][];
    isModuleLibraryOpen: boolean;
}

export class WorkingAreaToolbar extends React.Component<ToolbarProps> {
    constructor(props: ToolbarProps) {
        super(props);
    }

    public render() {
        const views = [];
        this.props.toolbuttonGroups.forEach((group, i) => {
            for (const button of group) {
                views.push(<div key={button.props.id}>{button}</div>);
            }
            if (i !== this.props.toolbuttonGroups.length - 1) {
                views.push(<div className="working-area-toolbar-divider"
                                key={i}/>);
            }
        });
        return (
            <div className="working-area-toolbar"
                 style={{
                     marginLeft: this.getToolbarMarginLeft(),
                     left: this.props.isModuleLibraryOpen === false ? '50%' : '38%'
                 }}>
                {views}
            </div>
        );
    }

    private getToolbarMarginLeft(): string {
        let numTools = 0;
        for (const group of this.props.toolbuttonGroups) {
            numTools += group.length;
        }
        return `-${numTools}rem`;
    }
}
