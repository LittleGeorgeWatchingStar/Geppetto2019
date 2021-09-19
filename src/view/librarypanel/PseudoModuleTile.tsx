import events from "../../utils/events";
import {LOGO_AUTO_ADD, MODULE_TILE_CLICK, PSEUDO_MODULE_TILE_CLICK} from "../../module/events";
import {Outline} from "../../module/feature/footprint";
import {ModuleInfo} from "../../module/ModuleInfoBox";
import {Workspace} from "../../workspace/Workspace";
import * as React from "react";
import {Ref} from "react";
import {ModuleTileProps} from "./ModuleTile";
import {LibraryTile} from "./LibraryTile";
import eventDispatcher from "utils/events";


export interface PseudoModuleTileProps extends ModuleTileProps {
    id: any; // string | ServerID
    title: string;
    summary: string;
    description: string;
    svgData: string;
    outline: Outline;
}


/**
 * A library tile that behaves like a module tile, but isn't a module.
 * TODO no context menu.
 */
export class PseudoModuleTile extends React.Component<PseudoModuleTileProps> {
    /**
     * For identifying that this "module" is a logo.
     */
    public static LOGO_ID = 'new_logo';

    private libraryTile: LibraryTile;

    private readonly tileNode: Ref<HTMLDivElement>;

    private readonly moduleSvgContainer: Ref<HTMLDivElement>;

    /**
     * Generate an "Add Logo" tile.
     */
    public static logo(workspace: Workspace,
                       onDragStart: () => void,
                       onDragStop: () => void): JSX.Element {

        /**
         * Placeholder image for logo
         */
        const svgData = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="xMinYMin meet">
                    <g><line x1="10" y1="50" x2="90" y2="50"></line>
                    <line x1="50" y1="90" x2="50" y2="10"></line></g></svg>`;

        const outline = {
            xmin: 0,
            xmax: 100,
            ymin: 0,
            ymax: 100,
            width: 100,
            height: 100,
            mirror: 100
        };

        return <PseudoModuleTile id={PseudoModuleTile.LOGO_ID}
                                 title={'Add Custom Logo'}
                                 summary={'Add a custom silk screen logo'}
                                 description={'Add a custom silk screen logo from an uploaded SVG file.'}
                                 svgData={svgData}
                                 outline={outline}
                                 module={null}
                                 workspace={workspace}
                                 onDragStart={onDragStart}
                                 onDragStop={onDragStop}/>
    }

    constructor(props: PseudoModuleTileProps) {
        super(props);
        this.tileNode = React.createRef();
        this.moduleSvgContainer = React.createRef();
        this.libraryTile = new LibraryTile(this.props.workspace,
            this.tileNode,
            this.moduleSvgContainer,
            this.props.outline,
            this.props.onDragStart,
            this.props.onDragStop
        );
        this.onClick = this.onClick.bind(this);
    }

    render() {
        return (
            <div ref={this.tileNode}
                 className="module-tile"
                 data-logo-id={this.props.id}
                 title={this.props.summary}
                 onClick={this.onClick}>
                <div className="module-header">
                    <span>{this.props.title}</span>
                </div>
                <div className="module-container">
                    <div ref={this.moduleSvgContainer}
                         className="module-svg-container">
                        <div dangerouslySetInnerHTML={{__html: this.props.svgData}}/>
                    </div>
                </div>
            </div>
        );
    }

    private onClick(): void {
        events.publishEvent(PSEUDO_MODULE_TILE_CLICK, {
            onAdd: () => eventDispatcher.publishEvent(LOGO_AUTO_ADD),
            name: this.props.title,
            description: this.props.description,
            price: null
        } as ModuleInfo);
    }

    public componentDidMount(): void {
        this.libraryTile.setupDraggable();
    }

    public componentWillUnmount(): void {
        this.libraryTile.onDestroy();
    }
}