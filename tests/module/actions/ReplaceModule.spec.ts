import {DesignRevision} from "../../../src/design/DesignRevision";
import {FinishReplaceModule} from "../../../src/module/actions";
import {PM_SUBSTITUTE_START} from "../../../src/placedmodule/events";
import {PlacedModule} from "../../../src/placedmodule/PlacedModule";
import events from "../../../src/utils/events";
import {PlacedModuleBuilder} from "../../placedmodule/PlacedModuleBuilder";
import {ProvideBus} from "../../../src/bus/ProvideBus";
import {RequireBus} from "../../../src/bus/RequireBus";
import {busResource} from "../../bus/TestBus";
import {BusGroup} from "../../../src/bus/BusGroup";
import {MODULE_PUT} from "../../../src/module/events";
import {Module} from "../../../src/module/Module";
import makeModule from "../TestModule";
import {DesignRevisionBuilder} from "../../design/DesignRevisionBuilder";
import {Library} from "../../../src/module/Library";
import {ModuleBuilder} from "../ModuleBuilder";
import {Panel} from "../../../src/view/librarypanel/Panel";
import WorkspaceView, {WorkspaceViewOptions} from "../../../src/workspace/WorkspaceView";
import ModuleController from "../../../src/module/ModuleController";
import {overrideDesignRevision} from "../../design/TestDesign";
import {Workspace} from "../../../src/workspace/Workspace";

function makeBusGroup(placedModule: PlacedModule): BusGroup {
    return new BusGroup({
        placed_module: placedModule,
        title: "A Group",
        levels: ['1.8', '3.3']
    });
}

function makeRequire(placedModule: PlacedModule, customAttributes?): RequireBus {
    const attributes = busResource(customAttributes);
    const require = placedModule.addRequire(attributes);
    require.set('busgroup', makeBusGroup(placedModule));
    return require;
}

function makeProvide(placedModule: PlacedModule, customAttributes?): ProvideBus {
    const attributes = busResource(customAttributes);
    const provide = placedModule.addProvide(attributes);
    provide.set('busgroup', makeBusGroup(placedModule));
    return provide;
}

/**
 * Complete the substitution from Module and return the generated PlacedModule.
 */
function makeReplacement(replacement: Module, designRev: DesignRevision) {
    const action = new FinishReplaceModule(replacement, designRev, {x: 0, y: 0});
    action.execute();
    return waitForReplacement(designRev);
}

/**
 * Replacement is asynchronous for UI purposes. Use this to wait for it.
 */
function waitForReplacement(designRev: DesignRevision): Promise<any> {
    return new Promise(resolve => {
        setTimeout(function () {
            resolve(getReplacement(designRev))
        }, 5)
    });
}

function getReplacement(designRev: DesignRevision): PlacedModule {
    const placedModules = designRev.getPlacedModules();
    const last = placedModules.length - 1;
    return placedModules[last];
}

