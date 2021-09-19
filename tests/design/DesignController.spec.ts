import {
    DesignController,
    DesignLoader,
    DesignSaver
} from "../../src/design/DesignController";
import {DesignRevision} from "../../src/design/DesignRevision";
import {DesignRevisionBuilder} from "./DesignRevisionBuilder";
import UserController from "../../src/auth/UserController";
import User from "../../src/auth/User";
import {Design} from "../../src/design/Design";
import {DesignRevisionGateway} from "../../src/design/DesignRevisionGateway";
import {ModuleBuilder} from "../module/ModuleBuilder";
import {RequireBus} from "../../src/bus/RequireBus";
import {ProvideBus} from "../../src/bus/ProvideBus";
import * as $ from "jquery";


function mockDesignSave(design: DesignRevision) {
    return spyOn(design, 'save').and.callFake(() => {
        const deferred = $.Deferred();
        deferred.resolve();
        return deferred.promise();
    });
}

/**
 * TODO due to private server querying methods in DesignRevision, these cannot run properly.
 */
xdescribe("DesignController", function () {
    describe("New Design", function() {
        it("sets a new design stored in the controller", function () {
            const previous = DesignController.getCurrentDesign();
            DesignController.createNewDesign();
            expect(DesignController.getCurrentDesign()).not.toEqual(previous);
        });

        it("sets a clean design", function () {
            DesignController.createNewDesign();
            expect(DesignController.getCurrentDesign().isDirty()).toBe(false);
            expect(DesignController.getCurrentDesign().isNew()).toBe(true);
        });
    });
});

describe("DesignSaver", function () {

    describe("Save", function () {
        it("does not save if the user is logged out", function () {
            const user = new User();
            user.isLoggedIn = () => false;
            spyOn(UserController, 'getUser').and.returnValue(user);
            const design = new DesignRevisionBuilder().build();
            const saveSpy = mockDesignSave(design);
            DesignSaver.of(design).save();
            expect(saveSpy).not.toHaveBeenCalled();
        });

        it("does not save dialog if the design is new", function () {
            const user = new User();
            user.isLoggedIn = () => true;
            spyOn(UserController, 'getUser').and.returnValue(user);
            const design = new DesignRevisionBuilder().build();
            design.isNew = () => true;
            const saveSpy = mockDesignSave(design);
            DesignSaver.of(design).save();
            expect(saveSpy).not.toHaveBeenCalled();
        });

        it("does not save if the design has been pushed", function () {
            const user = new User();
            user.isLoggedIn = () => true;
            spyOn(UserController, 'getUser').and.returnValue(user);
            const design = new DesignRevisionBuilder().asPushed().build();
            design.isNew = () => false;
            const saveSpy = mockDesignSave(design);
            DesignSaver.of(design).save();
            expect(saveSpy).not.toHaveBeenCalled();
        });

        it("does not save if the design does not belong to the current user", function () {
            const user = new User();
            user.getId = () => 10;
            user.isLoggedIn = () => true;
            spyOn(UserController, 'getUser').and.returnValue(user);
            const design = new DesignRevisionBuilder().withOwner(100000).build();
            design.isNew = () => false;
            const saveSpy = mockDesignSave(design);
            DesignSaver.of(design).save();
            expect(saveSpy).not.toHaveBeenCalled();
        });

        it("does save if conditions are met", function () {
            const user = new User();
            user.getId = () => 10;
            user.isLoggedIn = () => true;
            spyOn(UserController, 'getUser').and.returnValue(user);
            const design = new DesignRevisionBuilder().withOwner(user.getId()).build();
            design.isNew = () => false;
            const saveSpy = mockDesignSave(design);
            DesignSaver.of(design).save();
            expect(saveSpy).toHaveBeenCalled();
        });

        it("sets the saving state as false when it has finished", function () {
            const user = new User();
            user.getId = () => 10;
            user.isLoggedIn = () => true;
            spyOn(UserController, 'getUser').and.returnValue(user);
            const design = new DesignRevisionBuilder().withOwner(user.getId()).build();
            design.isNew = () => false;
            mockDesignSave(design);
            DesignSaver.of(design).save();
            expect(design.isSaving()).toBe(false);
        });
    });

    describe("initialDesignSave", function () {
        function mockDesignResource() {
            spyOn(Design.prototype, 'save').and.callFake(() => {
                const deferred = $.Deferred();
                deferred.resolve({
                    current_revision: {
                        id: 5
                    },
                    id: 2
                });
                return deferred.promise();
            });
        }

        it("properly sets the IDs of the DesignRevision to match the saved Design", function () {
            mockDesignResource();
            const design = new DesignRevisionBuilder().build();
            DesignSaver.of(design).initialDesignSave();
            expect(design.getDesignId()).toEqual(2);
            expect(design.getId()).toEqual(5);
        });

        it("sets the saving state as false when it has finished", function () {
            mockDesignResource();
            const design = new DesignRevisionBuilder().build();
            DesignSaver.of(design).initialDesignSave();
            expect(design.isSaving()).toBe(false);
        });

        it("clears the design dirty state", function () {
            mockDesignResource();
            const design = new DesignRevisionBuilder().asDirty().build();
            DesignSaver.of(design).initialDesignSave();
            expect(design.isDirty()).toBe(false);
        });

        it("is the current design as stored by DesignController", function () {
            mockDesignResource();
            const design = new DesignRevisionBuilder().build();
            DesignSaver.of(design).initialDesignSave();
            expect(DesignController.getCurrentDesign()).toEqual(design);
        });
    });
});


