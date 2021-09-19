import {SvgCleaner} from "../../src/logo/SvgCleaner";

describe("SvgCleaner", function() {


    it("returns svg xml string",function () {
        const testSvg = `<?xml version="1.0" encoding="utf-8"?>
<!-- Generator: Adobe Illustrator 19.2.1, SVG Export Plug-In . SVG Version: 6.00 Build 0)  -->
<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"
	 viewBox="0 0 512 512" style="enable-background:new 0 0 512 512;" xml:space="preserve">
    <style type="text/css">
        .st0{fill:#9C1ACE;}
    </style>
    <g id="glyphicons_x5F_halflings">
        <g id="map-marker">
            <path class="st0" d="M449.8,194.3c0,36.8-12.2,75.5-30.3,112.7c-68.4,106.2-154.8,203.5-154.8,203.5s-99.4-94-163-205.5
                c-15.9-34.8-26.3-71.6-26.3-108.5C75.3,93,159.1,3,262.5,3C366,3,449.8,90.7,449.8,194.3z M360.8,184.6
                c0-53.4-43.2-96.6-96.5-96.6c-53.3,0-96.5,43.2-96.5,96.6c0,53.4,43.2,96.5,96.5,96.5C317.6,281.1,360.8,238,360.8,184.6z"/>
        </g>
    </g>
    <g id="Layer_2">
    </g>
</svg>`;
        const svgCleaner = new SvgCleaner();
        const dirtySvg = testSvg;
        let error = null;
        let cleanSvg = undefined;
        svgCleaner.clean(dirtySvg, (callbackError, cleanSvgString) => {
            error = callbackError;
            cleanSvg = cleanSvgString;
        });
        expect(error).toEqual(null);
        expect($(cleanSvg)[0]).toEqual(jasmine.any(SVGSVGElement));

    });

    it("returns error message if string cannot be converted to SVGSVGElement", function () {
        const testSvg = '<g><path></path></g>';
        const svgCleaner = new SvgCleaner();
        const dirtySvg = testSvg;
        let error = null;
        let cleanSvg = undefined;
        svgCleaner.clean(dirtySvg, (callbackError, cleanSvgString) => {
            error = callbackError;
            cleanSvg = cleanSvgString;
        });
        expect(error).toEqual(jasmine.any(Error));
        expect(error.message).toEqual('File format error.');
        expect(cleanSvg).toEqual(undefined);
    });

    it("returns error message if svg version is invalid", function () {
        const testSvg = '<svg version="1.0"><g></g><script></script><img></svg>';
        const svgCleaner = new SvgCleaner();
        const dirtySvg = testSvg;
        let error = null;
        let cleanSvg = undefined;
        svgCleaner.clean(dirtySvg, (callbackError, cleanSvgString) => {
            error = callbackError;
            cleanSvg = cleanSvgString;
        });
        expect(error).toEqual(jasmine.any(Error));
        expect(error.message).toEqual('Invalid SVG version');
        expect(cleanSvg).toEqual(undefined);
    });

    it("removes non whitelisted svg tags", function() {
        const testSvg = '<svg version="1.1"><g></g><script></script><img></svg>';
        const svgCleaner = new SvgCleaner();
        const dirtySvg = testSvg;
        let error = null;
        let cleanSvg = undefined;
        svgCleaner.clean(dirtySvg, (callbackError, cleanSvgString) => {
            error = callbackError;
            cleanSvg = cleanSvgString;
        });
        expect(error).toEqual(null);
        expect($(cleanSvg).find('script').length).toEqual(0);
        expect($(cleanSvg).find('img').length).toEqual(0);
    });

    it("removes non whitelisted svg attributes", function() {
        const testSvg = `<svg version="1.1"><g src="javascript:alert('PWED');"></g></svg>`;
        const svgCleaner = new SvgCleaner();
        const dirtySvg = testSvg;
        let error = null;
        let cleanSvg = undefined;
        svgCleaner.clean(dirtySvg, (callbackError, cleanSvgString) => {
            error = callbackError;
            cleanSvg = cleanSvgString;
        });
        expect(error).toEqual(null);
        expect($(cleanSvg).find('*').attr('src')).toEqual(undefined);

    });

});