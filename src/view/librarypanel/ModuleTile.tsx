import {Module} from "../../module/Module";
import userController from "../../auth/UserController";
import UserController from "../../auth/UserController";
import events from "../../utils/events";
import {
    CUSTOMIZED_MODULE_DELETE,
    MODULE_AUTO_ADD,
    MODULE_DOUBLE_CLICK,
    MODULE_INFO,
    MODULE_TILE_CLICK,
    ModuleEvent,
    ModulePlacementEvent
} from "../../module/events";
import {Workspace} from "../../workspace/Workspace";
import * as React from "react";
import {Ref, RefObject} from "react";
import {MarketingFeature} from "../../module/api";
import {LibraryTile} from "./LibraryTile";
import {openContext} from "../ContextMenu";
import markdown from "utils/markdown";
import {openModuleDataView} from "../../moduledataviewer/openModuleDataView";
import {EngineeringToolFlag, FeatureFlag} from "../../auth/FeatureFlag";
import {openModuleBusPinMappingView} from "../../modulebuspinmappingviewer/openModuleBusPinMappingView";
import {getCustomerModuleGateway} from "../../module/custom/CustomerModuleGateway";
import errorHandler from "../../controller/ErrorHandler";


export interface ModuleTileProps {
    module: Module;
    workspace: Workspace;
    onDragStart: () => void;
    onDragStop: () => void;
}

export interface ModuleTileState {
    deleteSelected: boolean;
}


export class ModuleTile extends React.Component<ModuleTileProps, ModuleTileState> {
    private readonly tileNode: Ref<HTMLDivElement>;
    private readonly moduleSvgContainer: RefObject<any>;
    private readonly libraryTile: LibraryTile;

    constructor(props: ModuleTileProps) {
        super(props);
        this.state = {
            deleteSelected: false,
        }
        this.tileNode = React.createRef();
        this.moduleSvgContainer = React.createRef();
        this.libraryTile = new LibraryTile(
            this.props.workspace,
            this.tileNode,
            this.moduleSvgContainer,
            this.props.module.outline,
            this.props.onDragStart,
            this.props.onDragStop
        );
        this.render();
    }

    componentDidUpdate(prevProps: Readonly<ModuleTileProps>, prevState: Readonly<ModuleTileState>, snapshot?: any) {
        if (this.state.deleteSelected) {
            document.addEventListener('click', (e) => {
                this.setState({deleteSelected: false});
            }, {once: true});
        }
    }

    public render(): JSX.Element {
        const module = this.props.module;
        const userLoggedIn = UserController.getUser().isLoggedIn();
        const newModuleTileUI = UserController.getUser().isFeatureEnabled(FeatureFlag.NEW_MODULE_LIBRARY_UI);

        return (
            <div ref={this.state.deleteSelected ? '' : this.tileNode}
                 className={`module-tile ${newModuleTileUI ? 'new-module-tile' : ''} ${this.hideDevMugrForEngineering() ? 'module-tile-hide' : ''}`}
                 data-module-id={module.getId()}
                 title={module.summary}
                 onClick={() => this.onClick()}
                 onDoubleClick={() => events.publishEvent(MODULE_DOUBLE_CLICK, {model: module} as ModuleEvent)}
                 onContextMenu={e => this.contextMenu(e)}
                 key={module.getId()}>
                {!newModuleTileUI && <div className="module-header">
                    {this.header}
                </div>}
                <div className="module-container">
                    {this.image}
                    {!newModuleTileUI && this.moduleSVG}
                    {newModuleTileUI && this.moduleSVGWithOrtho}
                    {module.isTemplateModule() && <span className="custom-label">CUSTOM</span>}
                </div>
                {newModuleTileUI && <div className="module-header">
                    {this.header}
                </div>}
                {!newModuleTileUI &&
                <>
                    <div className="icons">
                        {this.icons}
                    </div>
                    <div className="price-text">{module.getFormattedPrice()}</div>
                    {this.warnings}
                </>}
                {module.categoryName === 'Custom Modules' &&
                !this.state.deleteSelected && userLoggedIn &&
                !module.isTemplateModule() &&
                !module.isRestricted() &&
                module.authGroup.length == 0 &&
                <button className="module-delete"
                        onClick={(e) => this.deleteClick(e)}/>}
                {this.state.deleteSelected &&
                <div className="module-delete-confirmation" onClick={e => e.stopPropagation()}>
                    <h5>Confirm Delete {module.name}</h5>
                    <button onClick={(e) => this.deleteConfirmed(e, module)}>Delete</button>
                    <p onClick={() => this.setState({deleteSelected: false})}>Cancel</p>
                </div>}
            </div>
        );
    }

    private get moduleSVG(): JSX.Element {
        const module = this.props.module;
        const outline = module.outline;
        const pathD = module.getFootprintPolylines().map(polyline => polyline.svgPath()).join(' ');

        return <div ref={this.moduleSvgContainer}
                    title={module.summary}
                    className="module-svg-container">
            <svg xmlns="http://www.w3.org/2000/svg"
                 viewBox={`${outline.xmin} ${outline.ymin} ${outline.width} ${outline.height}`}
                 preserveAspectRatio="xMinYMin meet">
                <g transform={`translate(0, ${outline.mirror}) scale(1, -1)`}>
                    <path className="footprint" d={pathD}/>
                    {this.features}
                </g>
            </svg>
        </div>
    }

