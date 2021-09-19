import * as React from "react";
import {CSSProperties, RefObject} from "react";
import {Dimension} from "./Dimension";
import {Subscription} from "rxjs";
import {AnchorExtensionsController} from "./Anchor/AnchorExtension/AnchorExtensionsController";
import {AnchorExtension} from "./Anchor/AnchorExtension/AnchorExtension";
import {DimensionDirection} from "./DimensionController";
import {DimensionEventsController} from "./DimensionEventsController";
import {AnchorEventsController} from "./Anchor/AnchorEventsController";
import {DimensionableEventsController} from "./DimensionableEventsController";
import eventDispatcher from "../utils/events";
import {
    MoveDimensionEvent,
    REMOVE_DIMENSION,
    SET_DIMENSION,
    TOGGLE_DIMENSION_LOCK
} from "./events";
import {DesignController} from "../design/DesignController";
import {openContext} from "../view/ContextMenu";
import {DimensionCollectionEventsController} from "./DimensionCollectionEventsController";

const MAX_DIM_INPUT = 9999;
const MIN_LINE_LENGTH = 20;
const TEXT_LINE_PADDING = 4;
const DIM_BOARD_SPACING = 20;
const DIM_HEIGHT = 30; // Matches with css styles.
const BORDER_WIDTH = 1; // Matches with css styles.

interface DimensionComponentProps {
    workspaceIsDimensioning: boolean;
    workspaceScale: number;

    boardWidth: number;
    boardHeight: number;

    level: number;

    dimension: Dimension;
}

interface DimensionComponentState {
    anchor1Direction: DimensionDirection;
    anchor1X: number | undefined;
    anchor1Y: number | undefined;
    dimensionable1BoardX: number;
    dimensionable1BoardY: number;

    anchor2Direction: DimensionDirection;
    anchor2X: number | undefined;
    anchor2Y: number | undefined;
    dimensionable2BoardX: number;
    dimensionable2BoardY: number;

    measurementComponentWidth: number;
}

