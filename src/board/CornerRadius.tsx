import * as React from "react";
import {Board} from "../model/Board";
import {Workspace} from "../workspace/Workspace";
import {CHANGE_RADIUS, RadiusChangeEvent} from "../view/events";
import events from "../utils/events";
import {openContext} from "../view/ContextMenu";
import eventDispatcher from "../utils/events";
import {TOGGLE_CORNER_RADIUS_LOCK} from "../design/events";
import {Point} from "../utils/geometry";

export enum ActionKeyCode {
    UP_ARROW = 38,
    DOWN_ARROW = 40,
}

export const CORNER_RADIUS_CONVERSION_RATIO = 10; // 0.1mm = 1 'Geppetto unit'

interface CornerRadiusProps {
    board: Board;
    workspace: Workspace;
    updateBoardRadius: (r: number) => void;
    actionApplied: boolean;
}

interface CornerRadiusState {
    isLocked: boolean;
    radius: number;
    boardSize: { x: number, y: number };
    workspaceScale: number;
}

export class CornerRadius extends React.Component<CornerRadiusProps, CornerRadiusState> {
    containerRef;
    private mouseTracking: Point;

    constructor(props: CornerRadiusProps) {
        super(props);
        this.state = {
            isLocked: this.props.board.isRadiusLocked(),
            radius: this.props.board.getCornerRadius(),
            boardSize: {x: this.props.board.getWidth(), y: this.props.board.getHeight()},
            workspaceScale: this.props.workspace.scale,
        }
        this.containerRef = React.createRef();
    }

    componentDidMount() {
        this.initialRadiusCheck();
        this.containerRef.current.addEventListener('wheel', this.scrollRadius.bind(this));
        this.containerRef.current.addEventListener('contextmenu', this.contextMenu.bind(this));
    }

    componentWillUnmount() {
        this.containerRef.current.removeEventListener('wheel', this.scrollRadius.bind(this));
        this.containerRef.current.removeEventListener('contextmenu', this.contextMenu.bind(this));
    }

    componentWillReceiveProps(nextProps: Readonly<CornerRadiusProps>, nextContext: any) {
        if (nextProps.board.getWidth() !== this.state.boardSize.x || nextProps.board.getHeight() !== this.state.boardSize.y) {
            this.initialRadiusCheck();
            this.setState({boardSize: {x: nextProps.board.getWidth(), y: nextProps.board.getHeight()}});
        }
        if (nextProps.workspace.scale !== this.state.workspaceScale) {
            this.props.updateBoardRadius(this.state.radius * nextProps.workspace.scale);
            this.setState({workspaceScale: nextProps.workspace.scale});
        }
        if (nextProps.board.getCornerRadius() !== this.state.radius && this.props.actionApplied) {
            this.setState({radius: nextProps.board.getCornerRadius()});
        }
    }

    render() {
        const position = this.renderPosition();
        const radiusLocked = this.state.isLocked;

        return (
            <div className={`radius ${radiusLocked ? 'locked-js' : ''}`} style={position} title="Adjust corner radius"
                 ref={this.containerRef}>
                <div className="radius-handle-container" onDragStart={this.adjustRadiusStart}
                     onMouseDown={this.adjustRadiusMouseDown}>
                    <div className="radius-handle"/>
                    <div className="radius-handle corner"/>
                </div>
                <div className={`radius-display ${radiusLocked ? 'radius-locked' : ''}`}
                     onTouchStart={event => this.onTouchContextMenu(event)}>
                    <strong>R:</strong>
                    <label>
                        <input type="number" value={CornerRadius.convertInputDisplay(this.state.radius)}
                               onInput={e => this.newInputRadius(e.currentTarget.value)}
                               onChange={() => null}
                               onKeyPress={event => this.handleInputKey(event)}
                               readOnly={this.state.isLocked}/>
                        mm
                    </label>
                </div>
            </div>
        );
    }

    /**
     * See if the radius is still valid, and adjust accordingly. Eg. if the model dimensions changed.
     */
    private initialRadiusCheck(): void {
        const checkedRadius = this.validateRadius(this.state.radius);
        if (this.state.radius !== checkedRadius) {
            this.setRadius(checkedRadius);
        }
    }

    /**
     * Update via input, allowing one decimal place. 0.1mm = 1 'Geppetto unit'
     */
    private newInputRadius(value: string): void {
        if (this.state.isLocked) return;
        const radius = this.convertInput(value);
        this.setRadius(radius);
    }

    private setRadius(radius: number): void {
        if (this.state.radius !== radius) {
            events.publishEvent(CHANGE_RADIUS, {
                board: this.props.board,
                radius: radius
            } as RadiusChangeEvent);
        }
        this.props.updateBoardRadius(radius * this.props.workspace.scale);
        this.setState({radius: radius});
    }

    private renderPosition(): React.CSSProperties {
        const baseDistance = 60;
        const buffer = 15;
        const relativeSize = this.state.radius / this.props.board.getMaxRadius();
        const scale = this.props.workspace.scale;
        const newPosition = ((baseDistance * relativeSize) - baseDistance) * scale - buffer;
        return {bottom: newPosition, left: newPosition};
    }

