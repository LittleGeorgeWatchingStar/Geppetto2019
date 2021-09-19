import Notice from "./Notice";
import * as React from "react";

interface NoticeProps {
    notices: Notice[];
}

interface NoticeState {
    opened: boolean;
    closed: boolean;
}

export class NoticeComponent extends React.Component<NoticeProps, NoticeState> {

    constructor(props: NoticeProps) {
        super(props);
        this.state = {
            opened: false,
            closed: false,
        };
    }

    private show = () => this.setState({opened: true});

    private hide = () => this.setState({closed: true});

    public render() {
        if (this.state.closed) {
            return null;
        }

        const noticeHtml = this.props.notices.map(n => <li key={n.cid}>
            <p>{n.getText()}</p></li>);

        return (
            <div>
                {(!this.state.opened) &&
                <div id="notice-alert"
                     title="You have alerts pending"
                     onClick={this.show}>
                    {this.props.notices.length.toFixed()}
                </div>}

                {this.state.opened &&
                <div id="notices-container">
                    <div id="notices" className="ui-dialog">
                        <div className="ui-dialog-titlebar">
                        <span className="ui-dialog-title">Notices</span>
                            <button title="close"
                                    onClick={this.hide}>
                            <span id="notice-close"
                                  className="ui-icon"/>
                            </button>
                        </div>

                        <ul id="notices-list">
                            {noticeHtml}
                        </ul>
                    </div>
                </div>}
            </div>
        );
    }
}
