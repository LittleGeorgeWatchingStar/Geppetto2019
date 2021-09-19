import * as React from "react";

export enum WorkingAreaToolbuttonDirection {
    left = 'left',
    center = 'center',
    right = 'right',
}

export interface WorkingAreaToolbuttonProps {
    /**
     * CSS Selector
     */
    id: string;

    /**
     * Callback on click; toolbars and toolbuttons have no real idea what they're doing.
     */
    onClick: () => void;

    /**
     * Tooltip message that shows up when users hover on the button
     */
    tooltip?: string;

    /**
     * Indicate whether the button is connected to other button, add class name based on its direction
     * (left, center, right)
     */
    buttonPosition?: WorkingAreaToolbuttonDirection;

    /**
     * To disable the Toolbutton if it can't be used for some reason.
     */
    error?: string | null;

    /**
     * Check if this is a toggle button
     */
    isToggleButton? : boolean;
}

export interface WorkingAreaToolbuttonState {
    isActive: boolean;
}

export class WorkingAreaToolbutton extends React.Component<WorkingAreaToolbuttonProps, WorkingAreaToolbuttonState> {
    constructor(props: WorkingAreaToolbuttonProps) {
        super(props);
        this.state = {
            isActive: false,
        }
    }

    public render(): React.ReactNode {
        const id = `${this.props.id}-icon`;
        const positionClass = this.props.buttonPosition ? `${this.props.buttonPosition}-working-area-button` : '';
        const activeButton = (this.props.isToggleButton && this.state.isActive === true) ? 'working-area-button-active' : '';
        return (
            <button id={this.props.id}
                    disabled={this.isDisabled}
                    title={this.tooltip}
                    onClick={() => this.onClick()}
                    className={`working-area-toolbar-button ${positionClass} ${activeButton}`}>
                <span id={id} className="working-area-toolbar-icon">
                </span>
            </button>
        );
    }

    protected onClick(): void {
        this.props.onClick();
        if(this.props.isToggleButton) this.setState({isActive: !this.state.isActive});
    }

    protected get error(): string | null {
        return this.props.error;
    }

    protected get isDisabled(): boolean {
        return this.error != null;
    }

    protected get tooltip(): string {
        const error = this.error;
        if (error) {
            return error;
        }
        return this.props.tooltip ? this.props.tooltip : '';
    }
}