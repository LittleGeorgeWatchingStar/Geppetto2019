import * as React from "react";
import * as Config from "Config";
import {ReactNode} from "react";
import * as $ from "jquery";
import {ArrowEvent, TUTORIAL_ARROW_HIDE, TUTORIAL_ARROW_SHOW} from "../tutorial/events";
import events from "../utils/events";

export enum UserManualTab {
    HOME = 'home',
    CONTROL = 'control',
    CONNECTION = 'connection',
    DESIGN_STATUS = 'design_status',
    DESIGN_COMPLETING = 'design_completing',
    DIMENSIONS = 'dimensions',
    MULTI_VIEWS = 'multi_views',
    ABOUT = 'about',
}

interface UserManualProps {
    openWithSelection: string;
    scrollTop: () => void;
}

interface UserManualState {
    tabSelected: string;
}

const DOMDICT = {
    'Workspace': '#workspace-tabbutton',
    'My Account': '#account-tabbutton',
    'Designed by Gumstix': '#made-by-gumstix-tabbutton',
    'Community': '#community-tabbutton',
    'Module Library': '.panel',
    'Dimensions': '#dimension',
    'dimensions': '#dimension',
    'dimension': '.dimension',
    'scale': '#scale',
    'Recenter': '#refocus',
    'Resize': '#board .resize .ui-icon',
    'Connections': '#connect',
    '3D Preview': '#view3D',
    '3D view tool': '#view3D',
    'save': '#save',
    'Order': '#order',
    'log-in': '.login.tabbutton',
    'Downloads': '#downloads'
};

export class UserManual extends React.Component<UserManualProps, UserManualState> {
    private control;
    private flashTimer;
    private fadeTimer;

    constructor(props: UserManualProps) {
        super(props);
        this.state = {
            tabSelected: this.props.openWithSelection
        }
    }

    componentWillReceiveProps(nextProps: Readonly<UserManualProps>, nextContext: any) {
        if (nextProps.openWithSelection && nextProps.openWithSelection !== this.state.tabSelected) this.setState({tabSelected: nextProps.openWithSelection});
    }

    componentDidUpdate() {
        this.props.scrollTop();
    }

    render() {
        return (
            <div className="help-content-container">
                {this.state.tabSelected !== UserManualTab.HOME &&
                <div className="help-content-top-action-bar">
                    <button onClick={() => this.setState({tabSelected: UserManualTab.HOME})}
                            className="back">Back to directory
                    </button>
                    <hr/>
                </div>}
                {this.state.tabSelected === UserManualTab.HOME && this.homeTab()}
                {this.state.tabSelected === UserManualTab.CONTROL && this.controlTab()}
                {this.state.tabSelected === UserManualTab.CONNECTION && this.makeConnectionTab()}
                {this.state.tabSelected === UserManualTab.DESIGN_STATUS && this.designStatusTab()}
                {this.state.tabSelected === UserManualTab.DESIGN_COMPLETING && this.designCompletingTab()}
                {this.state.tabSelected === UserManualTab.DIMENSIONS && this.dimensionTab()}
                {this.state.tabSelected === UserManualTab.MULTI_VIEWS && this.designMultiViewTab()}
                {this.state.tabSelected === UserManualTab.ABOUT && this.aboutTab()}

                {this.state.tabSelected !== UserManualTab.HOME && this.footerNav()}
            </div>
        );
    }

    private homeTab(): ReactNode {
        const navButtons = [];
        UserManualTabNav().forEach((item, i) => {
            navButtons.push(
                <div onClick={() => this.setState({tabSelected: item.selection})}
                     className="nav-box"
                     key={i}>
                    <div>
                        <img src={`${item.imageUrl}`}
                             alt={item.imageAlt}/>
                        {item.name}
                    </div>
                </div>
            )
        });

        return (
            <div className="help-content">
                <div className="nav-box-container">
                {navButtons}
                </div>
                <section>
                    <h4>Quick Questions</h4>
                    <br/>
                    <strong>Why is my board red?</strong>
                    <p>The board will be red (invalid) if there is an improperly placed module or if a module
                        still needs
                        a connection. Make sure your modules are on the board, fully connected, and aren't
                        overlapping one another.</p>
                    <br/>
                    <strong>Why can't I see require buses?</strong>
                    <p>Check that
                        <span className="keyword"
                              onMouseOver={() => this.highlight('Connections')}
                              onMouseLeave={() => this.dehighlight()}> Connections </span>
                        mode is turned on. Please note that connections are mutually exclusive with
                        <span className="keyword"
                              onMouseOver={() => this.highlight('Dimensions')}
                              onMouseLeave={() => this.dehighlight()}> Dimensions </span> mode.
                    </p>
                    <br/>
                    <strong>What do I get when I order a Geppetto design?</strong>
                    <p>You'll receive a <strong>populated, fully functioning, bootable</strong> board
                        (not just a PCB!).
                        Gumstix engineers will test your board to ensure its functionality.</p>
                </section>
                <p className="center">
                    Can't find what you need?<br/>
                    Contact us at <strong>sales@gumstix.com</strong>
                </p>
            </div>
        )
    }

