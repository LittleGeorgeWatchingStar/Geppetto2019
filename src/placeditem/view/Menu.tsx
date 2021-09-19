import * as Backbone from "backbone";
import * as $ from "jquery";
import events from "../../utils/events";
import {SELECT_REQUIRE} from "../../bus/events";
import * as ReactDOM from "react-dom";
import * as React from "react";
import {PlacedItem} from "../PlacedItem";
import {ContextMenuItem} from "../../view/ContextMenu";
import {MoveBlock, RotateBlock} from "../actions";


let menu: BlockMenu = null;

/**
 * @param anchorNode: The HTMLElement on which this context menu was triggered.
 * @param menuItems: The options to display in the menu.
 */
export function openBlockMenu(anchorNode: HTMLElement,
                              menuItems: ContextMenuItem[],
                              model: PlacedItem): void {
    if (menu) {
        menu.remove();
    }
    menu = new BlockMenu(anchorNode, menuItems, model);
    $('body').append(menu.$el);
    menu.render();
}

export function toggleBlockOptions(): boolean {
    if (menu) {
        return true;
    }
    return false;
}

export function closeBlockMenu(): void {
    if (menu) {
        menu.remove();
        menu = null;
    }
}

/**
 * The menu that you get from left-clicking or touching a placed Geppetto block.
 */
export class BlockMenu extends Backbone.View<any> {

    constructor(private readonly anchorNode: HTMLElement,
                private readonly menuItems: ContextMenuItem[],
                readonly model: PlacedItem) {
        super();
        this.checkClose = this.checkClose.bind(this);
        $(document).on('mousedown', this.checkClose);
        this.listenTo(events, SELECT_REQUIRE, closeBlockMenu);
    }

    public render() {
        const element = (
            <div className="contextmenu contextmenu--horizontal"
                 onContextMenu={e => e.preventDefault()}>
                <div className="pointer up"/>
                <div className="contextmenu__list-header">
                    <div>{this.model.name}</div>
                </div>
                <div className="contextmenu__item-list">
                    <div>
                        <ul>
                            {this.menuItems.map(i => this.getSelectableItem(i, false))}
                        </ul>
                    </div>
                    {this.movementItems}
                </div>
                <div className="pointer down"/>
            </div>
        );
        ReactDOM.render(element, this.el);
        this.positionMenu();
        return this;
    }

    private get movementItems(): JSX.Element | null {
        return (
            <div className="movement-item-container">
                <div className={"block-tool-container"}>
                    <span className={"label"}>
                        <b>Rot: {this.model.rotation}°</b>
                    </span>
                    <ul>{this.getSelectableItem(this.rotateItem, !this.model.canBeRotated(), true)}</ul>
                </div>
                <div className={"block-tool-container"}>
                    <span className={"label"}>
                        <b>Move to</b>
                    </span>
                    <ul>
                        {this.getSelectableItem(this.boardEdgeItem, this.model.isOnEdge)}
                        {this.getSelectableItem(this.cornerItem, this.model.isInCorner)}
                    </ul>
                </div>
            </div>
        );
    }

    private get rotateItem(): ContextMenuItem {
        return {label: '90°', callback: () => RotateBlock.addToStack(this.model), selector: 'rotate'};
    }

    private get boardEdgeItem(): ContextMenuItem {
        return {
            label: 'Board edge',
            callback: () => MoveBlock.toBoardEdge(this.model),
            selector: 'fit-edge'
        };
    }

    private get cornerItem(): ContextMenuItem {
        return {
            label: 'Corner',
            callback: () => MoveBlock.toBoardCorner(this.model),
            selector: 'fit-corner'
        };
    }

    private checkClose(event): void {
        if (!this.el.contains(event.target) &&
            !this.anchorNode.contains(event.target)) {
            closeBlockMenu();
        }
    }

    private positionMenu(): void {
        const refreshPosition = () => {
            this.$('.contextmenu').position({
                my: 'bottom',
                at: 'top',
                of: this.anchorNode
            });
        };
        refreshPosition();
        const isFlipped = this.$('.contextmenu').offset().top < $(this.anchorNode).offset().top;
        this.$('.up').toggle(!isFlipped);
        this.$('.down').toggle(isFlipped);
        // Refresh position again due to DOM dimensions changing.
        refreshPosition();
    }

    private getSelectableItem(i: ContextMenuItem, isDisabled: boolean, rerender = false): JSX.Element {
        const selector = i.selector || i.label.toLowerCase();
        const onSelect = e => {
            if (e.nativeEvent.which !== 1) return;
            i.callback();
            e.stopPropagation();
            if (rerender) {
                this.render();
            } else {
                closeBlockMenu();
            }
        };
        return (
            <li className={`${selector} ${isDisabled ? 'disabled-js' : ''}`}
                key={i.label}
                onMouseDown={onSelect}>
                {i.label !== 'Delete' && i.label}
            </li>
        );
    }

    remove() {
        $(document).off('mousedown', this.checkClose);
        ReactDOM.unmountComponentAtNode(this.el);
        return super.remove();
    }
}