    private get moduleSVGWithOrtho(): JSX.Element {
        const module = this.props.module;
        const outline = module.outline;
        const pathD = module.getFootprintPolylines().map(polyline => polyline.svgPath()).join(' ');
        const url = this.props.module.orthographicUrl;

        return <div ref={this.moduleSvgContainer}
                    title={module.summary}
                    className={`module-svg-container ${url ? 'module-svg-container-with-ortho' : ''}`}>
            {url && <img src={url} alt="Orthographic Image" className="ortho-image"/>}
            <svg xmlns="http://www.w3.org/2000/svg"
                 viewBox={`${outline.xmin} ${outline.ymin} ${outline.width} ${outline.height}`}
                 preserveAspectRatio="xMinYMin meet">
                <g transform={`translate(0, ${outline.mirror}) scale(1, -1)`}>
                    <path className="footprint" d={pathD}/>
                    {this.features}
                </g>
            </svg>
        </div>
    }

    private get features(): JSX.Element[] {
        return this.props.module.features.map(f =>
            <line className={f.type}
                  key={f.id}
                  x1={f.points[0].x}
                  y1={f.points[0].y}
                  x2={f.points[1].x}
                  y2={f.points[1].y}/>);
    }

    private get image(): JSX.Element | null {
        const thumbnailUrl = this.props.module.thumbnailUrl;
        if (thumbnailUrl) {
            return <div className="module-image-container">
                <img src={thumbnailUrl} alt="Thumbnail Image"/>
            </div>;
        }

        const $description = $(markdown(this.props.module.description));
        const $image = $description.find('img');
        if ($image.length > 0) {
            return <div className="module-image-container"
                        dangerouslySetInnerHTML={{__html: $image[0].outerHTML}}/>
        }
        return null;
    }

    private setOrthoImageSize(): void {
        const outline = this.props.module.outline;
        const moduleSvgContainer = this.moduleSvgContainer.current;
        const svg = moduleSvgContainer.querySelector('svg');
        const orthoImg = moduleSvgContainer.querySelector('.ortho-image');
        const calcuHeight = svg.getBoundingClientRect().width / outline.width * outline.height;
        const actualHeight = calcuHeight < svg.clientHeight ? calcuHeight : svg.clientHeight;

        if (orthoImg) {
            orthoImg.setAttribute(
                'style', `width: ${svg.clientWidth}px; height: ${actualHeight}px;`);
        }
    }

    public componentDidMount(): void {
        this.libraryTile.setupDraggable();
        this.setOrthoImageSize();
    }

    public componentWillUnmount(): void {
        this.libraryTile.onDestroy();
    }

    private get header(): JSX.Element {
        const module = this.props.module;
        if (module.isTemplateModule()) {
            return <span className="custom"
                         title={`Create a customized ${module.name} by assigning nets to this module.`}>
                        {module.name}
                    </span>
        }
        return <span>{module.name}</span>;
    }

    private get icons(): JSX.Element[] {
        return this.props.module.getMarketing().map((f: MarketingFeature) => f.image_uri ? (
            <img className="design-feature"
                 src={f.image_uri}
                 alt={f.description}
                 key={f.name}
            />) : null
        );
    }

    private get warnings(): JSX.Element {
        const module = this.props.module;
        const showDev = module.isDev() && !module.isStable();
        const showMugr = module.isRestricted() && userController.getUser().isEngineer();
        return (
            <div className="warnings">
                {showDev && <div className="warning-label">DEV</div>}
                {showMugr && <div className="warning-label">MUGR</div>}
                {module.isExpired() && <div className="warning-label">INACTIVE</div>}
            </div>
        );
    }

    private contextMenu(event): void {
        const items = [
            {
                label: 'Add to board',
                callback: () => events.publishEvent(MODULE_AUTO_ADD, {
                    model: this.props.module
                } as ModuleEvent),
                selector: 'add-module'
            },
            {
                label: 'Info',
                callback: () => events.publishEvent(MODULE_INFO, this.props.module)
            },
        ];

        if (userController
            .getUser()
            .isFeatureEnabled(FeatureFlag.UPVERTER_MODULE_EDIT)) {
            items.push({
                label: 'Open Module',
                callback: () => openModuleDataView(this.props.module, !this.props.module.sku),
                selector: 'view-module-data'
            });
        }

        if (this.props.module.isCustomerModule()) {
            items.push({
                label: 'Bus to Pin Mapping',
                callback: () => openModuleBusPinMappingView(this.props.module, 0),
                selector: 'module-bus-pin-mapping'
            });
        }

        openContext(event, items);
    }

    private onClick(): void {
        events.publishEvent(MODULE_TILE_CLICK, this.props.module);
    }

    private deleteClick(event): void {
        this.setState({deleteSelected: true});
        event.stopPropagation();
    }

    private deleteConfirmed(event, module: Module): void {
        const gateway = getCustomerModuleGateway();
        const deleteModule = gateway.deleteCustomizedModule(module.moduleId);
        deleteModule.done(() => {
            events.publishEvent(CUSTOMIZED_MODULE_DELETE, {
                model: module
            } as ModulePlacementEvent);
        }).fail(() => {
            errorHandler.onFail;
        });
        event.stopPropagation();
    }

    private hideDevMugrForEngineering(): boolean {
        const module = this.props.module;
        const showDev = module.isDev() && !module.isStable();
        const showMugr = module.isRestricted() && userController.getUser().isEngineer();
        const showInactive = module.isExpired();
        const hideFlagEnabled = UserController.getUser().isLoggedIn() && UserController.getUser().isFeatureEnabled(EngineeringToolFlag.MODULE_DEV_MUGR_HIDE);
        return hideFlagEnabled && (showDev || showMugr || showInactive);
    }
}