    private controlTab(): ReactNode {
        return (
            <div className="help-content help-content-sub-tab">
                <section className="basic-controls">
                    <h3>Basic Controls</h3>
                    <h4 className="add-icon">Add Module</h4>
                    <p> Modules are functional blocks that offer features such as power, sensors, connectors, and
                        more.</p>
                    <p>From the
                        <span className="keyword"
                              onMouseOver={() => this.highlight('Module Library')}
                              onMouseLeave={() => this.dehighlight()}> Module Library </span>,
                        drag the module onto the board, or double click it.</p>
                    <h4 className="move-icon">Move Module</h4>
                    <ul>
                        <li>Click and drag the module.</li>
                        <li>Nudge the selected module with your arrow keys.</li>
                    </ul>
                    <h4 className="rotate-icon">Rotate Module</h4>
                    <ul>
                        <li>Click the module and press [R] on your keyboard.</li>
                        <li>Or right click it and select "Rotate."</li>
                    </ul>
                    <h4 className="delete-icon">Delete Module</h4>
                    <ul>
                        <li>Click the module and press [Delete] on your keyboard.</li>
                        <li>Or right click it and select "Delete."</li>
                    </ul>
                    <h4 className="resize-icon">Resize Board</h4>
                    <p>Resize your board by dragging the
                        <span className="keyword"
                              onMouseOver={() => this.highlight('Resize')}
                              onMouseLeave={() => this.dehighlight()}> Resize </span>
                        handles, or enter
                        <span className="keyword"
                              onMouseOver={() => this.highlight('Dimensions')}
                              onMouseLeave={() => this.dehighlight()}> Dimensions </span>
                        mode to input measurements.</p>
                    <h4 className="zoom-icon">Zoom Workspace</h4>
                    <p>Zoom in and out with your scroll wheel. The
                        <span className="keyword"
                              onMouseOver={() => this.highlight('scale')}
                              onMouseLeave={() => this.dehighlight()}> scale </span>
                        updates with your display size.</p>
                </section>
                <section>
                    <h3>Hotkeys</h3>
                    <div><b>Undo:</b> [Ctrl + Z]</div>
                    <div><b>Save:</b> [Ctrl + S]</div>
                    <div><b>Hide require buses:</b> [Shift]</div>
                    <div><b>Deselect all:</b> [Esc]</div>
                    <div><b>Rotate:</b> [R]</div>
                    <div><b>Delete:</b> [Delete]</div>
                </section>
                <section>
                    <h3>Additional Controls</h3>
                    <h4>Rename Module & View Connections</h4>
                    <p>Right click or double click the module to get extra options such as Rename
                        and Connections.</p>
                    <h4>Recenter board</h4>
                    <p><span className="keyword"
                             onMouseOver={() => this.highlight('Recenter')}
                             onMouseLeave={() => this.dehighlight()}>Recenter </span> your board if you've lost track of
                        it.</p>
                    <h4>Hide require buses</h4>
                    <p>If you have multiple modules close together, holding [Shift] will hide their requirements,
                        which allows you to select modules more easily.</p>
                    <h4>Fit board to modules</h4>
                    <p>Right click the workspace to show an option that fits the board edges to
                        your placed modules.</p>
                </section>
            </div>
        )
    }

