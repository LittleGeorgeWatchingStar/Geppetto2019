import * as React from "react";
import {DropDownMenuItem} from "./DropDownMenuItem";

interface dropDownMenuProps {
    menuItemGroups: React.ReactComponentElement<typeof DropDownMenuItem>[][];
    isVisible: boolean;
}

export class DropDownMenu extends React.Component<dropDownMenuProps> {
    constructor(props: dropDownMenuProps) {
        super(props);
    }

    public render() {
        const listItem = [];
        this.props.menuItemGroups.forEach((group, i) => {
            for (const item of group) listItem.push(<li key={item.props.id}>{item}</li>);
            if (i !== this.props.menuItemGroups.length - 1) {
                listItem.push(<li className="menu-items-divider"
                                  key={i}>
                    <hr/>
                </li>);
            }
        });

        return (
            <div id="account-menu-dropdown">
                {this.props.isVisible &&
                <ul className="account-drop-down-ul">
                    {listItem}
                </ul>
                }
            </div>
        );
    }
}