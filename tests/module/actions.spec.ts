import {DesignRevision} from "../../src/design/DesignRevision";
import {AddModule, FinishReplaceModule, RemoveModule,} from "../../src/module/actions";
import {PlacedModule} from "../../src/placedmodule/PlacedModule";
import {busResource} from "../bus/TestBus";
import {makeDomNodes} from "../global-fixtures";
import makeModule, {makeFootprint} from "./TestModule";
import {Module} from "../../src/module/Module";
import {PlacedModuleBuilder} from "../placedmodule/PlacedModuleBuilder";
import {FootprintBuilder} from "./feature/FootprintBuilder";
import {DesignRevisionBuilder} from "../design/DesignRevisionBuilder";
import {ModuleBuilder} from "./ModuleBuilder";
import {actions, executeAction} from "../../src/core/action"
import {MODULE_INIT_BUSES, ModulePlacementEvent} from "../../src/module/events";
import {PM_SUBSTITUTE_FINISH} from "../../src/placedmodule/events";
import events from "utils/events";
import eventDispatcher from "utils/events";
import ConnectionController from "../../src/connection/ConnectionController";
import {overrideDesignRevision} from "../design/TestDesign";
import {BomOptionResourceBuilder} from "../bomoptions/BomOptionBuilder";
import {RotateBlock} from "../../src/placeditem/actions";

/**
 * Get a module with a require/provide compatible with each other,
 * and a stubbed loadBuses promise.
 */
function makeMockedModule(): Module {
    return makeModule({
        requires: [
            busResource({
                name: 'require',
                milliwatts: 10,
                templates: [
                    {id: 44, name: 'POWER', power: true},
                ],
            })
        ],
        provides: [
            busResource({
                name: 'provide',
                milliwatts: 40,
                templates: [
                    {id: 44, name: 'POWER', power: true},
                ],
            })
        ]
    });
}

