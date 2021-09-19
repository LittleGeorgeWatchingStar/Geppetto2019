import {Workspace} from "../../workspace/Workspace";
import {RefObject} from "react";
import * as $ from "jquery";
import events from "../../utils/events";
import {MODULE_TILE_DRAG_START} from "../../module/events";
import {Outline} from "../../module/feature/footprint";


/**
 * Shared functionality between ModuleTile and PseudoModuleTile.
 */
export class LibraryTile {

    constructor(
        private readonly workspace: Workspace,
        private readonly draggableElement: RefObject<HTMLElement>,
        private readonly SVGContainer: RefObject<HTMLElement>,
        private readonly outline: Outline,
        private readonly onDragStart: () => void,
        private readonly onDragStop: () => void
    ) {
    }

    public setupDraggable(): void {
        $(this.draggableElement.current).draggable({
            scroll: false,
            appendTo: $('body'),
            cursorAt: {left: 20, top: 10},
            start: () => {
                this.onDragStart();
                events.publish(MODULE_TILE_DRAG_START);
            },
            stop: (event, ui) => {
                ui.helper.remove();
                this.onDragStop();
            },
            helper: () => this.dragHelper(),
            distance: 5 // Desensitize touch drag
        });
    }

    public onDestroy(): void {
        $(this.draggableElement.current).draggable('destroy');
    }

    /**
     * Create a JQuery drag helper DOM node.
     *
     * @see http://api.jqueryui.com/draggable/#option-helper
     */
    private dragHelper(): JQuery {
        // TODO we could probably consider passing in just the scale by itself here...
        const scale = this.workspace.scale;
        const view = $(this.SVGContainer.current).clone();

        $(view).css({
            width: this.outline.width * scale,
            height: this.outline.height * scale,
            zIndex: 10000
        });

        if ($(view).get(0).querySelector('.ortho-image')) {
            $(view).get(0).querySelector('.ortho-image').setAttribute(
                'style', `width: ${this.outline.width * scale}px; height: ${this.outline.height * scale}px;`);
        }

        return view;
    }
}
