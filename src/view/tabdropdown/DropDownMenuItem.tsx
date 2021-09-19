import * as React from "react";

export interface DropDownMenuItemProps {
    id: string
    title: string;
    onClick: () => void;
    tooltip: string;
    isVisible?: boolean;

    isToggle?: boolean;
    checkActive?: boolean;
    default?: () => void;
}

export interface DropDownMenuItemState {
    toggleState: boolean | null;
}

export class DropDownMenuItem extends React.Component<DropDownMenuItemProps, DropDownMenuItemState> {

    constructor(props: DropDownMenuItemProps) {
        super(props);

        this.state = {
            toggleState: this.props.isToggle ? false : null,
        }
    }

    public static defaultProps: Partial<DropDownMenuItemProps> = {
        isVisible: true,
    };

    componentDidMount() {
        if (this.props.isToggle) {
            this.props.checkActive ? this.setState({toggleState: true}) : this.setState({toggleState: false});
        }
    }

    render(): React.ReactNode {
        if (!this.props.isVisible) {
            return null;
        }
        const iconId = `${this.props.id}-menu-icon`;

        const sliderOnClass = this.state.toggleState ? ' slider-on-mode' : '';

        return (
            <div key={this.props.id}
                 id={this.props.id}
                 className={`drop-down-menu-item`}
                 title={this.props.tooltip}
                 onClick={() => this.onClick()}
            >
                <span id={iconId} className="menu-item-icon">
                </span>
                {this.props.title}

                {this.props.isToggle &&
                <label className="toggle-switch">
                    <span className={"slider" + sliderOnClass}></span>
                </label>
                }

            </div>
        );
    }

    protected onClick(): void {
        if (this.props.isToggle) return this.toggleOnClick();
        this.props.onClick();
    }

    protected toggleOnClick(): void {
        if (this.state.toggleState === false) {
            this.props.onClick();
        } else {
            this.props.default ? this.props.default() : this.props.onClick();
        }
        return this.setState({toggleState: !this.state.toggleState});
    }
}