describe('AddModule', () => {
    const originalPosition = {x: 40, y: 105};

    describe('Log', () => {
        it('records the affected module', () => {
            const module = new ModuleBuilder().build();
            const designRev = new DesignRevisionBuilder().build();
            const action = new AddModule(module, designRev, originalPosition);
            expect(action.log).toEqual(`Add ${module.name}`);
        });

        it('works when the module has been removed', () => {
            const module = new ModuleBuilder().build();
            const designRev = new DesignRevisionBuilder().build();
            const action = new AddModule(module, designRev, originalPosition);
            designRev.removePlacedModule(designRev.getPlacedModules()[0]);
            expect(action.log).toEqual(`Add ${module.name}`);
        });
    });

    describe('execute', () => {
        it('adds the module to the design revision', async () => {
            const module = new ModuleBuilder().build();
            const designRev = new DesignRevisionBuilder().build();
            const action = new AddModule(module, designRev, originalPosition);

            await action.execute();

            expect(designRev.getPlacedModules().length).toEqual(1);
        });

        it('puts the module in the correct place', async () => {
            const module = new ModuleBuilder().build();
            const designRev = new DesignRevisionBuilder().build();
            const action = new AddModule(module, designRev, originalPosition);

            await action.execute();

            const pm = designRev.getPlacedModules()[0];
            expect(pm.position.x).toEqual(40);
            expect(pm.position.y).toEqual(105);
        });

        it('sets placed module overlaps, if there is an overlap', async () => {
            const designRev = new DesignRevisionBuilder().build();
            await new AddModule(makeMockedModule(), designRev, {x: 0, y: 0}).execute();
            await new AddModule(makeMockedModule(), designRev, {x: 0, y: 0}).execute();
            const pm = designRev.getPlacedModules()[0];
            expect(pm.overlaps()).toBe(true);
        });

        it('updates module ready status', async () => {
            const designRev = new DesignRevisionBuilder().build();
            await new AddModule(makeMockedModule(), designRev, {x: 0, y: 0}).execute();
            const pm = designRev.getPlacedModules()[0];
            expect(pm.isReady()).toBe(false);
            await new AddModule(makeMockedModule(), designRev, {x: 0, y: 0}).execute();
            expect(pm.isReady()).toBe(true);
            expect(pm.isConnected()).toBe(false);
        });

        it('with initial connections', async () => {
            const designRev = overrideDesignRevision();

            const module = designRev.addModule(makeModule({
                name: 'requirer',
                requires: [
                    busResource({
                        name: 'test require',
                        milliwatts: 20,
                        templates: [
                            {id: 44, name: 'POWER', power: true},
                        ],
                    }),
                ],
            }), originalPosition);

            const require = module.getRequires()[0];
            ConnectionController.setRequireToConnect(require);
            ConnectionController.autoConnect({module: module});

            const provider = makeModule({
                name: 'compatible provider',
                provides: [
                    busResource({
                        name: 'compatible provide',
                        milliwatts: 40,
                        templates: [
                            {id: 44, name: 'POWER', power: true},
                        ],
                    }),
                ],
            });

            const action = new AddModule(provider, designRev, originalPosition);
            await action.execute();

            expect(designRev.connections.length).toEqual(1);
            /** Insure that the connection to placed module references are correct */
            expect(designRev.connections[0].requirer).toEqual(designRev.getPlacedModules()[0]);
            expect(designRev.connections[0].provider).toEqual(designRev.getPlacedModules()[1]);
        });

        it('automatically selects the placed module', async () => {
            const designRev = new DesignRevisionBuilder().build();
            await new AddModule(makeMockedModule(), designRev, {x: 0, y: 0}).execute();
            const pm = designRev.getPlacedModules()[0];
            expect(pm.isSelected).toBe(true);
        });

        it('does not automatically select the placed module if we were connecting a require', async () => {
            const module = makeModule({
                name: 'requirer',
                requires: [
                    busResource({
                        name: 'test require',
                        milliwatts: 20,
                        templates: [
                            {id: 44, name: 'POWER', power: true},
                        ],
                    }),
                ],
            });
            const pm = new PlacedModuleBuilder().withModule(module).build();
            const require = pm.getRequires()[0];
            ConnectionController.setRequireToConnect(require);
            const designRev = new DesignRevisionBuilder().build();
            await new AddModule(makeMockedModule(), designRev, {x: 0, y: 0}).execute();
            const newPm = designRev.getPlacedModules()[0];
            expect(newPm.isSelected).toBe(false);
        });

        describe('when it fails to fetch module data from server', () => {
            let designRev: DesignRevision;
            beforeEach(async () => {
                makeDomNodes();
                designRev = new DesignRevisionBuilder().build();
                const module = new ModuleBuilder().build();
                spyOn(module, 'loadDetails').and.callFake(() => {
                    return new Promise<Module>((resolve, reject) => {
                        reject();
                    });
                });
                const action = new AddModule(module, designRev, {x: 0, y: 0});
                try {
                    await action.execute();
                } catch {
                    // Do Nothing, testing for promise failing.
                }
            });

            it('removes module', () => {
                expect(designRev.getPlacedModules().length).toEqual(0);
            });

            it('displays an error dialog', () => {
                expect($('.ui-dialog .ui-dialog-content').html())
                    .toEqual('Failed to load module from server.');
            });
        });
    });

    describe('undo', () => {
        it('removes the module from the design revision', async () => {
            const module = new ModuleBuilder().build();
            const designRev = new DesignRevisionBuilder().build();
            const action = new AddModule(module, designRev, originalPosition);

            await executeAction(action);
            actions.undo();

            expect(designRev.getPlacedModules().length).toEqual(0);
        });

        it('updates module ready status', async () => {
            const designRev = new DesignRevisionBuilder().build();
            await new AddModule(makeMockedModule(), designRev, {x: 0, y: 0}).execute();
            const pm = designRev.getPlacedModules()[0];
            const action = new AddModule(makeMockedModule(), designRev, {x: 0, y: 0});
            await executeAction(action);
            expect(pm.isReady()).toBe(true);
            actions.undo();
            expect(pm.isReady()).toBe(false);
        });

        it('works after an undo-delete', async () => {
            const module = new ModuleBuilder().build();
            const designRev = new DesignRevisionBuilder().build();

            const addAction = new AddModule(module, designRev, originalPosition);
            await executeAction(addAction);
            const pm = designRev.getPlacedModules()[0];
            const removeAction = new RemoveModule(pm);
            executeAction(removeAction);
            actions.undo();
            expect(designRev.getPlacedModules().length).toEqual(1);
            actions.undo();

            expect(designRev.getPlacedModules().length).toEqual(0);
        });
    });

    describe('redo', () => {
        it('re add the module from the design revision', async () => {
            const module = new ModuleBuilder().build();
            const designRev = new DesignRevisionBuilder().build();
            const action = new AddModule(module, designRev, originalPosition);

            await executeAction(action);
            actions.undo();
            await actions.redo(); /** will run {@see AddModule.execute()}. */

            expect(designRev.getPlacedModules().length).toEqual(1);
        });

        it('undo and redo adding the module from the design revision', async () => {
            const module = new ModuleBuilder().build();
            const designRev = new DesignRevisionBuilder().build();
            const action1 = new AddModule(module, designRev, originalPosition);
            const action2 = new AddModule(module, designRev, originalPosition);

            await executeAction(action1);
            await executeAction(action2);
            actions.undo();
            await actions.redo(); /** will run {@see AddModule.execute()}. */
            actions.undo();
            actions.undo();
            await actions.redo(); /** will run {@see AddModule.execute()}. */
            actions.undo();
            await actions.redo(); /** will run {@see AddModule.execute()}. */
            await actions.redo(); /** will run {@see AddModule.execute()}. */
            actions.undo();
            await actions.redo(); /** will run {@see AddModule.execute()}. */

            expect(designRev.getPlacedModules().length).toEqual(2);
        });

        it('puts the module in the original position', async () => {
            const module = new ModuleBuilder().build();
            const designRev = new DesignRevisionBuilder().build();
            const action = new AddModule(module, designRev, originalPosition);

            await executeAction(action);
            actions.undo();
            await actions.redo(); /** will run {@see AddModule.execute()}. */

            const restored = designRev.getPlacedModules()[0];

            expect(restored.position.x).toBe(40);
            expect(restored.position.y).toBe(105);
        });

        it('remains the module name', async () => {
            const module = new ModuleBuilder().build();
            const designRev = new DesignRevisionBuilder().build();
            const action = new AddModule(module, designRev, originalPosition);

            await executeAction(action);
            designRev.getPlacedModules()[0].setCustomName("noname");
            actions.undo();
            await actions.redo(); /** will run {@see AddModule.execute()}. */

            const restored = designRev.getPlacedModules()[0];

            expect(restored.customName).toBe("noname");
        });

        it('updates module ready status', async () => {
            const designRev = new DesignRevisionBuilder().build();
            await new AddModule(makeMockedModule(), designRev, {x: 0, y: 0}).execute();
            const pm = designRev.getPlacedModules()[0];
            const action = new AddModule(makeMockedModule(), designRev, {x: 0, y: 0});
            await executeAction(action);
            expect(pm.isReady()).toBe(true);
            actions.undo();
            expect(pm.isReady()).toBe(false);
            await actions.redo(); /** will run {@see AddModule.execute()}. */
            expect(pm.isReady()).toBe(true);
        });

        it('works after an undo-delete and redo', async () => {
            const module = new ModuleBuilder().build();
            const designRev = new DesignRevisionBuilder().build();

            const addAction = new AddModule(module, designRev, originalPosition);
            await executeAction(addAction);
            const pm = designRev.getPlacedModules()[0];
            const removeAction = new RemoveModule(pm);
            executeAction(removeAction);
            actions.undo();
            actions.undo();
            await actions.redo(); /** will run {@see AddModule.execute()}. */
            expect(designRev.getPlacedModules().length).toEqual(1);
            actions.redo();
            expect(designRev.getPlacedModules().length).toEqual(0);
        });

        it('restores edge constraints', async () => {
            const designRev = new DesignRevisionBuilder().build();
            const action = new AddModule(new ModuleBuilder().withFeatures(
                makeFootprint(10, 10, 'bottom')).build(), designRev, originalPosition);

            await executeAction(action);
            actions.undo();
            await actions.redo(); /** will run {@see AddModule.execute()}. */

            expect(designRev.dimensions.length).toEqual(1);
        });

        it('restores initial connections', async () => {
            const designRev = overrideDesignRevision();

            const module = designRev.addModule(makeModule({
                name: 'requirer',
                requires: [
                    busResource({
                        name: 'test require',
                        milliwatts: 20,
                        templates: [
                            {id: 44, name: 'POWER', power: true},
                        ],
                    }),
                ],
            }), originalPosition);

            const require = module.getRequires()[0];
            ConnectionController.setRequireToConnect(require);
            ConnectionController.autoConnect({module: module});

            const provider = makeModule({
                name: 'compatible provider',
                provides: [
                    busResource({
                        name: 'compatible provide',
                        milliwatts: 40,
                        templates: [
                            {id: 44, name: 'POWER', power: true},
                        ],
                    }),
                ],
            });

            const action = new AddModule(provider, designRev, originalPosition);

            await executeAction(action);
            actions.undo();
            await actions.redo(); /** will run {@see AddModule.execute()}. */

            expect(designRev.connections.length).toEqual(1);
            /** Insure that the connection to placed module references are correct */
            expect(designRev.connections[0].requirer).toEqual(designRev.getPlacedModules()[0]);
            expect(designRev.connections[0].provider).toEqual(designRev.getPlacedModules()[1]);
        });
    });
});

