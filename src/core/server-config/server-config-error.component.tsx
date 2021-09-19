import * as React from "react";

export class ServerConfigErrorComponent extends React.Component {
    public render() {
        return (
            <div id="server-config-error">
                <div className="error-wrapper">
                    <span className="error-message">
                        Service is down
                    </span>
                </div>
            </div>
        );
    }
}