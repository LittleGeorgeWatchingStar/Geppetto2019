import {ExclusionSet} from "./ExclusionSet";
import {RequireBus} from "../RequireBus";
import * as React from "react";
import {RefObject} from "react";

interface ExclusionNoConnectViewProps {
    exclusionSet: ExclusionSet;
    noConnect: boolean;
    requireToConnect: RequireBus | null;
    onClick: () => void;
}

export class ExclusionNoConnectView extends React.Component<ExclusionNoConnectViewProps> {
    private readonly el: RefObject<HTMLLIElement>;

    constructor(props: ExclusionNoConnectViewProps) {
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
    }

    private get classNames(): string[] {
        const classNames = ['choice'];
        if (this.isSelected) {
            classNames.push('selected');
        }
        if (this.isFaded) {
            classNames.push('ui-state-disabled');
        }
        return classNames;
    }

    private get isSelected(): boolean {
        return this.props.noConnect;
    }

    private get isFaded(): boolean {
        return this.props.requireToConnect != null;
    }

    private onClick = event => {
        this.props.onClick();
    };

    public render() {
        return (
            <li ref={this.el}
                className={this.classNames.join(' ')}
                // onClick={this.onClick}
                // onTouchEnd={this.onClick}
            >
                <a>NC</a>
            </li>
        );
    }
}