    private makeConnectionTab(): ReactNode {
        return (
            <div className="help-content help-content-sub-tab">
                <h3>Make Connections</h3>
                <section>
                    <p>
                        Click a module on the board to see its <i>require buses</i>.
                        Buses are color-coded to show the state of the module's connections.
                    </p>
                    <figure>
                        <img src={`${Config.STATIC_URL}/image/help/color-codes.png`}
                             alt="Require buses"/>
                        <br/>
                        <figcaption>Color-coded require buses display on hover or click</figcaption>
                    </figure>
                </section>

                <section>
                    <h4>Connect a Red Bus</h4>
                    <p>
                        A red bus means that you need to add a new module to satisfy the requirement. When clicked, the
                        <span className="keyword"
                              onMouseOver={() => this.highlight('Module Library')}
                              onMouseLeave={() => this.dehighlight()}> Module Library </span>
                        will automatically display matching options:
                    </p>
                    <figure>
                        <img src={`${Config.STATIC_URL}/image/help/red-require.png`}
                             alt="Library updating with clicked flag"/>
                    </figure>
                    <p>Simply add one of the modules to finish the connection. You can always change
                        the connected bus afterward.</p>
                </section>

                <section>
                    <h4>Connect a Yellow Bus</h4>
                    <p>
                        A yellow bus means that the requirement can be fulfilled by another module
                        on the board. Clicking the yellow bus will reveal <i>provider buses</i>
                        from compatible modules.
                    </p>
                    <div className="center">
                        <figure className="col-1-2">
                            <img src={`${Config.STATIC_URL}/image/help/yellow-require.png`}
                                 alt="Requirement on board"/>
                            <figcaption>1. Provider bus (highlighted blue) appears from a valid module
                            </figcaption>
                        </figure>
                        <figure className="col-1-2">
                            <img src={`${Config.STATIC_URL}/image/help/yellow-require-2.png`}
                                 alt="Selected requirement"/>
                            <figcaption>2. Click the provider to connect</figcaption>
                        </figure>
                        <figure className="col-1-2">
                            <img src={`${Config.STATIC_URL}/image/help/yellow-require-3.png`}
                                 alt="Connected requirement"/>
                            <figcaption>3. Connection complete</figcaption>
                        </figure>
                    </div>
                </section>

                <section>
                    <h4>Disconnect or Reconnect a Green Bus</h4>
                    <p>A connection is complete when the bus turns green. Clicking a green bus allows you to view
                        and change its
                        connection:</p>
                    <figure className="col-1-2">
                        <img src={`${Config.STATIC_URL}/image/help/green-require.png`}
                             alt="Step 1. Click the green requirement bus"/>
                        <figcaption>1. Click the green require bus to see its provider (highlighted blue).
                        </figcaption>
                    </figure>
                    <figure className="col-1-2">
                        <img src={`${Config.STATIC_URL}/image/help/green-require-2.png`}
                             alt="Step 2. Click the provider bus"/>
                        <figcaption>2. Disconnect the provider by clicking it. The require bus should turn
                            yellow again.
                        </figcaption>
                    </figure>
                    <p>While a green bus is selected, you may also choose another provide bus to connect to it.</p>
                </section>

                <section>
                    <h4>Provider Bus Icons</h4>
                    <p>Occasionally, provider buses will display a penguin icon. This means that the bus is
                        <strong>recommended</strong> for this particular connection.</p>
                    <figure>
                        <img src={`${Config.STATIC_URL}/image/help/tux.png`}
                             alt="Tux provider"/>
                        <figcaption>Provide buses with penguin icons are recommended.</figcaption>
                    </figure>
                </section>
            </div>
        )
    }

    private designStatusTab(): ReactNode {
        return (
            <div className="help-content help-content-sub-tab">
                <h3>Design Status Colors</h3>
                <p>Status colors show the validity of your board and its components.
                    A design is valid and can be ordered when the board is all green.</p>
                <section>
                    <h4>Module Connection Status</h4>
                    <figure>
                        <img src="https://www.gumstix.com/images/modulecolours.png"
                             alt="Red, yellow and green module colors"/>
                        <br/>
                        <figcaption>Module colors show whether their requirements are fulfilled</figcaption>
                    </figure>

                    <p><b className="red">Red</b> - The board is missing a requirement.</p>

                    <p>
                        <b className="yellow">Yellow</b> - An incomplete connection can
                        be resolved by a module on the board.
                    </p>
                    <p>
                        <b className="green">Green</b> - All connections are complete.
                    </p>
                </section>
                <section>
                    <h4>Module Placement Status</h4>
                    <figure>
                        <img src="https://www.gumstix.com/images/moduleborders.png" alt="Red and black outline"/>
                        <br/>
                        <figcaption>Module outlines show valid placement</figcaption>
                    </figure>

                    <p><b className="red">Red</b> - The module cannot be placed here.
                        Placement can be invalid if it is off the board, or overlapping another module.</p>
                    <p>
                        <b>Black</b> - The module can be placed here.
                    </p>
                </section>
                <section>
                    <h4>Board Status</h4>
                    <figure>
                        <img src={`${Config.STATIC_URL}/image/help/board-outlines.png`}
                             alt="Geppetto board outlines"/>
                        <br/>
                        <figcaption>Board outline shows design validity</figcaption>
                    </figure>
                    <p>
                        <b className="red">Red</b> - The board is incomplete. A module is misplaced
                        and/or has an unfulfilled requirement.
                    </p>
                    <p>
                        <b className="yellow">Yellow</b> - There are unresolved connections between modules.
                    </p>
                    <p>
                        <b className="green">Green</b> - The board is valid.
                    </p>
                </section>
            </div>
        )
    }

