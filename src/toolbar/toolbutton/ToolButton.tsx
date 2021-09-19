import * as React from "react";
import events from "../../utils/events";
import {TOOLBUTTON_CLICKED, ToolbuttonEvent} from "../events";

/**
 * The logic of a button inside a toolbar.
 */
export interface ToolbuttonProps {
    /**
     * CSS selector.
     */
    id: string;

    /**
     * The display name.
     */
    title: string;

    /**
     * Callback on click; toolbars and toolbuttons have no real idea what they're doing.
     */
    onClick: () => void;

    /**
     * To disable the Toolbutton if it can't be used for some reason.
     */
    error?: string | null;


    /**
     * A condition that may prevent rendering of the button, eg. if the user needs to be an engineer.
     * Defaults to true if this property doesn't exist.
     */
    isVisible?: boolean;

    tooltip?: string;

    /**
     * To see if this button is in a toggled on/off state.
     */
    checkActive?: boolean;

    /**
     * Replace the icon if theme is applied
     */
    theme?: string;
}

export interface ToolbuttonState {
}

export class Toolbutton<T extends ToolbuttonProps, U extends ToolbuttonState>
    extends React.Component<T, U> {
    constructor(props: T) {
        super(props);
    }

    public static defaultProps: Partial<ToolbuttonProps> = {
        error: null,
        isVisible: true,
        checkActive: false,
    };

    public render(): React.ReactNode {
        if (!this.isVisible) {
            return null;
        }
        const id = this.props.theme ? `${this.props.theme}-icon` : `${this.props.id}-icon`;
        const activeClass = this.isActive ? 'active-js' : '';
        return (
            <button id={this.props.id}
                    disabled={this.isDisabled}
                    title={this.tooltip}
                    onClick={() => this.onClick()}
                    className={`${activeClass} toolbar-button`}>
                <span id={id} className="toolbar-icon">
                </span>
                <span className="toolbar-text">
                    {this.props.title}
                </span>
            </button>
        );
    }

    protected onClick(): void {
        this.props.onClick();
        events.publishEvent(TOOLBUTTON_CLICKED, {
            title: this.props.title
        } as ToolbuttonEvent);
    }

    protected get isActive(): boolean {
        return this.props.checkActive;
    }

    protected get isVisible(): boolean {
        return this.props.isVisible;
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

    protected get error(): string | null {
        return this.props.error;
    }
}