describe("DesignLoader", function () {
    describe("open", function () {
        it("fetches the design by its revision id", function () {
            const id = 5;
            let isCorrectId = false;
            const fakeGateway = {
                getDesignRevision: id => {
                    const deferred = $.Deferred();
                    deferred.resolve(new DesignRevisionBuilder().withId(id as number).build());
                    isCorrectId = id === 5;
                    return deferred.promise();
                }
            } as DesignRevisionGateway;
            DesignLoader.of(id, fakeGateway).open();
            expect(isCorrectId).toBe(true);
        });

        it("is set as the current design stored by DesignController", function () {
            const id = 5;
            const design = new DesignRevisionBuilder().withId(id as number).build();
            const fakeGateway = {
                getDesignRevision: _ => {
                    const deferred = $.Deferred();
                    deferred.resolve(design);
                    return deferred.promise();
                }
            } as DesignRevisionGateway;
            DesignLoader.of(id, fakeGateway).open();
            expect(DesignController.getCurrentDesign()).toEqual(design);
        });
    });

    describe("clone", function () {
        it("fetches the design by its revision id", function () {
            const id = 5;
            let isCorrectId = false;
            const fakeGateway = {
                getDesignRevision: id => {
                    const deferred = $.Deferred();
                    deferred.resolve(new DesignRevisionBuilder().withId(id as number).build());
                    isCorrectId = id === 5;
                    return deferred.promise();
                }
            } as DesignRevisionGateway;
            DesignLoader.of(id, fakeGateway).clone();
            expect(isCorrectId).toBe(true);
        });

        it("is set as the current design stored by DesignController", function () {
            const id = 5;
            const design = new DesignRevisionBuilder().withId(id as number).build();
            const fakeGateway = {
                getDesignRevision: _ => {
                    const deferred = $.Deferred();
                    deferred.resolve(design);
                    return deferred.promise();
                }
            } as DesignRevisionGateway;
            DesignLoader.of(id, fakeGateway).clone();
            expect(DesignController.getCurrentDesign()).toEqual(design);
        });

        it("sets the design dirty status", function () {
            const id = 5;
            const design = new DesignRevisionBuilder().withId(id as number).build();
            const fakeGateway = {
                getDesignRevision: _ => {
                    const deferred = $.Deferred();
                    deferred.resolve(design);
                    return deferred.promise();
                }
            } as DesignRevisionGateway;
            DesignLoader.of(id, fakeGateway).clone();
            expect(design.isDirty()).toBe(true);
        });

        it("sets the design first saved to null", function () {
            const id = 5;
            const design = new DesignRevisionBuilder()
                .withId(id as number)
                .withFirstSaved(new Date('Jan 1, 2000'))
                .build();
            const fakeGateway = {
                getDesignRevision: _ => {
                    const deferred = $.Deferred();
                    deferred.resolve(design);
                    return deferred.promise();
                }
            } as DesignRevisionGateway;
            DesignLoader.of(id, fakeGateway).clone();
            expect(design.firstSaved).toBe(null);
        });
        describe("shows dialog message", function () {
            beforeEach(function () {
                $('body').empty();
            });

            it("shows correct message", function () {
                const id = 5;
                const design = new DesignRevisionBuilder()
                    .withId(id as number)
                    .withFirstSaved(new Date('Jan 1, 2000'))
                    .build();
                const fakeGateway = {
                    getDesignRevision: _ => {
                        const deferred = $.Deferred();
                        deferred.resolve(design);
                        return deferred.promise();
                    }
                } as DesignRevisionGateway;
                DesignLoader.of(id, fakeGateway).clone();
                expect($('.ui-dialog-content').text()).toBe('Please remember to save your design.');
            });

            it("shows correct message if the original design was created before its connection's spec path", function () {
                /**
                 * Somewhere something is calling a real ajax request.
                 * TODO: CompiledCadSourceJobController tries to fetch the
                 *  compiledJob when a design is cloned, mock it up or block the
                 *  events from triggering it.
                 */
                jasmine.Ajax.install();

                const id = 5;
                const design = new DesignRevisionBuilder()
                    .withId(id as number)
                    .withFirstSaved(new Date('Jan 1, 1000'))
                    .build();

                const requirer = design.addModule(new ModuleBuilder().build(), {x: 0, y: 0});
                const require = new RequireBus({
                    placed_module: requirer,
                    proximity_point: {x: 3, y: 3},
                });

                const provider = design.addModule(new ModuleBuilder().build(), {x: 0, y: 0});
                const provide = new ProvideBus({
                    placed_module: provider,
                    proximity_point: {x: 0, y: 0},
                    path_width: 4,
                    min_path_length: 0,
                    max_path_length: 12,
                    path_created: new Date('Jan 2, 1000').toISOString()
                });

                design.addConnectionFromBuses(require, provide);


                const fakeGateway = {
                    getDesignRevision: _ => {
                        const deferred = $.Deferred();
                        deferred.resolve(design);
                        return deferred.promise();
                    }
                } as DesignRevisionGateway;
                DesignLoader.of(id, fakeGateway).clone();
                expect($('.ui-dialog-content').text()).toContain('The path constraints feature has been implemented since the original design was created, this may affect your design.');

                jasmine.Ajax.uninstall();
            });

            it("shows correct message if the original design was not created before its connection's spec path", function () {
                /**
                 * Somewhere something is calling a real ajax request.
                 * TODO: CompiledCadSourceJobController tries to fetch the
                 *  compiledJob when a design is cloned, mock it up or block the
                 *  events from triggering it.
                 */
                jasmine.Ajax.install();

                const id = 5;
                const design = new DesignRevisionBuilder()
                    .withId(id as number)
                    .withFirstSaved(new Date('Jan 1, 1001'))
                    .build();

                const requirer = design.addModule(new ModuleBuilder().build(), {x: 0, y: 0});
                const require = new RequireBus({
                    placed_module: requirer,
                    proximity_point: {x: 3, y: 3},
                });

                const provider = design.addModule(new ModuleBuilder().build(), {x: 0, y: 0});
                const provide = new ProvideBus({
                    placed_module: provider,
                    proximity_point: {x: 0, y: 0},
                    path_width: 4,
                    min_path_length: 0,
                    max_path_length: 12,
                    path_created: new Date('Jan 2, 1000').toISOString()
                });

                design.addConnectionFromBuses(require, provide);

                const fakeGateway = {
                    getDesignRevision: _ => {
                        const deferred = $.Deferred();
                        deferred.resolve(design);
                        return deferred.promise();
                    }
                } as DesignRevisionGateway;
                DesignLoader.of(id, fakeGateway).clone();
                expect($('.ui-dialog-content').text()).not.toContain('The path constraints feature has been implemented since the original design was created, this may affect your design.');

                jasmine.Ajax.uninstall();
            });
        });
    });
});