    private designCompletingTab(): ReactNode {
        return (
            <div className="help-content help-content-sub-tab">
                <section>
                    <h3>Steps to Complete Your Design</h3>
                    <ol>
                        <li>Ensure that your design is all green.</li>
                        <li>Please <span className="keyword"
                                         onMouseOver={() => this.highlight('log-in')}
                                         onMouseLeave={() => this.dehighlight()}>log-in </span>
                            if you haven't already, and
                            <span className="keyword"
                                  onMouseOver={() => this.highlight('save')}
                                  onMouseLeave={() => this.dehighlight()}> save </span>
                            your board. Saving also grants access to on-demand documentation and board support package
                            for your design.
                        </li>
                        <li>You can preview your board in realistic proportions with the
                            <span className="keyword"
                                  onMouseOver={() => this.highlight('3D Preview')}
                                  onMouseLeave={() => this.dehighlight()}> 3D view tool</span>.
                            This can be helpful if you plan to create an enclosure.
                        </li>
                        <li>Click
                            <span className="keyword"
                                  onMouseOver={() => this.highlight('Order')}
                                  onMouseLeave={() => this.dehighlight()}> Order </span>
                            to submit your board to the store.
                            Geppetto will generate a store page where you can purchase your design.
                        </li>
                        <li>Get a <strong>populated, bootable board</strong> shipped after 15 business days!
                        </li>
                    </ol>
                </section>
                <section>
                    <figure>
                        <img src={`${Config.STATIC_URL}/image/help/rpi-compute-dev.png`}
                             alt="Dev board for Raspberry Pi Compute Module"/>
                        <figcaption>Gumstix Pi Compute Dev Board<br/>created in Geppetto by Gumstix Engineering
                        </figcaption>
                    </figure>
                </section>
                <section>
                    <h3>Automatic Documentation</h3>
                    <p><b>Autodoc</b> lets you download documentation about your current design.</p>
                    <p>Available under
                        <span className="keyword"
                              onMouseOver={() => this.highlight('Downloads')}
                              onMouseLeave={() => this.dehighlight()}> Downloads</span>
                        , Autodoc generates a .pdf file containing everything you and your colleagues need to know about
                        your board.</p>
                </section>
                <section>
                    <h3>Automatic Board Support Package</h3>
                    <p><b>AutoBSP</b> lets you download a board support package (BSP) for your current design. Available
                        under
                        <span className="keyword"
                              onMouseOver={() => this.highlight('Downloads')}
                              onMouseLeave={() => this.dehighlight()}> Downloads</span>,
                        the BSP is a .zip file that contains:</p>
                    <ul>
                        <li>A custom device tree for your design</li>
                        <li>Instructions on how to use device tree</li>
                    </ul>
                    <p>In the future, it will comprise network and application code specific to a device design.</p>
                </section>
            </div>
        )
    }

    private dimensionTab(): ReactNode {
        return (
            <div className="help-content help-content-sub-tab">
                <h3>Using Dimensions</h3>
                <p>Dimensioning will help ensure your design is buildable and meets mechanical requirements.
                    You can control the board size, or the distance of a module from an edge of the board.</p>
                <p>Click on
                    <span className="keyword"
                          onMouseOver={() => this.highlight('Dimensions')}
                          onMouseLeave={() => this.dehighlight()}> Dimensions </span>
                    to activate the mode.</p>
                <p>Hover over a module or board edge until you see a dashed line.
                    Click to start a dimension, then click the opposing edge to complete it.</p>
                <figure>
                    <img src="https://www.gumstix.com/images/dimension1.png" alt="Start Dimensions"/>
                    <figcaption>Select opposing edges of an area to be measured</figcaption>
                </figure>
                <figure>
                    <img src="https://www.gumstix.com/images/dimension2.png" alt="End Dimensions"/>
                    <figcaption>Dimensions show in millimeters</figcaption>
                </figure>
                <p>Your
                    <span className="keyword"
                          onMouseOver={() => this.highlight('Dimensions')}
                          onMouseLeave={() => this.dehighlight()}> dimension </span>
                    will appear. You can enter a value to adjust the distance between components, and right click to
                    lock the dimension.</p>
            </div>
        )
    }

