import * as React from "react";
import {HELP} from "../../toolbar/events";
import events from "../../utils/events";

interface PowerPromptDialogContentProps {
    openPowerFinder: () => void;
}

export class PowerPromptDialogContent extends React.Component<PowerPromptDialogContentProps> {
    constructor(props: PowerPromptDialogContentProps) {
        super(props);
    }

    render() {
        return (
            <div className="power-prompt">
                <p>Power sources are available for your board. View them now?</p>
                <div className="button-container">
                    <button className="cta" onClick={() => this.props.openPowerFinder()}>Add Power Sources</button>
                </div>
                <p>You can still add power manually by selecting buses on modules
                    and dragging suggestions from the righthand library.
                    <span className="keyword help" onChange={() => events.publish(HELP)}>More instructions</span>
                </p>
            </div>
        );
    }
}