export class DimensionComponent
    extends React.Component<DimensionComponentProps, DimensionComponentState> {

    private subscriptions: Subscription[] = [];

    private extension1: AnchorExtension | null = null;
    private extension2: AnchorExtension | null = null;

    constructor(props: DimensionComponentProps) {
        super(props);
        this.state = {
            ...this.fetchAnchor1State(),
            ...this.fetchDimensionable1State(),
            ...this.fetchAnchor2State(),
            ...this.fetchDimensionable2State(),
            measurementComponentWidth: 0,
        };
    }

    private fetchAnchor1State(): Pick<DimensionComponentState, 'anchor1Direction' | 'anchor1X' | 'anchor1Y'> {
        const anchor = this.props.dimension.anchor1;
        return {
            anchor1Direction: anchor.direction,
            anchor1X: anchor.direction === DimensionDirection.VERTICAL ? anchor.x : undefined,
            anchor1Y: anchor.direction === DimensionDirection.HORIZONTAL ? anchor.y : undefined,
        };
    }

    private fetchDimensionable1State(): Pick<DimensionComponentState, 'dimensionable1BoardX' | 'dimensionable1BoardY'> {
        const dimensionable = this.props.dimension.anchor1.dimensionable;
        return {
            dimensionable1BoardX: dimensionable.boardPosition.x,
            dimensionable1BoardY: dimensionable.boardPosition.y,
        };
    }

    private fetchAnchor2State(): Pick<DimensionComponentState, 'anchor2Direction' | 'anchor2X' | 'anchor2Y'> {
        const anchor = this.props.dimension.anchor2;
        return {
            anchor2Direction: anchor.direction,
            anchor2X: anchor.direction === DimensionDirection.VERTICAL ? anchor.x : undefined,
            anchor2Y: anchor.direction === DimensionDirection.HORIZONTAL ? anchor.y : undefined,
        };
    }

    private fetchDimensionable2State(): Pick<DimensionComponentState, 'dimensionable2BoardX' | 'dimensionable2BoardY'> {
        const dimensionable = this.props.dimension.anchor2.dimensionable;
        return {
            dimensionable2BoardX: dimensionable.boardPosition.x,
            dimensionable2BoardY: dimensionable.boardPosition.y,
        };
    }

    public componentDidMount(): void {
        this.subscriptions.push(
            AnchorEventsController.getInstance()
                .subscribe(this.props.dimension.anchor1, () => {
                    this.setState(this.fetchAnchor1State);
                })
        );

        this.subscriptions.push(
            DimensionableEventsController.getInstance()
                .subscribe(this.props.dimension.anchor1.dimensionable, () => {
                    this.setState(this.fetchDimensionable1State);
                })
        );

        this.subscriptions.push(
            AnchorEventsController.getInstance()
                .subscribe(this.props.dimension.anchor2, () => {
                    this.setState(this.fetchAnchor2State);
                })
        );

        this.subscriptions.push(
            DimensionableEventsController.getInstance()
                .subscribe(this.props.dimension.anchor2.dimensionable, () => {
                    this.setState(this.fetchDimensionable2State);
                })
        );
    }

    public componentWillUnmount(): void {
        this.subscriptions.forEach(
            subscription => subscription.unsubscribe());
        this.subscriptions = [];

        if (this.extension1) {
            AnchorExtensionsController.getInstance().removeExtension(this.extension1);
        }
        if (this.extension2) {
            AnchorExtensionsController.getInstance().removeExtension(this.extension2);
        }
    }

    private onContextMenu(event): void {
        const dispatch = event => eventDispatcher.publishEvent(event, {model: this.props.dimension});
        const items = [
            {
                label: 'Delete',
                callback: () => dispatch(REMOVE_DIMENSION),
            },
            {
                label: this.props.dimension.isLocked() ? 'Unlock' : 'Lock',
                callback: () => dispatch(TOGGLE_DIMENSION_LOCK),
            }
        ];
        openContext(event, items);
    }

    private onMouseOver(): void {
        if (this.extension1 === null) {
            this.extension1 = AnchorExtensionsController.getInstance().addExtension(this.props.dimension.anchor1);
        }
        if (this.extension2 === null) {
            this.extension2 = AnchorExtensionsController.getInstance().addExtension(this.props.dimension.anchor2);
        }
    }

    private onMouseLeave(): void {
        if (this.extension1) {
            AnchorExtensionsController.getInstance().removeExtension(this.extension1);
            this.extension1 = null;
        }
        if (this.extension2) {
            AnchorExtensionsController.getInstance().removeExtension(this.extension2);
            this.extension2 = null;
        }
    }

    private get anchorDirection(): DimensionDirection {
        return this.state.anchor1Direction;
    }

    private get dimensionLength(): number {
        switch (this.anchorDirection) {
            case DimensionDirection.HORIZONTAL:
                const anchor1BoardY = this.state.dimensionable1BoardY + this.state.anchor1Y;
                const anchor2BoardY = this.state.dimensionable2BoardY + this.state.anchor2Y;
                return anchor2BoardY - anchor1BoardY;

            case DimensionDirection.VERTICAL:
                const anchor1BoardX = this.state.dimensionable1BoardX + this.state.anchor1X;
                const anchor2BoardX = this.state.dimensionable2BoardX + this.state.anchor2X;
                return anchor2BoardX - anchor1BoardX;

            default:
                throw new Error('Invalid dimension direction');
        }
    }

    private get dimensionAbsLength(): number {
        return Math.abs(this.dimensionLength);
    }

    /**
     * Width of the dimension component on the screen.
     */
    private get componentWidth(): number {
        /**
         * Add the border to length so that the borders line up with adjacent
         * dimension borders.
         */
        return this.dimensionAbsLength * this.props.workspaceScale + BORDER_WIDTH;
    }

    /**
     * Width of the measurement component on the screen.
     */
    private get measurementWidth(): number {
        return this.state.measurementComponentWidth;
    }

    private onMeasurementWidthChange(width: number): void {
        this.setState({
            measurementComponentWidth: width,
        });
    }

    /**
     * Width of the lines of the arrows on the screen.
     */
    private get lineWidth(): number {
        return (this.componentWidth - this.measurementWidth) / 2 - TEXT_LINE_PADDING - BORDER_WIDTH;
    }

    public renderHorizontal(): React.ReactNode {
        // TODO: Don't use JQuery, pass in board ref as prop.
        const $board = $('#board');
        if (!$board.position()) {
            return null;
        }
        const boardBottom = $board.position().top + this.props.boardHeight * this.props.workspaceScale;
        const boardRight = $board.position().left + this.props.boardWidth * this.props.workspaceScale;

        const isVisible = this.props.workspaceIsDimensioning;
        const style = {
            display: isVisible ? 'block' : 'none',
        };

        // Component position.
        const anchor1BoardY = this.state.dimensionable1BoardY + this.state.anchor1Y;
        const anchor2BoardY = this.state.dimensionable2BoardY + this.state.anchor2Y;
        style['height'] = this.componentWidth;
        style['left'] = boardRight + (DIM_BOARD_SPACING + this.props.level * DIM_HEIGHT);
        style['top'] = boardBottom - Math.max(anchor1BoardY, anchor2BoardY) * this.props.workspaceScale;

        // Arrow/line positions.
        const topStyle = {};
        const topLineStyle = {};
        const bottomStyle = {};
        const bottomLineStyle = {};
        if (this.lineWidth >= MIN_LINE_LENGTH) {
            topLineStyle['height'] = this.lineWidth;
            bottomLineStyle['height'] = this.lineWidth;
        } else {
            topStyle['top'] = this.componentWidth;
            bottomStyle['bottom'] = this.componentWidth;
        }

        // Text position.
        const measurementStyle = {};
        if (this.componentWidth < this.measurementWidth + TEXT_LINE_PADDING * 2) {
            measurementStyle['transform'] = `rotate(-90deg) translate(${-((this.measurementWidth + this.componentWidth) / 2 + MIN_LINE_LENGTH + TEXT_LINE_PADDING)}px)`;
        } else {
            measurementStyle['transform'] = `rotate(-90deg)`;
        }

        return (
            <div className={'dimension horizontal'}
                 style={style}
                 onContextMenu={(event) => this.onContextMenu(event)}
                 onMouseOver={() => this.onMouseOver()}
                 onMouseOut={() => this.onMouseLeave()}>
                <div className="measurement-wrapper">
                    <MeasurementComponent dimension={this.props.dimension}
                                          style={measurementStyle}
                                          onWidthChange={width => this.onMeasurementWidthChange(width)}/>
                </div>
                <div className="top"
                     style={topStyle}>
                    <div className="line"
                         style={topLineStyle}/>
                    <div className="arrow"/>
                </div>
                <div className="bottom"
                     style={bottomStyle}>
                    <div className="line"
                         style={bottomLineStyle}/>
                    <div className="arrow"/>
                </div>
            </div>
        );
    }

    public renderVertical(): React.ReactNode {
        // TODO: Don't use JQuery, pass in board ref as prop.
        const $board = $('#board');
        if (!$board.position()) {
            return null;
        }
        const boardTop = $board.position().top;
        const boardLeft = $board.position().left;

        const isVisible = this.props.workspaceIsDimensioning;
        const style = {
            display: isVisible ? 'block' : 'none',
        };

        // Component position.
        const anchor1BoardX = this.state.dimensionable1BoardX + this.state.anchor1X;
        const anchor2BoardX = this.state.dimensionable2BoardX + this.state.anchor2X;
        style['width'] = this.componentWidth;
        style['left'] = boardLeft + Math.min(anchor1BoardX, anchor2BoardX) * this.props.workspaceScale;
        style['top'] = boardTop - (DIM_BOARD_SPACING + (this.props.level + 1) * DIM_HEIGHT);

        // Arrow/line positions.
        const leftStyle = {};
        const leftLineStyle = {};
        const rightStyle = {};
        const rightLineStyle = {};
        if (this.lineWidth >= MIN_LINE_LENGTH) {
            leftLineStyle['width'] = this.lineWidth;
            rightLineStyle['width'] = this.lineWidth;
        } else {
            leftStyle['left'] = this.componentWidth;
            rightStyle['right'] = this.componentWidth;
        }

        // Text position.
        const measurementStyle = {};
        if (this.componentWidth < this.measurementWidth + TEXT_LINE_PADDING * 2) {
            measurementStyle['transform'] = `translate(${-((this.measurementWidth + this.componentWidth) / 2 + MIN_LINE_LENGTH + TEXT_LINE_PADDING)}px)`;
        }

        return (
            <div className={'dimension vertical'}
                 style={style}
                 onContextMenu={(event) => this.onContextMenu(event)}
                 onMouseOver={() => this.onMouseOver()}
                 onMouseOut={() => this.onMouseLeave()}>
                <div className="measurement-wrapper">
                    <MeasurementComponent dimension={this.props.dimension}
                                          style={measurementStyle}
                                          onWidthChange={width => this.onMeasurementWidthChange(width)}/>
                </div>
                <div className="left"
                     style={leftStyle}>
                    <div className="line"
                         style={leftLineStyle}/>
                    <div className="arrow"/>
                </div>
                <div className="right"
                     style={rightStyle}>
                    <div className="line"
                         style={rightLineStyle}/>
                    <div className="arrow"/>
                </div>
            </div>
        );
    }

    public render(): React.ReactNode {
        switch (this.anchorDirection) {
            case DimensionDirection.HORIZONTAL:
                return this.renderHorizontal();
            case DimensionDirection.VERTICAL:
                return this.renderVertical();
            default:
                return null;
        }
    }
}