describe("FinishReplaceModule", function () {

    describe("Log", function () {
        it("records the affected modules", function (done) {
            const original = new PlacedModuleBuilder().build();
            const provide = makeProvide(original);
            const require = makeRequire(new PlacedModuleBuilder().build());
            provide.designRevision.addConnectionFromBuses(require, provide);
            const designRev = original.designRevision;
            designRev.moduleToReplace = original;
            const replacement = makeModule({
                provides: [busResource()]
            });
            const action = new FinishReplaceModule(replacement, designRev, {x: 0, y: 0});
            action.execute();
            waitForReplacement(designRev).then(() => {
                expect(action.log).toContain(`Replace ${original.name} with ${replacement.name}`);
                done();
            });
        });
    });

    it("reconnects a matching require provided by the original", function (done) {
        const original = new PlacedModuleBuilder().build();
        const designRev = original.designRevision;
        const provide = makeProvide(original);
        const require = makeRequire(new PlacedModuleBuilder().withDesignRevision(designRev).build());
        provide.designRevision.addConnectionFromBuses(require, provide);
        designRev.moduleToReplace = original;
        const replacement = makeModule({
            provides: [busResource()]
        });
        makeReplacement(replacement, designRev).then((replacementPm) => {
            expect(replacementPm.providedConnections.length).toBe(1);
            done();
        });
    });

    it("chooses a provide with the closest name to the original", function (done) {
        const original = new PlacedModuleBuilder().build();
        const designRev = original.designRevision;
        const require = makeRequire(new PlacedModuleBuilder().withDesignRevision(designRev).build());
        const originalProvide = makeProvide(original, {
            name: "coffee"
        });
        designRev.addConnectionFromBuses(require, originalProvide);
        designRev.moduleToReplace = original;
        const replacement = makeModule({
            provides: [
                busResource({
                    name: "cofey"
                }),
                busResource({
                    name: "koffee"
                }),
                busResource({
                    name: "coffee"
                })
            ]
        });
        makeReplacement(replacement, designRev).then((replacementPm) => {
            expect(replacementPm.providedConnections.length).toBe(1);
            const connection = replacementPm.providedConnections[0];
            expect(connection.provideBus.name).toEqual("coffee");
            done();
        });
    });

    it("re-establishes a provide required by the original", function (done) {
        const original = new PlacedModuleBuilder().build();
        const require = makeRequire(original);
        const provide = makeProvide(new PlacedModuleBuilder().build());
        const designRev = original.designRevision;
        designRev.addConnectionFromBuses(require, provide);
        designRev.moduleToReplace = original;
        const replacement = makeModule({
            requires: [busResource()]
        });
        makeReplacement(replacement, designRev).then((replacementPm) => {
            expect(replacementPm.requiredConnections.length).toBe(1);
            done();
        });
    });

    it("chooses a require with the closest name to the original", function (done) {
        const original = new PlacedModuleBuilder().build();
        const provide = makeProvide(new PlacedModuleBuilder().build());
        const originalRequire = makeRequire(original, {
            name: "1coffee1"
        });
        const designRev = original.designRevision;
        designRev.addConnectionFromBuses(originalRequire, provide);
        designRev.moduleToReplace = original;

        const replacement = makeModule({
            requires: [
                busResource({
                    name: "coffing"
                }),
                busResource({
                    name: "koffeeee"
                }),
                busResource({
                    name: "coffee"
                })
            ]
        });
        makeReplacement(replacement, designRev).then((replacementPm) => {
            expect(replacementPm.requiredConnections.length).toBe(1);
            const connection = replacementPm.requiredConnections[0];
            expect(connection.requireBus.name).toEqual("coffee");
            done();
        });
    });

    it("resolves short bus names in the comparison reasonably", function (done) {
        const original = new PlacedModuleBuilder().build();
        const provide = makeProvide(new PlacedModuleBuilder().build());
        const originalRequire = makeRequire(original, {
            name: "ah"
        });
        const designRev = original.designRevision;
        designRev.addConnectionFromBuses(originalRequire, provide);
        designRev.moduleToReplace = original;
        const replacement = makeModule({
            requires: [
                busResource({
                    name: "ha"
                })
            ]
        });
        makeReplacement(replacement, designRev).then((replacementPm) => {
            expect(replacementPm.requiredConnections.length).toBe(1);
            const connection = replacementPm.requiredConnections[0];
            expect(connection.requireBus.name).toEqual("ha");
            done();
        });
    });

    it("correctly compares names with duplicate subsets", function (done) {
        const original = new PlacedModuleBuilder().build();
        const provide = makeProvide(new PlacedModuleBuilder().build());
        const originalRequire = makeRequire(original, {
            name: "wrywrywrywry"
        });
        const designRev = original.designRevision;
        designRev.addConnectionFromBuses(originalRequire, provide);
        designRev.moduleToReplace = original;
        const replacement = makeModule({
            requires: [
                busResource({
                    name: "wry"
                }),
                busResource({
                    name: "wrywrywry"
                }),
                busResource({
                    name: "wrywry"
                })
            ]
        });
        makeReplacement(replacement, designRev).then((replacementPm) => {
            expect(replacementPm.requiredConnections.length).toBe(1);
            const connection = replacementPm.requiredConnections[0];
            expect(connection.requireBus.name).toEqual("wrywrywry");
            done();
        });
    });

    it("correctly compares names with multiple of the same matching bigrams", function (done) {
        const original = new PlacedModuleBuilder().build();
        const provide = makeProvide(new PlacedModuleBuilder().build());
        const originalRequire = makeRequire(original, {
            name: "locomoco-coco"
        });
        const designRev = original.designRevision;
        designRev.addConnectionFromBuses(originalRequire, provide);
        designRev.moduleToReplace = original;
        const replacement = makeModule({
            requires: [
                busResource({
                    name: "cocococopops"
                }),
                busResource({
                    name: "ludicolo"
                })
            ]
        });

        makeReplacement(replacement, designRev).then((replacementPm) => {
            expect(replacementPm.requiredConnections.length).toBe(1);
            const connection = replacementPm.requiredConnections[0];
            expect(connection.requireBus.name).toEqual("cocococopops");
            done();
        });
    });
});

