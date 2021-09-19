import {Design} from 'design/Design';
import User from "../../src/auth/User";
import {DesignRevision} from "../../src/design/DesignRevision";


describe("Design", function () {
    let design;
    let mockUuid = 'uuiduuid-uuid-uuid-uuid-uuiduuiduuid';

    beforeEach(function () {
        design = new Design({
            title: 'My great board',
            description: 'It is so great!',
            current_revision: new DesignRevision({
                title: '1',
                width: 1050,
                height: 400,
                corner_radius: 0,
                placed_modules: [],
                connections: [],
                explicit_require_no_connections: [],
                dimensions: []
            }),
        });

    });

    it('generates correct JSON', function () {
        const json = design.toJSON();
        expect(json).toEqual({
            title: 'My great board',
            description: 'It is so great!',
            'public': false,
            initial_revision: {
                title: '1',
                image_contents: null,
                width: 1050,
                height: 400,
                corner_radius: 0,
                radius_locked: false,
                uprev: false,
                placed_modules: [],
                placed_logos: [],
                connections: [],
                explicit_require_no_connections: [],
                dimensions: []
            }
        });
    });

    it('knows which modules it contains', function () {
        design = new Design({
            title: 'My great board',
            description: 'It is so great!',
            module_ids: [1, 2, 3]
        });

        const module1 = {
                get moduleId() {
                    return 1;
                }
            },
            module4 = {
                get moduleId() {
                    return 4;
                }
            };

        expect(design.containsModule(module1)).toBe(true);
        expect(design.containsModule(module4)).toBe(false);
    });

    it('initializes the current revision', function () {
        design = new Design({
            id: 101,
            title: 'Test',
            description: 'Test test',
            current_revision: {
                id: 1001,
                title: '3',
                modules: [],
                connections: [],
                dimensions: []
            }
        });

        expect(design.getCurrentRevision()).not.toEqual(null);
    });

    describe("isOwnedBy", function () {
        it('returns true for the owner', function () {
            const d = new Design({
                owner: 244,
            });
            const u = new User({
                id: 244,
            });

            expect(d.isOwnedBy(u)).toBe(true);
        });
        it("returns false for someone else", function () {
            const d = new Design({
                owner: 244,
            });
            const u = new User({
                id: 245,
            });

            expect(d.isOwnedBy(u)).toBe(false);
        });
        it("returns false for anonymous users", function () {
            const d = new Design({
                owner: 244,
            });
            const u = new User({
                id: null,
            });

            expect(d.isOwnedBy(u)).toBe(false);
        });
    });
});