const TEXT_BOX_WIDTH = 46; // Matches with css styles.
const LOCK_ICON_WIDTH = 16; //Matches with css styles.

interface MeasurementComponentProps {
    dimension: Dimension;
    style: CSSProperties;
    onWidthChange: (width: number) => void;
}

interface MeasurementComponentState {
    userInput?: string;
    dimensionIsLocked: boolean;
    dimensionCanResize: boolean;
}

class MeasurementComponent
    extends React.Component<MeasurementComponentProps, MeasurementComponentState> {
    private subscriptions: Subscription[] = [];

    private readonly el: RefObject<HTMLDivElement>;
    private readonly inputEl: RefObject<HTMLInputElement>;

    constructor(props:MeasurementComponentProps) {
        super(props);

        this.el = React.createRef<HTMLDivElement>();
        this.inputEl = React.createRef<HTMLInputElement>();

        this.state = {
            ...this.fetchDimensionState(),
        };
    }

    private fetchDimensionState(): Pick<MeasurementComponentState, 'dimensionIsLocked' | 'dimensionCanResize'> {
        const isLocked = this.props.dimension.isLocked();
        const canResize = this.props.dimension.canResize();

        this.props.onWidthChange(this.calculateWidth(canResize));

        return {
            dimensionIsLocked: isLocked,
            dimensionCanResize: canResize,
        };
    }

    public componentDidMount(): void {
        this.subscriptions.push(
            DimensionCollectionEventsController.getInstance()
                .subscribe(() => {
                    this.setState(this.fetchDimensionState);
                })
        );

        this.subscriptions.push(
            DimensionEventsController.getInstance()
                .subscribeAll(() => {
                    this.setState(this.fetchDimensionState);
                })
        );

        /** Browser's change event behaves differently than the React's one for some
         *  reason (React's change event is when the input is changed, while
         *  Browser's is when input is changed, and enter is pressed or input is
         *  unfocused). Browser's change event behaviour is what we want.
         */
        this.inputEl.current.addEventListener('change', this.setDimension);
    }

    public componentWillUnmount(): void {
        this.subscriptions.forEach(
            subscription => subscription.unsubscribe());
        this.subscriptions = [];

        this.inputEl.current.removeEventListener('change', this.setDimension);
        $(this.el.current).remove_tooltip();
    }

    private setDimension = (): void => {
        const userInput = this.state.userInput;
        if (userInput && !Number.isNaN(Number(userInput))) {
            const length = Math.min(MAX_DIM_INPUT, Math.round(Number(userInput) * 10));

            eventDispatcher.publishEvent(SET_DIMENSION, {
                designRevision: DesignController.getCurrentDesign(),
                dimensionUUID: this.props.dimension.uuid,
                length: length,
            } as MoveDimensionEvent);

        }

        this.setState({
            userInput: undefined,
        });
    };

    private onChangeMeasurement(userInput: string): void {
            this.setState({
                userInput: userInput,
            });
    }

    private onMouseOverMeasurement(): void {
        if (this.state.dimensionIsLocked) {
            return;
        }

        if (!this.el.current) {
            return;
        }

        if (!this.state.dimensionCanResize) {
            const tooltip = this.props.dimension.isSelfDimension()
                ? 'This dimension is implicitly locked.'
                : 'This dimension is implicitly locked as other dimensions constrain movement in this direction.';
            $(this.el.current).add_tooltip(tooltip);
        }
    }

    private onMouseLeaveMeasurement(): void {
        $(this.el.current).remove_tooltip();
    }

    private calculateWidth(canBeResized: boolean): number {
        return TEXT_BOX_WIDTH + (!canBeResized ? LOCK_ICON_WIDTH : 0);
    }

    public render(): React.ReactNode {
        const classes = ['measurement'];
        if (!this.state.dimensionIsLocked && !this.state.dimensionCanResize) {
            classes.push('implicitly-locked');
        }

        const measurement = this.state.userInput != undefined ?
            this.state.userInput :
            (this.props.dimension.absLength / 10).toFixed(1);

        return (
            <div ref={this.el}
                 className={classes.join(' ')}
                 style={this.props.style}>
                {!this.state.dimensionCanResize &&
                    <span className="can-resize-icon"/>
                }
                <input ref={this.inputEl}
                       pattern="[0-9]*(.[0-9]*)?"
                       value={measurement}
                       readOnly={!this.state.dimensionCanResize}
                       onChange={(event) => this.onChangeMeasurement(event.target.value)}
                       onMouseOver={() => this.onMouseOverMeasurement()}
                       onMouseLeave={() => this.onMouseLeaveMeasurement()}/>
            </div>
        );
    }
}