describe("RotateBlock", function () {

    it("has a log for the affected module", function () {
        const pm = new PlacedModuleBuilder().withModule(new ModuleBuilder().build()).build();
        const action = new RotateBlock(pm);
        action.execute();
        expect(action.log).toEqual(`Rotate ${pm.name} to ${pm.rotation}°`);
    });

    describe("execute", function () {
        it("rotates the module 90 degrees", function () {
            const pm = new PlacedModuleBuilder().withModule(new ModuleBuilder().build()).build();
            const action = new RotateBlock(pm);

            action.execute();

            expect(pm.rotation).toEqual(90);
        });

        it("rotates 360 degrees and turns back to the original position", function () {
            const feature = new FootprintBuilder().rectangle(55, 50).build();
            const module = new ModuleBuilder().withFeatures(feature).build();
            const designRev = new DesignRevisionBuilder().build();
            const pm = new PlacedModuleBuilder()
                .withModule(module)
                .withPosition(40, 10) // should snap to the bottom
                .withDesignRevision(designRev)
                .build();
            const action = new RotateBlock(pm);

            action.execute();
            action.execute();
            action.execute();
            action.execute();

            expect(pm.position.x).toEqual(40);
            expect(pm.position.y).toEqual(10);
        });

        it("rotates a module and the position is snapped into the grid", function () {
            const feature = new FootprintBuilder().rectangle(760, 425).build();
            const module = new ModuleBuilder().withFeatures(feature).build();
            const designRev = new DesignRevisionBuilder().build();
            const pm = new PlacedModuleBuilder()
                .withModule(module)
                .withPosition(0, 0) // should snap to the bottom
                .withDesignRevision(designRev)
                .build();
            const action = new RotateBlock(pm);

            action.execute();

            expect(Math.abs(pm.position.x % 1)).toEqual(0);
            expect(Math.abs(pm.position.y % 1)).toEqual(0);
            expect(pm.position.x).toEqual(593);
            expect(pm.position.y).toEqual(-167);
        });
    });

    describe("undo", function () {
        it("puts the module back", function () {
            const pm = new PlacedModuleBuilder()
                .withModule(new ModuleBuilder().build())
                .build();
            const action = new RotateBlock(pm);

            executeAction(action);
            actions.undo();

            expect(pm.rotation).toEqual(0);
        });

        it("puts the module back in its original position", function () {
            const module = new ModuleBuilder().withFeatures(makeFootprint(5, 20, 'bottom')).build();
            const designRev = new DesignRevisionBuilder().build();
            const pm = new PlacedModuleBuilder()
                .withModule(module)
                .withPosition(40, 10) // should snap to the bottom
                .withDesignRevision(designRev)
                .build();
            const action = new RotateBlock(pm);

            executeAction(action);
            actions.undo();

            expect(pm.position.x).toEqual(40);
            expect(pm.position.y).toEqual(0);
        });

        it("works after an undo-delete", function () {
            const designRev = new DesignRevisionBuilder().build();
            const pm = new PlacedModuleBuilder()
                .withModule(new ModuleBuilder().build())
                .withDesignRevision(designRev)
                .build();

            const rotateAction = new RotateBlock(pm);
            executeAction(rotateAction);
            const removeAction = new RemoveModule(pm);
            executeAction(removeAction);
            actions.undo();
            actions.undo();

            expect(designRev.getPlacedModules()[0].rotation).toEqual(0);
        });
    });

    describe("redo", function () {
        it("rotates the module", function () {
            const pm = new PlacedModuleBuilder()
                .withModule(new ModuleBuilder().build())
                .build();
            const action = new RotateBlock(pm);

            executeAction(action);
            actions.undo();
            expect(pm.rotation).toEqual(0);
            actions.redo();
            expect(pm.rotation).toEqual(90);
        });

        it("rotate for the edge module", function () {
            const module = new ModuleBuilder().withFeatures(makeFootprint(5, 20, 'bottom')).build();
            const designRev = new DesignRevisionBuilder().build();
            const pm = new PlacedModuleBuilder()
                .withModule(module)
                .withPosition(40, 10) // should snap to the bottom
                .withDesignRevision(designRev)
                .build();
            const action = new RotateBlock(pm);

            executeAction(action);
            const px = pm.position.x;
            const py = pm.position.y;
            actions.undo();
            expect(pm.position.x).toEqual(40);
            expect(pm.position.y).toEqual(0);
            actions.redo();
            expect(pm.position.x).toEqual(px);
            expect(pm.position.y).toEqual(py);
        });

        it("works after an undo-delete and redo", function () {
            const designRev = new DesignRevisionBuilder().build();
            const pm = new PlacedModuleBuilder()
                .withModule(new ModuleBuilder().build())
                .withDesignRevision(designRev)
                .build();

            const rotateAction = new RotateBlock(pm);
            executeAction(rotateAction);
            const removeAction = new RemoveModule(pm);
            executeAction(removeAction);
            actions.undo();
            actions.undo();
            expect(designRev.getPlacedModules()[0].rotation).toEqual(0);
            actions.redo();
            actions.redo();
        });
    });
});

