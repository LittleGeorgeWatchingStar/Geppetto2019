import * as React from "react";

export class DashboardMenuItemProps {
    id: string;
    title: string;
    tabSelection: string;
    specialTheme?: string;
}

export class DashboardMenuItemState {

}

export class DashboardMenuItem extends React.Component<DashboardMenuItemProps, DashboardMenuItemState> {
    constructor(props: DashboardMenuItemProps) {
        super(props);
    }

    render() {
        const icon = this.props.specialTheme ? `${this.props.specialTheme}-icon` : `${this.props.id}-icon`;
        return (
            <div key={this.props.id}
                 className="dashboard-menu-item">
                <div className="dashboard-menu-title-wrapper">
                    <span id={icon} className="dashboard-menu-icon"/>
                    <span className="dashboard-menu-title">{this.props.title}</span>
                </div>
            </div>
        );
    }
}
