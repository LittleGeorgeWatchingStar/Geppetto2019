import * as React from "react";
import DialogManager from "../DialogManager";
import {Dialog} from "../Dialog";
import * as ReactDOM from "react-dom";
import {ThemeController} from "../../controller/ThemeController";

export function openManufacturingServices() {
    const width = Math.min(1100, $(window).width() * 0.8);
    const dialog = DialogManager.create(Dialog, {
        title: "Geppetto Manufacturing Services",
        width: width,
        height: $(window).height() * 0.9
    });
    dialog.$el.addClass('geppetto-services-dialog');
    ReactDOM.render(<ManufacturingServices/>, dialog.$el.get(0));
}

export class ManufacturingServices extends React.Component {
    render() {
        return (
            <div className="design-services-tab">
                <div className={`shutter shutter-${ThemeController.getInstance().THEME} dashboard-shutter`}/>
                <div className="design-services-content">
                    <div className="design-services-header">
                        <div className="design-services-header-background"/>
                        <h2>Geppetto Manufacturing Services</h2>
                        <p>
                        Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                        In posuere luctus nisi, id pellentesque lorem. Morbi metus mauris,
                        pellentesque ut metus a, auctor malesuada ex.
                        </p>
                    </div>
                    <div className="design-services-columns">
                        <div className="design-services-column">
                            <div className="design-services-column-content">
                                <h2>Level 1</h2>
                                <p><b>$xxxx</b> per design</p>
                                <p>Lead Time: <b>6 weeks</b></p>
                                <p>Minimum Order Quantity: <b>6 boards</b></p>
                                <p><b>Production: $xxxx</b> per design</p>
                                <hr/>
                                <h4>Access to Manufacturing files:</h4>
                                <p>🗸 BOM</p>
                                <p>🗸 Gerber</p>
                                <p>🗸 Design Files</p>
                                <p>🗸 Schematic</p>
                                <p>Available for <b>3 months</b> after board shipment</p>
                            </div>
                            <div className="cta-container">
                                <button className="cta">Purchase</button>
                            </div>
                        </div>
                        <div className="design-services-column">
                            <div className="design-services-column-content">
                                <h2>Level 2</h2>
                                <p><b>$xxxx</b> per design</p>
                                <p>Lead Time: <b>3 weeks</b></p>
                                <p>Minimum Order Quantity: <b>3 boards</b></p>
                                <p><b>Production: $xxxx</b> per design</p>
                                <hr/>
                                <h4>Access to Manufacturing files:</h4>
                                <p>🗸 BOM</p>
                                <p>🗸 Gerber</p>
                                <p>🗸 Design Files</p>
                                <p>🗸 Schematic</p>
                                <p>Available for <b>6 months</b> after board shipment</p>
                            </div>
                            <div className="cta-container">
                                <button className="cta">Purchase</button>
                            </div>
                        </div>
                        <div className="design-services-column">
                            <div className="design-services-column-content">
                                <h2>Level 3</h2>
                                <p><b>$xxxx</b> per design</p>
                                <p>Lead Time: <b>3 weeks</b></p>
                                <p>Minimum Order Quantity: <b>3 boards</b></p>
                                <p><b>Production: $xxxx</b> per design</p>
                                <hr/>
                                <h4>Access to Manufacturing files:</h4>
                                <p>🗸 BOM</p>
                                <p>🗸 Gerber</p>
                                <p>🗸 Design Files</p>
                                <p>🗸 Schematic</p>
                                <p>Available for <b>1 year</b> after board shipment</p>
                            </div>
                            <div className="cta-container">
                                <button className="cta">Purchase</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }
}
