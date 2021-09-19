import * as sanitizeHtml from "../../node_modules/sanitize-html/dist/sanitize-html.min";
import {whitelistedAttr, whitelistedTags} from "./SvgXmlWhitelist";

export class SvgCleaner {

    public clean(dirtySvg: string,
                 callback: (error: Error, cleanSvgString?: string) => void): void {
        const sanitizedSvg = this.sanitize(dirtySvg);
        const svgEl = this.convertToSVGSVGElement(sanitizedSvg);
        if (null === svgEl) {
            callback(new Error('File format error.'));
            return;
        }
        if (!this.isValidSvgVersion(svgEl)) {
            callback(new Error('Invalid SVG version'));
            return;
        }
        callback(null, $('<div>').append($(this.convertToBlack(svgEl))).clone().html());
    }

    private convertToSVGSVGElement(svgString: string): SVGSVGElement {
        const $el = $(svgString);
        if ($el.length < 1) {
            return null;
        }
        const svgEl = $el[0];
        if (svgEl instanceof SVGSVGElement) {
            return svgEl;
        }
        return null;
    }

    private sanitize(dirtySvg: string): string {
        return sanitizeHtml(dirtySvg, {
            allowedTags: whitelistedTags,
            allowedAttributes: {
                '*': whitelistedAttr
            },
            nonTextTags: ['title', 'metadata', 'style'],
            parser: {
                xmlMode: true,
                lowerCaseTags: false
            }
        })
    }

    private convertToBlack(svgEl: SVGSVGElement): SVGSVGElement {
        $(svgEl).find('*').css({
            fill: '#000',
            opacity: 1
        });
        $(svgEl).find('*').each((index, element) => {
            const $el = $(element);
            if ($el.attr('stroke') ||
                ($el.css('stroke') && $el.css('stroke') !== 'none')) {
                $el.css({ stroke: '#000' });
            }
        });
        return svgEl;
    }

    private isValidSvgVersion(svgEl: SVGSVGElement): boolean {
        const validVersions = ['1.1'];
        const version = svgEl.getAttribute('version');
        return validVersions.indexOf(version) >= 0;
    }
}