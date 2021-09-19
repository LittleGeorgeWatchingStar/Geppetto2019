import * as React from "react";
import {RefObject} from "react";
import {RequireBus} from "../RequireBus";
import {ConnectionState} from "../../core/NeedsConnections";

interface OptionalRequireBusViewProps {
    bus: RequireBus;
    connectionState: ConnectionState;
    requireToConnect: RequireBus | null;
    onClick: () => void;
    onDoubleClick: () => void;
}

export class OptionalRequireBusView extends React.Component<OptionalRequireBusViewProps> {
    private readonly el: RefObject<HTMLLIElement>;

    constructor(props: OptionalRequireBusViewProps) {
        super(props);
        this.el = React.createRef<HTMLLIElement>();
    }

    public componentDidMount(): void {
        // Temporarily use JQuery events, until all JQuery events are gone.
        // React uses event delegation with a single event listener on
        // "document" for events that bubble.
        // So if any parent element has an Event.stopPropagation(), it would
        // prevent events from reaching "document".
        $(this.el.current as any).on('click touchend', this.onClick);
        $(this.el.current as any).on('dblClick', this.onDoubleClick);
    }

    private get classNames(): string[] {
        const classNames = ['bus'];
        classNames.push(this.props.connectionState);
        if (this.isSelected) {
            classNames.push('selected');
        }
        if (this.isFaded) {
            classNames.push('ui-state-disabled');
        }
        return classNames;
    }

    private get title(): string {
        return this.isSelected ? 'Click to disconnect' : '';
    }

    private get isSelected(): boolean {
        return this.props.bus === this.props.requireToConnect;
    }

    private get isFaded(): boolean {
        return this.props.requireToConnect && this.props.bus !== this.props.requireToConnect;
    }

    private onClick = event => {
        this.props.onClick();

    };

    private onDoubleClick = event => {
        this.props.onDoubleClick();
    };

    public render() {
        return (
            <li ref={this.el}
                className={this.classNames.join(' ')}
                title={this.title}
                // onClick={this.onClick}
                // onTouchEnd={this.onClick}
                // onDoubleClick={this.onDoubleClick}
            >
                <a className="bus">
                    <span className="bus-name">Connect</span>
                </a>
            </li>
        );
    }
}