describe("RemoveModule", function () {
    const originalPosition = {x: 40, y: 105};

    function make(designRev: DesignRevision): PlacedModule {
        const module = new ModuleBuilder().build();
        return designRev.addModule(module, originalPosition);
    }

    it("has a log for the affected module", function () {
        const designRev = new DesignRevisionBuilder().build();
        const pm = make(designRev);
        const action = new RemoveModule(pm);
        expect(action.log).toEqual(`Remove ${pm.name}`);
    });

    describe("execute", function () {
        it("removes the module", function () {
            const designRev = new DesignRevisionBuilder().build();
            const pm = make(designRev);

            const action = new RemoveModule(pm);
            action.execute();

            expect(designRev.getPlacedModules().length).toEqual(0);
        });

        it("removes any related connections", function () {
            const designRev = new DesignRevisionBuilder().build();
            const requirer = designRev.addModule(makeModule({
                requires: [
                    busResource({name: 'require'}),
                ],
            }), originalPosition);
            const provider = designRev.addModule(makeModule({
                provides: [
                    busResource({name: 'provide'}),
                ],
            }), originalPosition);

            designRev.addConnectionFromBuses(
                requirer.findRequire(r => r.name === 'require'),
                provider.findProvide(p => p.name === 'provide'));

            const action = new RemoveModule(requirer);
            action.execute();

            expect(designRev.connections.length).toEqual(0);
        });

        it("removes any related require no connects", function () {
            const designRev = new DesignRevisionBuilder().build();
            const requirer = designRev.addModule(makeModule({
                requires: [
                    busResource({
                        name: 'require',
                        is_optional: true, // Only optional require buses may have no connects.
                    }),
                ],
            }), originalPosition);

            designRev.addNoConnection(requirer.findRequire(r => r.name === 'require'));

            const action = new RemoveModule(requirer);
            action.execute();

            expect(designRev.getNoConnections().length).toEqual(0);
        });

        it("removes any related dimensions", function () {
            const designRev = new DesignRevisionBuilder().build();
            const fromModule = make(designRev);
            const toModule = make(designRev);

            const fromAnchor = fromModule.getAnchorByEdge('left');
            const toAnchor = toModule.getAnchorByEdge('left');

            const original = designRev.addDimensionFromAttributes({
                anchor1: fromAnchor,
                anchor2: toAnchor,
            });
            original.toggleLocked(); // Now it's locked.

            const action = new RemoveModule(fromModule);
            action.execute();

            expect(designRev.dimensions.length).toEqual(0);
        });

        it("removes edge constraints", function () {
            const designRev = new DesignRevisionBuilder().build();
            const module = designRev.addModule(
                new ModuleBuilder().withFeatures(makeFootprint(10, 10, 'bottom')).build(),
                originalPosition);

            expect(designRev.dimensions.length).toEqual(1);

            const action = new RemoveModule(module);
            action.execute();

            expect(designRev.dimensions.length).toEqual(0);
        });

        it("updates the module ready status", function () {
            const designRev = new DesignRevisionBuilder().build();
            const pm1 = new PlacedModuleBuilder()
                .withModule(makeMockedModule())
                .withDesignRevision(designRev).build();
            const pm2 = new PlacedModuleBuilder()
                .withModule(makeMockedModule())
                .withDesignRevision(designRev).build();
            designRev.updateElectrical();
            new RemoveModule(pm1).execute();
            expect(pm2.isReady()).toBe(false);
        });

        it("correctly updates overlap", function () {
            const designRev = new DesignRevisionBuilder().build();
            const pm1 = new PlacedModuleBuilder()
                .withDesignRevision(designRev)
                .withPosition(0, 0)
                .build();
            const pm2 = new PlacedModuleBuilder()
                .withDesignRevision(designRev)
                .withPosition(0, 0)
                .build();
            designRev.updateMechanical();
            expect(pm2.overlaps()).toBe(true);
            new RemoveModule(pm1).execute();
            expect(pm2.overlaps()).toBe(false);
        });
    });

    describe("undo", function () {
        it("restores the module", function () {
            const designRev = new DesignRevisionBuilder().build();
            const pm = new PlacedModuleBuilder()
                .withDesignRevision(designRev)
                .build();

            const action = new RemoveModule(pm);
            executeAction(action);
            actions.undo();

            const modules = designRev.getPlacedModules();
            expect(modules.length).toEqual(1);
            expect(modules.find(
                current => current.getRevisionId() === pm.getRevisionId()
            )).not.toBeUndefined();
        });

        it("puts the module in the original position", function () {
            const designRev = new DesignRevisionBuilder().build();
            const pm = new PlacedModuleBuilder()
                .withDesignRevision(designRev)
                .withPosition(40, 105)
                .build();

            const action = new RemoveModule(pm);
            executeAction(action);
            actions.undo();

            const restored = designRev.getPlacedModules()[0];
            expect(restored.position.equals(originalPosition)).toBe(true);
        });

        it("restores the module's rotation", function () {
            const designRev = new DesignRevisionBuilder().build();
            const pm = new PlacedModuleBuilder()
                .withDesignRevision(designRev)
                .build();
            pm.rotate(); //  90 deg
            pm.rotate(); // 180 deg

            const action = new RemoveModule(pm);
            executeAction(action);
            actions.undo();

            const restored = designRev.getPlacedModules()[0];
            expect(restored.rotation).toBe(180);
        });

        it("restores any required connections", function () {
            const designRev = new DesignRevisionBuilder().build();
            const requirer = designRev.addModule(makeModule({
                requires: [
                    busResource({name: 'require'}),
                ],
            }), originalPosition);
            const provider = designRev.addModule(makeModule({
                provides: [
                    busResource({name: 'provide'}),
                ],
            }), originalPosition);

            designRev.addConnectionFromBuses(
                requirer.findRequire(r => r.name === 'require'),
                provider.findProvide(p => p.name === 'provide'));

            const action = new RemoveModule(requirer);
            executeAction(action);
            actions.undo();

            expect(designRev.connections.length).toEqual(1);
            /** Insure that the connection to placed module references are correct */
            expect(designRev.connections[0].provider).toEqual(designRev.getPlacedModules()[0]);
            expect(designRev.connections[0].requirer).toEqual(designRev.getPlacedModules()[1]);
        });

        it("restores any provided connections", function () {
            const designRev = new DesignRevisionBuilder().build();
            const requirer = designRev.addModule(makeModule({
                requires: [
                    busResource({name: 'require'}),
                ],
            }), originalPosition);
            const provider = designRev.addModule(makeModule({
                provides: [
                    busResource({name: 'provide'}),
                ],
            }), originalPosition);

            designRev.addConnectionFromBuses(
                requirer.findRequire(r => r.name === 'require'),
                provider.findProvide(p => p.name === 'provide'));

            const action = new RemoveModule(provider);
            executeAction(action);
            actions.undo();

            expect(designRev.connections.length).toEqual(1);
            /** Insure that the connection to placed module references are correct */
            expect(designRev.connections[0].requirer).toEqual(designRev.getPlacedModules()[0]);
            expect(designRev.connections[0].provider).toEqual(designRev.getPlacedModules()[1]);
        });

        it("restores connections when both provide and require were removed", function () {
            const designRev = new DesignRevisionBuilder().build();
            const requirer = designRev.addModule(makeModule({
                requires: [
                    busResource({name: 'require'}),
                ],
            }), originalPosition);
            const provider = designRev.addModule(makeModule({
                provides: [
                    busResource({name: 'provide'}),
                ],
            }), originalPosition);

            designRev.addConnectionFromBuses(
                requirer.findRequire(r => r.name === 'require'),
                provider.findProvide(p => p.name === 'provide'));

            const action1 = new RemoveModule(requirer);
            const action2 = new RemoveModule(provider);
            executeAction(action1);
            executeAction(action2);
            actions.undo();
            actions.undo();

            expect(designRev.connections.length).toEqual(1);
            /** Insure that the connection to placed module references are correct */
            expect(designRev.connections[0].provider).toEqual(designRev.getPlacedModules()[0]);
            expect(designRev.connections[0].requirer).toEqual(designRev.getPlacedModules()[1]);
        });

        it("restores any require no connects", function () {
            const designRev = new DesignRevisionBuilder().build();
            const requirer = designRev.addModule(makeModule({
                requires: [
                    busResource({
                        name: 'require',
                        is_optional: true, // Only optional require buses may have no connects.
                    }),
                ],
            }), originalPosition);

            designRev.addNoConnection(requirer.findRequire(r => r.name === 'require'));

            const action = new RemoveModule(requirer);
            executeAction(action);
            actions.undo();

            expect(designRev.getNoConnections().length).toEqual(1);
            /** Insure that the connection to placed module references are correct */
            expect(designRev.getNoConnections()[0].requirer).toEqual(designRev.getPlacedModules()[0]);
        });

        it("updates electrical status", function () {
            const designRev = new DesignRevisionBuilder().build();
            const requirer = designRev.addModule(makeModule({
                requires: [
                    busResource({
                        name: 'require',
                        milliwatts: 13,
                    }),
                ],
            }), originalPosition);
            const provider = designRev.addModule(makeModule({
                provides: [
                    busResource({
                        name: 'provide',
                        milliwatts: 50,
                    }),
                ],
            }), originalPosition);

            designRev.addConnectionFromBuses(
                requirer.findRequire(r => r.name === 'require'),
                provider.findProvide(p => p.name === 'provide'));

            const action = new RemoveModule(provider);
            executeAction(action);
            actions.undo();

            const require = designRev.connections[0].requireBus;
            expect(require.isReady()).toBe(true);
        });

        it("restores regular dimensions", function () {
            const designRev = new DesignRevisionBuilder().build();
            const fromModule = make(designRev);
            const toModule = make(designRev);

            const fromAnchor = fromModule.getAnchorByEdge('left');
            const toAnchor = toModule.getAnchorByEdge('left');

            const original = designRev.addDimensionFromAttributes({
                anchor1: fromAnchor,
                anchor2: toAnchor,
            });
            original.toggleLocked(); // Now it's locked.

            const action = new RemoveModule(toModule);
            executeAction(action);
            actions.undo();

            expect(designRev.dimensions.length).toEqual(1);
            /** Insure that the dimension to placed module references are correct */
            expect(designRev.dimensions[0].anchor1.dimensionable).toEqual(designRev.getPlacedModules()[0]);
            expect(designRev.dimensions[0].anchor2.dimensionable).toEqual(designRev.getPlacedModules()[1]);
        });

        it("restores regular dimensions when both modules were removed ", function () {
            const designRev = new DesignRevisionBuilder().build();
            const fromModule = make(designRev);
            const toModule = make(designRev);

            const fromAnchor = fromModule.getAnchorByEdge('left');
            const toAnchor = toModule.getAnchorByEdge('left');

            const original = designRev.addDimensionFromAttributes({
                anchor1: fromAnchor,
                anchor2: toAnchor,
            });
            original.toggleLocked(); // Now it's locked.

            const action1 = new RemoveModule(toModule);
            const action2 = new RemoveModule(fromModule);

            executeAction(action1);
            executeAction(action2);
            actions.undo();
            actions.undo();

            expect(designRev.dimensions.length).toEqual(1);
            /** Insure that the dimension to placed module references are correct */
            expect(designRev.dimensions[0].anchor1.dimensionable).toEqual(designRev.getPlacedModules()[0]);
            expect(designRev.dimensions[0].anchor2.dimensionable).toEqual(designRev.getPlacedModules()[1]);
        });

        it("restores edge constraints", function () {
            const designRev = new DesignRevisionBuilder().build();
            const module = designRev.addModule(
                new ModuleBuilder().withFeatures(makeFootprint(10, 10, 'bottom')).build(),
                originalPosition);

            const action = new RemoveModule(module);
            executeAction(action);
            actions.undo();

            expect(designRev.dimensions.length).toEqual(1);
        });

        it("restores BOM choices", function () {
            const module = new ModuleBuilder()
                .withBomOptions([
                    new BomOptionResourceBuilder().build()
                ])
                .build();
            const pm = new PlacedModuleBuilder()
                .withModule(module)
                .build();
            const bomOption = pm.bomOptions[0];
            const choice = bomOption.choices.find(c => !c.isDefault);
            choice.select();

            const action = new RemoveModule(pm);
            executeAction(action);
            actions.undo();

            const restored = pm.designRevision.getPlacedModules()[0];
            expect(restored.selectedChoices.length).toEqual(1);
            const restoredChoice = restored.selectedChoices[0];
            expect(restoredChoice.id).toEqual(choice.id);
        });

        it("restores rotated module in correct position", function () {
            const feature = new FootprintBuilder().rectangle(60, 50).build();
            const module = new ModuleBuilder().withFeatures(feature).build();

            const designRev = new DesignRevisionBuilder().build();
            const origin = new PlacedModuleBuilder()
                .withDesignRevision(designRev)
                .withModule(module)
                .withPosition(40, 10)
                .build();
            origin.rotate();

            const action = new RemoveModule(origin);
            executeAction(action);
            actions.undo();

            const restored = designRev.getPlacedModules()[0];

            expect(restored.position.x).toEqual(origin.position.x);
            expect(restored.position.y).toEqual(origin.position.y);
            expect(restored.rotation).toEqual(origin.rotation);
        });
    });

    describe("redo", function () {
        it("remove the module", function () {
            const designRev = new DesignRevisionBuilder().build();
            const pm = new PlacedModuleBuilder()
                .withDesignRevision(designRev)
                .build();

            const action = new RemoveModule(pm);
            executeAction(action);
            actions.undo();

            let modules = designRev.getPlacedModules();
            expect(modules.length).toEqual(1);
            expect(modules.find(
                current => current.getRevisionId() === pm.getRevisionId()
            )).not.toBeUndefined();

            actions.redo();

            modules = designRev.getPlacedModules();
            expect(modules.length).toEqual(0);
            expect(modules.find(
                current => current.getRevisionId() === pm.getRevisionId()
            )).toBeUndefined();
        });

        it("remove the module, undo and redo multiple times", function () {
            const designRev = new DesignRevisionBuilder().build();
            const pm2 = new PlacedModuleBuilder()
                .withDesignRevision(designRev)
                .build();
            const pm1 = new PlacedModuleBuilder()
                .withDesignRevision(designRev)
                .build();

            const action1 = new RemoveModule(pm1);
            const action2 = new RemoveModule(pm2);
            executeAction(action1);
            executeAction(action2);
            actions.undo();
            actions.redo();
            actions.undo();
            actions.undo();
            actions.redo();
            actions.undo();
            actions.redo();
            actions.redo();
            actions.undo();
            actions.redo();

            const modules = designRev.getPlacedModules();
            expect(modules.length).toEqual(0);
            expect(modules.find(
                current => current.getRevisionId() === pm1.getRevisionId()
            )).toBeUndefined();
            expect(modules.find(
                current => current.getRevisionId() === pm2.getRevisionId()
            )).toBeUndefined();
        });
    });
});


