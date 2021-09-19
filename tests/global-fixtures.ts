/**
 * Create the #design DOM node that many classes expect to exist.
 * @deprecated
 */
export function makeDomNodes() {
    $('body').html(`<div id="design" class="test"><div class="anchor-extensions"></div><div id="board"></div></div>`);
}
