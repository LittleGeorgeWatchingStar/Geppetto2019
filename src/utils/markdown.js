/**
 * markdown wrapper class
 *
 * Any customizations needed to be made to marked cna be made here, and we
 * pass the modified marked through
 */
import * as markdown from 'marked';

/*
 * Custom rule to make inline link style []()
 * with a space between also works [] ().
 */
markdown.prototype.constructor.Parser.prototype.parse = function (src) {
    this.inline = new markdown.InlineLexer(src.links, this.options, this.renderer);
    //custom rule/syntax
    this.inline.rules.link = /^[!@]?\[((?:\[[^\]]*\]|[^\[\]]|\](?=[^\[]*\]))*)\]\s?\(\s*<?([\s\S]*?)>?(?:\s+['"]([\s\S]*?)['"])?\s*\)/;
    this.tokens = src.reverse();

    var out = '';
    while (this.next()) {
        out += this.tok();
    }

    return out;
};

const custom_renderer = new markdown.Renderer();
custom_renderer.link = (href, title, text) => {
    "use strict";

    let out = "<a href=\"" + href + "\"";
    out += ' target="_blank"';
    if (title) {
        out += " title=\"" + title + "\"";
    }
    return out + ">" + text + "</a>";
};
markdown.setOptions({renderer: custom_renderer});

export default markdown
