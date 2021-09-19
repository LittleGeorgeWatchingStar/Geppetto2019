import * as $ from 'jquery';
import * as React from 'react';
import * as Backbone from 'backbone';
import * as ReactDOM from 'react-dom';
import events from "../utils/events";
import {SELECT_REQUIRE} from "../bus/events";


export interface ContextMenuItem {
    /**
     *  The text content of the item.
     */
    label: string;

    /**
     * The operation to perform when the item is selected.
     */
    callback: () => void;

    /**
     * The CSS selector of the item that corresponds to a Glyphicon.
     * If empty, defaults to the label in lower-case.
     */
    selector?: string;
}

let menu = null;

/**
 * @param event: The contextmenu interaction event.
 * @param menuItems: The options to display in the menu.
 */
export function openContext(event,
                            menuItems: ContextMenuItem[]): void {
    if (menu) {
        menu.remove();
    }
    menu = new ContextMenu(event, menuItems);
    $('body').append(menu.$el);
}

export function closeContext(): void {
    if (menu) {
        menu.remove();
        menu = null;
    }
}

/**
 * The context menu is the menu of options you get when you right-click
 * on something. Displays and positions ContextMenuItems.
 */
export class ContextMenu extends Backbone.View<any> {

    constructor(private readonly event,
                private readonly items: ContextMenuItem[]) {
        super();

        this.checkClose = this.checkClose.bind(this);
        $(document).on('mousedown', this.checkClose);
        this.listenTo(events, SELECT_REQUIRE, this.remove);

        const removeFunc = () => {
            document.removeEventListener('scroll', removeFunc, true);
            this.remove();
        };
        document.addEventListener('scroll', removeFunc, true);

        this.setContext();

        // Disable the default browser context menu.
        event.preventDefault();
        event.stopPropagation();
    }

    /**
     * Only close the context menu on left click, to avoid conflicts
     * with the contextmenu right click event closing itself.
     */
    private checkClose(event): void {
        const isLeftClick = event.which === 1;
        if (isLeftClick) {
            this.remove();
        }
    }

    private setContext(): void {
        const event = this.event;
        const element = (
            <div className="contextmenu"
                 onContextMenu={e => e.preventDefault()}
                 style={{
                     top: event.pageY,
                     left: event.pageX
                 }}>
                <ul className="contextmenu__item-list">
                    {this.clickableItems}
                </ul>
            </div>
        );
        ReactDOM.render(element, this.$el[0]);
    }

    private get clickableItems(): JSX.Element[] {
        return this.items.map(i =>
            <li className={i.selector || i.label.toLowerCase()}
                key={i.label}
                onMouseDown={e => {
                    if (e.nativeEvent.which !== 1) return;
                    i.callback();
                    this.remove();
                    e.stopPropagation();
                    e.preventDefault();
                }}>
                {i.label}
            </li>);
    }

    remove() {
        $(document).off('mousedown', this.checkClose);
        menu = null;
        return super.remove();
    }
}