/**
 * Ensure that the correct sequence of events results in the module replacement.
 */
describe("Replace module integration test:", function () {

    function getLibrary(): Library {
        const library = new Library();
        const module = new ModuleBuilder().build();
        library.add(module);
        return library;
    }

    function dropModule(designRev: DesignRevision): Promise<any> {
        const replacement: Module = makeModule();
        events.publishEvent(MODULE_PUT, {
            model: replacement,
            designRevision: designRev,
            position: {x: 0, y: 0}
        });
        // Wait for replacement action if needed.
        return new Promise(resolve => {
            setTimeout(function () {
                resolve(replacement)
            }, 100)
        });
    }

    let workspaceView = null;

    afterEach(() => {
        if (workspaceView) {
            workspaceView.remove();
            workspaceView = null;
        }
    });

    function beginReplacement(): DesignRevision {
        const designRevision = overrideDesignRevision();
        const original = new PlacedModuleBuilder()
            .withModule(makeModule())
            .withDesignRevision(designRevision)
            .build();
        const workspace = new Workspace(true, true);
        const panel = new Panel(workspace);
        panel.onModulesLoaded(getLibrary(), '');
        workspaceView = new WorkspaceView({
            model: workspace,
            panel: panel
        } as WorkspaceViewOptions);
        events.publishEvent(PM_SUBSTITUTE_START, {
            model: original
        });
        return designRevision;
    }

    it("behaves like a regular addition if no original module is set", function (done) {
        const original = new PlacedModuleBuilder().build();
        const designRev = original.designRevision;
        dropModule(designRev).then(replacement => {
            expect(designRev.hasModule(original.module)).toBe(true);
            expect(designRev.hasModule(replacement)).toBe(true);
            done();
        });
    });

    describe("if an original module is set,", function () {
        it("removes the original module", function (done) {
            const original = new PlacedModuleBuilder().build();
            const designRev = beginReplacement();
            dropModule(designRev).then(() => {
                expect(designRev.hasModule(original.module)).toBe(false);
                done();
            });
        });

        it("replaces original module with the new one", function (done) {
            const designRev = beginReplacement();
            dropModule(designRev).then(replacement => {
                expect(designRev.getPlacedModules().length).toEqual(1);
                expect(designRev.hasModule(replacement)).toBe(true);
                done();
            });
        });

        it("does not double-add the new module", function (done) {
            const designRev = beginReplacement();
            const replacement = makeModule();
            makeReplacement(replacement, designRev).then(() => {
                const instances = designRev.getPlacedModules().filter(pm => {
                    return pm.module === replacement;
                });
                expect(instances.length).toEqual(1);
                done();
            });
        });
    });

    describe("Undo", function () {

        function finishReplacement(replacement: Module, designRev: DesignRevision): Promise<any> {
            const action = new FinishReplaceModule(replacement, designRev, {x: 0, y: 0});
            action.execute();
            return new Promise(resolve => {
                setTimeout(function () {
                    resolve(action)
                }, 5)
            });
        }

        it("re-adds the original module and removes the replacement module", function (done) {
            const designRev = beginReplacement();
            const replacement = makeModule();
            finishReplacement(replacement, designRev).then(action => {
                action.reverse();
                expect(designRev.getPlacedModules().length).toEqual(1);
                expect(designRev.hasModule(replacement)).toBe(false);
                done();
            });
        });

        it("restores the require provided by the original", function (done) {
            const provide = busResource({name: "boop"});
            const original = makeModule({
                provides: [provide]
            });

            const designRev = new DesignRevisionBuilder().build();
            const originalPm = designRev.addModule(original, {x: 0, y: 0});
            const originalPmUuid = originalPm.uuid;
            const requirePm =  designRev.addModule(makeModule(), {x: 0, y: 0});
            const require = makeRequire(requirePm);

            designRev.addConnectionFromBuses(
                require,
                originalPm.getProvides()[0]
            );

            designRev.moduleToReplace = originalPm;
            const replacement = makeModule({
                provides: [provide]
            });
            finishReplacement(replacement, designRev).then(action => {
                action.reverse();
                const restored = designRev.getPlacedModules().find(pm => {
                    return pm.uuid === originalPmUuid;
                });
                expect(restored.providedConnections.length).toBe(1);
                done();
            });
        });
    });
});