    private designMultiViewTab(): ReactNode {
        return (
            <div className="help-content help-content-sub-tab">
                <h3>Playground Multi Views System</h3>
                <p>Playground multi views system is one of the key features introduced in Geppetto. It allows users to
                    view and edit the PCB design in Geppetto, Upverter and Altium Viewer 365.</p>
                <section>
                    <h4>Geppetto Playground</h4>
                    <figure>
                        <img src={`${Config.STATIC_URL}/image/help/multi-views-geppetto.png`}
                             alt="Geppetto playground view"/>
                        <br/>
                        <figcaption>Geppetto playground view</figcaption>
                    </figure>
                </section>
                <section>
                    <h4>Upverter Viewer</h4>
                    <figure>
                        <img src={`${Config.STATIC_URL}/image/help/multi-views-upverter.png`}
                             alt="Upverter Viewer"/>
                        <br/>
                        <figcaption>Upverter Viewer</figcaption>
                    </figure>
                </section>
                <section>
                    <h4>Altium Viewer 365</h4>
                    <figure>
                        <img src={`${Config.STATIC_URL}/image/help/multi-views-altium.png`}
                             alt="Altium Viewer 365"/>
                        <br/>
                        <figcaption>Altium Viewer 365</figcaption>
                    </figure>
                </section>
            </div>
        )
    }

    private aboutTab(): ReactNode {
        return (
            <div className="help-content help-content-sub-tab">
                <section>
                    <h3>About</h3>
                    <p>Geppetto allows you to easily design and order a <strong>populated,
                        finished,</strong> and <strong>completely functioning board.</strong></p>
                    <p>By dragging, dropping, and connecting modules, you can complete a design within the day
                        and get your board shipped in just three weeks.</p>
                    <p>Once your design is submitted, Gumstix engineers will take care of the rest, including
                        routing, PCB fabrication, sourcing parts, assembly -- and
                        test the board to ensure its functionality before delivering it to you.</p>
                    <figure>
                        <img src="https://www.gumstix.com/images/geppettoicon-small.png" alt="Geppetto icon"/>
                    </figure>
                    <h4>Additional Resources</h4>
                    <ul>
                        <li>
                            <a href="https://youtu.be/XbJ6n2WTQ4Y" target="_blank">
                                <strong>Geppetto in One Minute↗</strong>
                            </a>
                            A video showcasing Geppetto features.
                        </li>
                        <li>
                            <a href="https://www.gumstix.com/geppetto/" target="_blank">
                                <strong>Meet Geppetto↗</strong>
                            </a>
                            An introduction to Geppetto, including news and updates.
                        </li>
                        <li>
                            <a href="https://www.gumstix.com/geppetto-features/" target="_blank">
                                <strong>Features↗</strong>
                            </a>
                            Overview Geppetto's speed and cost advantages.
                        </li>
                        <li>
                            <a href="https://www.gumstix.com/geppetto-kb-new-to-geppetto" target="_blank">
                                <strong>How To↗</strong>
                            </a>
                            A complete guide for newcomers.
                        </li>
                        <li>
                            <a href="https://www.gumstix.com/geppetto-kb-quick-answers/" target="_blank">
                                <strong>FAQ↗</strong>
                            </a>
                            Questions about the process and pipeline answered in-depth.
                        </li>
                        <li>
                            <a href="https://www.gumstix.com/geppetto-kb-video-tutorials/" target="_blank">
                                <strong>
                                    Tutorials↗
                                </strong>
                            </a>
                            Video tutorials for designing your board.
                        </li>
                    </ul>
                </section>
            </div>
        )
    }

