import * as React from "react";
import {PlacedModule} from "../../placedmodule/PlacedModule";
import {toggleBlink} from "./DesignHelper";

interface DuplicatePowerListProps {
    duplicatePower: { [moduleCid: string]: PlacedModule[] };
}

export class DuplicatePowerList extends React.Component<DuplicatePowerListProps> {

    render() {
        const duplicatePower = this.props.duplicatePower;
        return (
            Object.keys(duplicatePower).map(cid => {
                return (
                    <div key={cid}>
                        <span className={"cta-link"}
                              onMouseOver={() => this.onMouseOver(cid)}
                              onMouseLeave={() => this.onMouseOut(cid)}>
                        {duplicatePower[cid].map(power => power.name).join(', ')}</span> have
                        the same output and are both connected to the same power source.
                        Consider replacing them for a single module with more capacity.
                    </div>
                )
            })
        )
    }

    private onMouseOver(cid: string): void {
        this.props.duplicatePower[cid].forEach(pm => toggleBlink(pm, true));
    }

    private onMouseOut(cid: string): void {
        this.props.duplicatePower[cid].forEach(pm => toggleBlink(pm, false));
    }
}
