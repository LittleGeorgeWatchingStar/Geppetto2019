import * as React from "react";
import {actions} from "../core/action";

interface ActionLogProps {
    actionLogs: string[];
    isOpen: boolean;
}

interface ActionLogState {
    isOpen: boolean;
}


export class ActionLog extends React.Component<ActionLogProps, ActionLogState> {
    private readonly listEnd;

    constructor(props: ActionLogProps) {
        super(props);
        this.listEnd = React.createRef();
        this.state = {
            isOpen: this.props.isOpen,
        };

        this.close = this.close.bind(this);
    }

    componentWillReceiveProps(nextProps: Readonly<ActionLogProps>, nextContext: any) {
        this.setState({isOpen: nextProps.isOpen});
    }

    render() {
        return (
            <div className="action-log">
                {this.state.isOpen &&
                <div className="action-log-header">
                    <span>Action History</span>
                    <button onClick={this.close}
                            className="action-log-close-button">
                    </button>
                </div>}
                {this.state.isOpen && this.actionList}
            </div>
        )
    }

    componentDidUpdate(): void {
        this.scrollToLatest();
    }

    private close(): void {
        this.setState({
            isOpen: false
        });
    }

    private get actionList(): JSX.Element | null {
        const logs = this.logs;
        return (
            <div className="log-list-wrapper">
                <ul>
                    {logs.map((log, i) => {
                        return (
                            <li key={i}
                                title={log}
                                ref={i === logs.length - 1 ? this.listEnd : null}>
                                {log}
                            </li>
                        );
                    })}
                </ul>
            </div>
        );
    }

    private get logs(): string[] {
        const numResults = 15;
        const numLogs = this.props.actionLogs.length;
        const startIndex = numLogs - numResults < 0 ? 0 : numLogs - numResults;
        return this.props.actionLogs.slice(startIndex, numLogs);
    }

    private scrollToLatest(): void {
        if (this.listEnd.current) {
            this.listEnd.current.scrollIntoView({behavior: "smooth", block: 'nearest', inline: 'start'});
        }
    }
}