import {ReconnectionLogger} from "../../src/connection/ConnectionMapper";
import {PlacedModuleBuilder} from "../placedmodule/PlacedModuleBuilder";
import {busResource} from "../bus/TestBus";
import {ModuleBuilder} from "../module/ModuleBuilder";

describe("ReconnectionLogger", function () {

    function getLogger() {
        return new ReconnectionLogger('A Dialog Title');
    }
    
    function makeRequire(name: string) {
        const module = new ModuleBuilder().withName('Woawo').build();
        const placedModule = new PlacedModuleBuilder().withModule(module).build();
        return placedModule.addRequire(busResource({
            name: name
        }));
    }

    function getProvide(name: string) {
        const module = new ModuleBuilder().withName('Wewlad').build();
        const placedModule = new PlacedModuleBuilder().withModule(module).build();
        return placedModule.addProvide(busResource({
            name: name
        }));
    }

    beforeEach(() => {
        $('body').empty();
    });
    
    it("displays a message showing the number of reconnections", function () {
        const logger = getLogger();
        const originalProvide = getProvide("Provider1");
        const replacementProvide = getProvide("Provider2");
        const targetRequire = makeRequire("Require");
        logger.addEntry(originalProvide.name, replacementProvide.name, targetRequire.name);
        logger.createDialog();
        expect($('body').html()).toContain('1 of 1 connection(s) established successfully.');
    });

    it("displays a best match reconnection", function () {
        const logger = getLogger();
        const originalProvide = getProvide("Provider1");
        const replacementProvide = getProvide("Provider2");
        const targetRequire = makeRequire("Require");
        logger.addEntry(originalProvide.name, replacementProvide.name, targetRequire.name);
        logger.createDialog();
        expect($('body').find('.changes tbody tr').length).toEqual(1);
    });

    it("displays a failed log", function () {
        const logger = getLogger();
        const originalProvide = getProvide("Provider1");
        const targetRequire = makeRequire("Require");
        logger.addEntry(originalProvide.name, null, targetRequire.name);
        logger.createDialog();
        expect($('body').find('.failures tbody tr').length).toEqual(1);
    });

    it("displays an exact match reconnection log correctly", function () {
        const logger = getLogger();
        const originalProvide = getProvide("Provider1");
        const replacementProvide = getProvide("Provider1");
        const targetRequire = makeRequire("Require");
        logger.addEntry(originalProvide.name, replacementProvide.name, targetRequire.name);
        logger.createDialog();
        expect($('body').find('.successes tbody tr').length).toEqual(1);
    });
});