    private footerNav(): ReactNode {
        const footerNav = [];
        UserManualTabNav().forEach((value, i) => {
            if (value.selection === this.state.tabSelected) {
                const previousAction = i !== 0 ? UserManualTabNav()[i - 1].selection : UserManualTabNav()[UserManualTabNav().length - 1].selection;
                const nextAction = i !== (UserManualTabNav().length - 1) ? UserManualTabNav()[i + 1].selection : UserManualTabNav()[0].selection;

                footerNav.push(
                    <div className="foot-nav" key={i}>
                        <button className="previous"
                                onClick={() => this.setState({tabSelected: previousAction})}>Previous
                        </button>
                        <button className="next"
                                onClick={() => this.setState({tabSelected: nextAction})}>Next
                        </button>
                    </div>
                );
            }
        });

        return (
            footerNav
        )
    }

    /**
     * TODO: Convert into React during tutorial refactoring
     * This section below is for the tutorial arrow indication
     */
    private highlight(selectedKeyword: string): void {
        const keyword = selectedKeyword;
        this.control = $(DOMDICT[keyword]);
        if (this.control.length === 0) {
            return;
        }
        this.blink(keyword);
        this.showArrow(keyword);
    }

    private blink(keyword: string): void {
        let counter = 0;
        this.control.each(function (i, el) {
            el.original_css = $(el).attr('style');
        });

        if (!($('div.ui-dialog').has(DOMDICT[keyword]).length)) {
            this.fadeTimer = setTimeout(() => {
                $('div.ui-dialog').css('opacity', 0.6);
            }, 1000);
        }

        this.flashTimer = setInterval(() => {
            const norm = (1 + Math.cos(counter * Math.PI / 180)) / 2;
            counter += 10;
            counter %= 360;

            this.control.css({
                'opacity': norm
            });

        }, 10);
    }

    private showArrow(keyword: string): void {
        const params = this.getArrowParameters(keyword);
        events.publishEvent(TUTORIAL_ARROW_SHOW, params);
    }

    private getArrowParameters(keyword: string): ArrowEvent {
        const controlPosition = this.control.offset();
        let left = controlPosition.left;
        let top = controlPosition.top;
        let rotation = 0;
        if (keyword === 'Module Library') {
            rotation = 90;
        } else if (keyword === 'scale') {
            rotation = 180;
            left += this.control.width() / 2;
        } else {
            left += this.control.width() / 2;
            top += this.control.height();
        }
        return {
            top: top / $(window).height() * 100,
            left: left / $(window).width() * 100,
            rotate: rotation
        };
    }

    private dehighlight() {
        this.hideArrow();
        this.stopBlinking();
    }

    private hideArrow() {
        events.publish(TUTORIAL_ARROW_HIDE);
    }

    private stopBlinking() {
        clearTimeout(this.fadeTimer);
        $('div.ui-dialog').css('opacity', '');

        clearInterval(this.flashTimer);
        this.control.attr('style', '');
        this.control.each((i, el) => {
            $(el).attr('style', el.original_css);
        });
    }

}

function UserManualTabNav(): { name: string; selection: string; imageUrl: string; imageAlt: string; }[] {
    return [
        {
            name: 'Controls',
            selection: UserManualTab.CONTROL,
            imageUrl: `${Config.STATIC_URL}/image/help/controls.png`,
            imageAlt: 'Dragging module',
        },
        {
            name: 'Make Connections',
            selection: UserManualTab.CONNECTION,
            imageUrl: `${Config.STATIC_URL}/image/help/connect.png`,
            imageAlt: 'Connections',
        },
        {
            name: 'Design Status Colors',
            selection: UserManualTab.DESIGN_STATUS,
            imageUrl: `${Config.STATIC_URL}/image/help/colors.png`,
            imageAlt: 'Status colors',
        },
        {
            name: 'Completing Your Design',
            selection: UserManualTab.DESIGN_COMPLETING,
            imageUrl: `${Config.STATIC_URL}/image/help/aerocore-jetson-thumb.png`,
            imageAlt: 'AeroCore 2 for NVIDIA Jetson',
        },
        {
            name: 'Using Dimensions',
            selection: UserManualTab.DIMENSIONS,
            imageUrl: `${Config.STATIC_URL}/image/help/dimensions.png`,
            imageAlt: 'Dimensioning in Geppetto',
        },
        {
            name: 'Playground Multi Views',
            selection: UserManualTab.MULTI_VIEWS,
            imageUrl: `${Config.STATIC_URL}/image/help/multi-views.png`,
            imageAlt: 'Geppetto playground multi view buttons',
        },
        {
            name: 'About',
            selection: UserManualTab.ABOUT,
            imageUrl: "https://www.gumstix.com/images/geppettoicon-small.png",
            imageAlt: 'Geppetto icon',
        },
    ]
}