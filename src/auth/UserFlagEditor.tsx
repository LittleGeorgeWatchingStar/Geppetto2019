import User from "./User";
import * as React from "react";
import {FeatureFlag} from "./FeatureFlag";
import events from "../utils/events";
import {FLAG_ITEM_TOGGLE} from "./events";

interface UserFlagEditorProps {
    user: User;
    gateway: {
        toggleFlag: (user: User, feature: FeatureFlag) => JQueryXHR,
    };
    availableFlags: FeatureFlag[];
    availableToolFlags: FeatureFlag[];
}

interface UserFlagEditorState {
    isLoading: boolean;
}

export class UserFlagEditor extends React.Component<UserFlagEditorProps, UserFlagEditorState> {
    constructor(props: UserFlagEditorProps) {
        super(props);
        this.state = {
            isLoading: false,
        };
    }

    render(): JSX.Element {
        return (
            <main>
                <h3>Feature Flags</h3>
                <p>NOTE: Some feature UI elements may not re-render properly
                    until the page is refreshed.</p>
                <div className="sub-list">
                    <h4>Engineering Tool Flags</h4>
                    <hr/>
                    <ul className="flags-list">
                        {this.props.availableToolFlags.map(
                            flag => this.featureFlagItem(flag)
                        )}
                    </ul>
                </div>
                <div className="sub-list">
                    <h4>Pending Feature Flags</h4>
                    <hr/>
                    <ul className="flags-list">
                        {this.props.availableFlags.map(
                            flag => this.featureFlagItem(flag)
                        )}
                    </ul>
                </div>
            </main>
        )
    }

    private featureFlagItem(flag: FeatureFlag): JSX.Element {
        return (
            <li key={flag}>
                <div className="flag"
                     onClick={() => this.toggleFeatureFlag(flag)}>
                    <span className={this.props.user.isFeatureEnabled(flag) ? 'enabled-icon' : 'disabled-icon'}/>
                    {flag}
                </div>
            </li>
        )
    }

    private toggleFeatureFlag(flag: FeatureFlag): void {
        if (this.state.isLoading) {
            return;
        }

        this.setState({
            isLoading: true,
        });
        this.props.gateway.toggleFlag(this.props.user, flag)
            .always(() => {
                this.setState({
                    isLoading: false,
                })
                events.publish(FLAG_ITEM_TOGGLE);
            });
    }
}