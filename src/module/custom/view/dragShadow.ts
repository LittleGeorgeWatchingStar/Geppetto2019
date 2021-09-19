/**
 * Helper that creates a drag shadow of an element for HTML5 drag events.
 *
 * For Firefox, the drop element should be set to prevent a "drag failed" animation.
 * https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API/Drag_operations#droptargets
 */
export function createDragShadow(event): void {
    const pin = event.target as HTMLElement;
    const rect = event.target.getBoundingClientRect();
    const x =  event.pageX - rect.left;
    const y = event.pageY - rect.top;
    event.dataTransfer.setData('text', ''); // Required for Firefox.
    event.dataTransfer.dropEffect = 'move';
    event.dataTransfer.setDragImage(pin, x, y);
    event.dataTransfer.effectAllowed = 'move';
}