function makeConnection(designRev: DesignRevision) {
    const requirer = designRev.addModule(makeModule({
        requires: [
            busResource({name: 'require'}),
        ],
    }), {x: 0, y: 0});
    const provider = designRev.addModule(makeModule({
        provides: [
            busResource({name: 'provide'}),
        ],
    }), {x: 0, y: 0});

    designRev.addConnectionFromBuses(
        requirer.findRequire(r => r.name === 'require'),
        provider.findProvide(p => p.name === 'provide'));
}


describe('ReplaceModule', function () {
    const originalPosition = {x: 40, y: 105};

    /**
     * TODO this is adversely affecting the tests that come afterward.
     */
    xit("has a log for the affected modules", function () {
        const designRev = new DesignRevisionBuilder().build();
        makeConnection(designRev);
        designRev.moduleToReplace = designRev.getPlacedModules()[0];
        const module =  makeModule({
            name: 'new',
            requires: [busResource({name: 'require'})],
        });
        const action = new FinishReplaceModule(module, designRev, originalPosition);
        action.execute(); // Module names are only logged after the action is executed
        expect(action.log).toEqual(`Replace ${designRev.moduleToReplace.name} with ${module.name}`);
    });

    describe("execute", function () {
        let designRev: DesignRevision;

        beforeEach(function (done) {
            const module = makeModule({
                name: 'new',
                requires: [busResource({name: 'require'})]
            });
            designRev = new DesignRevisionBuilder().build();
            makeConnection(designRev);
            designRev.moduleToReplace = designRev.getPlacedModules()[0];

            const action = new FinishReplaceModule(module, designRev, originalPosition);

            action.execute();
            events.subscribe(PM_SUBSTITUTE_FINISH, () => {done()});
        });

        it("replace the module", function () {
            expect(designRev.getPlacedModules().length).toEqual(2);
        });

        it("replace the module with correct position", function () {
            const newModule = designRev.getPlacedModules()[1];
            expect(newModule.position.x).toEqual(40);
            expect(newModule.position.y).toEqual(105);
        });

        it("replace the module restore connections", function () {
            expect(designRev.connections.length).toEqual(1);
            /** Insure that the connection to placed module references are correct */
            expect(designRev.connections[0].provider).toEqual(designRev.getPlacedModules()[0]);
            expect(designRev.connections[0].requirer).toEqual(designRev.getPlacedModules()[1]);
        });
        it("updates electrical status", function () {
            const require = designRev.connections[0].requireBus;
            expect(require.isReady()).toBe(true);
        });
    });

    describe("undo", function () {
        let designRev: DesignRevision;

        beforeEach(function (done) {
            designRev = new DesignRevisionBuilder().build();

            const requirer = designRev.addModule(makeModule({
                requires: [
                    busResource({name: 'require'}),
                    busResource({
                        name: 'require NC',
                        is_optional: true, // Only optional require buses may have no connects.
                    }),
                ],
            }), {x: 0, y: 0});
            const provider = designRev.addModule(makeModule({
                provides: [
                    busResource({name: 'provide'}),
                ],
            }), {x: 0, y: 0});

            designRev.addConnectionFromBuses(
                requirer.findRequire(r => r.name === 'require'),
                provider.findProvide(p => p.name === 'provide'));

            designRev.addNoConnection(requirer.findRequire(r => r.name === 'require NC'));

            designRev.moduleToReplace = designRev.getPlacedModules()[0];
            const module = makeModule({
                name: 'new',
                requires: [busResource({name: 'require'})]
            });
            const action = new FinishReplaceModule(module, designRev, originalPosition);
            executeAction(action);
            events.subscribe(PM_SUBSTITUTE_FINISH, () => {done()});
        });

        it("replace the module", function () {
            actions.undo();
            expect(designRev.getPlacedModules().length).toEqual(2);
        });

        it("replace the module with correct position", function () {
            actions.undo();
            const newModule = designRev.getPlacedModules()[1];
            expect(newModule.position.x).toEqual(0);
            expect(newModule.position.y).toEqual(0);
        });

        it("restore connections", function () {
            actions.undo();
            expect(designRev.connections.length).toEqual(1);
            /** Insure that the connection to placed module references are correct */
            expect(designRev.connections[0].provider).toEqual(designRev.getPlacedModules()[0]);
            expect(designRev.connections[0].requirer).toEqual(designRev.getPlacedModules()[1]);
        });

        it("restore no connects", function () {
            actions.undo();
            expect(designRev.getNoConnections().length).toEqual(1);
            /** Insure that the connection to placed module references are correct */
            expect(designRev.getNoConnections()[0].requirer).toEqual(designRev.getPlacedModules()[1]);
        });

        it("updates electrical status", function () {
            actions.undo();
            const require = designRev.connections[0].requireBus;
            expect(require.isReady()).toBe(true);
        });
    });

    describe("redo", function () {
        let designRev: DesignRevision;

        beforeEach(function (done) {
            designRev = new DesignRevisionBuilder().build();
            let count = 0;

            const requirer = designRev.addModule(makeModule({
                requires: [
                    busResource({name: 'require'}),
                ],
            }), {x: 0, y: 0});
            const provider = designRev.addModule(makeModule({
                provides: [
                    busResource({name: 'provide'}),
                ],
            }), {x: 0, y: 0});

            designRev.addConnectionFromBuses(
                requirer.findRequire(r => r.name === 'require'),
                provider.findProvide(p => p.name === 'provide'));

            designRev.moduleToReplace = designRev.getPlacedModules()[0];

            const module =  makeModule({
                name: 'new',
                requires: [busResource({name: 'require'})],
            });
            const action = new FinishReplaceModule(module, designRev, originalPosition);
            executeAction(action);

            events.subscribe(PM_SUBSTITUTE_FINISH, () => {
                if (count === 1) {
                    done();
                    return;
                }
                actions.undo();
                // Redo action is the same as execute, it is async.
                // Therefore need to wait until it is finished then call done.
                actions.redo();
                count++;
            });
        });

        it("replace the module", function () {
            expect(designRev.getPlacedModules().length).toEqual(2);
        });

        it("replace the module with correct position", function () {
            const newModule = designRev.getPlacedModules()[1];
            expect(newModule.position.x).toEqual(40);
            expect(newModule.position.y).toEqual(105);
        });

        it("replace the module restore connections", function () {
            expect(designRev.connections.length).toEqual(1);
            /** Insure that the connection to placed module references are correct */
            expect(designRev.connections[0].provider).toEqual(designRev.getPlacedModules()[0]);
            expect(designRev.connections[0].requirer).toEqual(designRev.getPlacedModules()[1]);
        });

        it("updates electrical status", function () {
            const require = designRev.connections[0].requireBus;
            expect(require.isReady()).toBe(true);
        });
    })
});