    private contextMenu(event): void {
        event.preventDefault();
        event.stopPropagation();
        openContext(event, [{
            label: this.props.board.isRadiusLocked() ? 'unlock' : 'lock',
            callback: () => {
                eventDispatcher.publish(TOGGLE_CORNER_RADIUS_LOCK);
                this.setState({isLocked: !this.state.isLocked});
            }
        }]);
    }

    /**
     * Updates the radius based on dragging for mobile.
     */
    private onTouchContextMenu(event): void {
        openContext(event, [{
            label: this.props.board.isRadiusLocked() ? 'unlock' : 'lock',
            callback: () => {
                eventDispatcher.publish(TOGGLE_CORNER_RADIUS_LOCK);
                this.setState({isLocked: !this.state.isLocked});
            }
        }]);
        if (this.state.isLocked) return;
        this.mouseTracking = new Point(event.touches[0].clientX, event.touches[0].clientY);
        document.addEventListener('touchmove', this.onTouchMove);
        document.addEventListener('touchend', this.onTouchEnd);
    }

    private onTouchMove = event => {
        const startX = this.mouseTracking.x;
        const startY = this.mouseTracking.y;
        const movedX = event.touches[0].clientX - startX;
        const movedY = event.touches[0].clientY - startY;
        if (CornerRadius.minimumTouchDrag(movedX, movedY)) {
            const increment = (movedX - movedY) * 0.1;
            this.incrementRadius(increment);
        }
    }

    private onTouchEnd = event => {
        document.removeEventListener('touchmove', this.onTouchMove);
        document.removeEventListener('touchend', this.onTouchEnd);
    }

    /**
     * Updates the radius based on dragging the handle widget.
     */
    private adjustRadiusStart = event => {
        event.stopPropagation(); // Do not drag workspace
        event.preventDefault();
        if (this.state.isLocked) return;
    }

    private adjustRadiusMouseDown = event => {
        event.preventDefault();
        if (this.state.isLocked) return;
        this.mouseTracking = new Point(event.pageX, event.pageY);
        document.addEventListener('mousemove', this.adjustRadiusMouseMove);
        document.addEventListener('mouseup', this.adjustRadiusMouseUp);
    }

    private adjustRadiusMouseMove = event => {
        const startX = this.mouseTracking.x;
        const startY = this.mouseTracking.y;
        const movedX = event.pageX - startX;
        const movedY = event.pageY - startY;
        const increment = (movedX - movedY) * 0.1;
        this.incrementRadius(increment);
    }

    private adjustRadiusMouseUp = event => {
        document.removeEventListener('mousemove', this.adjustRadiusMouseMove);
        document.removeEventListener('mouseup', this.adjustRadiusMouseUp);
    }

    private scrollRadius(event): void {
        event.preventDefault();
        event.stopPropagation(); // Do not zoom workspace
        if (this.state.isLocked) return;
        const increment = -event.deltaY;
        this.incrementRadius(increment);
    }

    private handleInputKey(event): boolean {
        const keyPressed = event.keyCode;

        const isUpArrowKey = keyPressed === ActionKeyCode.UP_ARROW;
        if (isUpArrowKey) {
            this.incrementRadius(1);
            return false; // Preserve cursor position
        }

        const isDownArrowKey = keyPressed === ActionKeyCode.DOWN_ARROW;
        if (isDownArrowKey) {
            this.incrementRadius(-1);
            return false; // Preserve cursor position
        }
    }

    private incrementRadius(increment: number): void {
        const current = this.state.radius;
        const incremented = this.validateRadius(current + increment);
        this.setRadius(incremented);
    }

    /**
     * Converts mm input to 'Geppetto units'. Eg.
     * '1.2424' -> 12
     * '2.77' -> 28
     * 'dasdjasda' -> 0
     */
    private convertInput(input: string): number {
        const value = parseFloat(input);
        const radius = Math.round(value * CORNER_RADIUS_CONVERSION_RATIO);
        const maxSize = this.props.board.getMaxRadius();

        if (isNaN(value) || value < 0) {
            return 0;
        }
        return Math.min(radius, maxSize);
    }

    private static convertInputDisplay(radius: number): string {
        return (radius / CORNER_RADIUS_CONVERSION_RATIO).toString();
    }

    /**
     * Radius in 'Geppetto units' must be an int,
     * and can't be less than 0 or greater than min(W, H) / 2.
     */
    private validateRadius(radius: number): number {
        const maxSize = this.props.board.getMaxRadius();
        const rounded = Math.round(radius);

        if (radius < 0) {
            return 0;
        }
        return Math.min(rounded, maxSize);
    }

    /**
     * Desensitize touch drag on the handle.
     */
    private static minimumTouchDrag(movedX: number, movedY: number): boolean {
        const minimum = 2;
        return Math.abs(movedX) > minimum || Math.abs(movedY) > minimum;
    }
}