import events from "../../src/utils/events";
import {BoardBuilder} from "./BoardBuilder";
import {BoardView} from "../../src/view/BoardView";
import {BOARD_DIMENSIONS_CHANGED, TOGGLE_CORNER_RADIUS_LOCK} from "../../src/design/events";
import * as $ from "jquery";
import {Workspace} from "../../src/workspace/Workspace";
import {BoardViewBuilder} from "./BoardViewBuilder";
import {actions} from "../../src/core/action";
import * as React from "react";
import * as ReactTestUtils from "react-dom/test-utils";
import * as ReactDOM from "react-dom";
import {DesignPreview} from "../../src/view/dashboard/DesignPreview";
import {Library} from "../../src/module/Library";
import {CornerRadius} from "../../src/board/CornerRadius";

describe("BoardView", function () {

    describe("corner radius", function () {

        let boardView = null;
        let container;

        beforeEach(() => {
            container = document.createElement('div');
        });

        afterEach(() => {
            if (boardView) {
                boardView.remove();
                boardView = null;
            }
            ReactDOM.unmountComponentAtNode(container);
            document.clear();
        });

        function makeCornerRadius(board, workspace) {
            ReactDOM.render(<CornerRadius board={board}
                                          workspace={workspace}
                                          updateBoardRadius={() => null}
                                          actionApplied={false}/>, container);
        }

        it('has a correct maximum size depending on the board size', function () {
            const board = new BoardBuilder()
                .withHeight(100)
                .withWidth(100)
                .build();
            const workspace = new Workspace(true, true);
            board.setCornerRadius(50);
            makeCornerRadius(board, workspace);
            expect(board.getCornerRadius()).toBe(50);
            board.resize(80, 100);
            makeCornerRadius(board, workspace);
            expect(board.getCornerRadius()).toBe(40);
        });

        it('updates correctly based on its zoom', function () {
            const board = new BoardBuilder().withWidth(100).withHeight(100).withRadius(50).build();
            const workspace = new Workspace(true, true); // Test default zoom of 0.6
            boardView = new BoardViewBuilder()
                .withBoard(board)
                .withWorkspace(workspace)
                .build();
            const initialRadius = boardView.$el.css('border-radius');
            workspace.set('zoom', 1.0);
            boardView.render();
            const rerenderedRadius = boardView.$el.css('border-radius');
            expect(initialRadius).not.toEqual(rerenderedRadius);
        });

        it('can render the locked state on load', function () {
            const board = new BoardBuilder().build();
            board.setRadiusLocked(true);
            boardView = new BoardViewBuilder().withBoard(board).build();
            const hasLockedSelector = boardView.$el.find('.locked-js').length > 0;
            const isReadOnly = boardView.$el.find('.radius input').is('[readonly]');
            expect(hasLockedSelector).toBe(true);
            expect(isReadOnly).toBe(true);
        });

        it('can be incremented/decremented by the scroll wheel', function () {
            const board = new BoardBuilder().withHeight(100).withWidth(100).build();
            const workspace = new Workspace(true, true);
            board.setCornerRadius(30);
            makeCornerRadius(board, workspace);
            const startingRadius = board.getCornerRadius();
            ReactTestUtils.Simulate.wheel(container.querySelector('.radius'), {deltaY: -1});
            const incrementedRadius = board.getCornerRadius();
            //TODO: React Simulate wheel not working
            //expect(incrementedRadius > startingRadius).toBe(true);
            ReactTestUtils.Simulate.wheel(container.querySelector('.radius'), {deltaY: 1});
            const decrementedRadius = board.getCornerRadius();
            // expect(decrementedRadius < startingRadius).toBe(true);
        });

        it('renders the context menu on right click', function () {
            const board = new BoardBuilder().withHeight(100).withWidth(100).build();
            const workspace = new Workspace(true, true);
            board.setCornerRadius(30);
            makeCornerRadius(board, workspace);
            const radiusHandle = container.querySelector('.radius');
            ReactTestUtils.Simulate.click(radiusHandle, {button: 2});
            expect($('.contextmenu li')).not.toBeNull();
        });

        it('can be locked', function () {
            const board = new BoardBuilder().build();
            events.publish(TOGGLE_CORNER_RADIUS_LOCK);
            expect(board.isRadiusLocked()).toBe(true);
        });

        it('sets a minimum height and width = R*2 when locked', function () {
            const board = new BoardBuilder().withWidth(250).withHeight(250).withRadius(100).build();
            events.publish(TOGGLE_CORNER_RADIUS_LOCK);
            expect(board.getMinSize()).toBe(200);
        });

        describe("input", function () {
            it('can update the corner radius', function () {
                const board = new BoardBuilder()
                    .withHeight(100)
                    .withWidth(100)
                    .build();
                const workspace = new Workspace(true, true);
                board.setCornerRadius(10);
                makeCornerRadius(board, workspace);
                expect(board.getCornerRadius()).toBe(10);
                const input = container.querySelector('.radius input');
                input.value = 5; // mm; 50 in Geppetto units
                ReactTestUtils.Simulate.input(input);
                expect(board.getCornerRadius()).toBe(50);
            });

            it('obeys the radius maximum and minimum size', function () {
                const board = new BoardBuilder().withWidth(100).withHeight(100).build();
                const workspace = new Workspace(true, true);
                makeCornerRadius(board, workspace);
                const input = container.querySelector('.radius input');
                input.value = 20; // mm; 200 in Geppetto units
                ReactTestUtils.Simulate.input(input);
                expect(board.getCornerRadius()).toBe(50);
                expect(input.value).toBe('5');

                input.value = -5;
                ReactTestUtils.Simulate.input(input);
                expect(board.getCornerRadius()).toBe(0);
                expect(input.value).toBe('0');
            });

            it('can be incremented/decremented by the arrow keys', function () {
                const board = new BoardBuilder().withWidth(100).withHeight(100).build();
                const workspace = new Workspace(true, true);
                board.setCornerRadius(30);
                makeCornerRadius(board, workspace);
                const startingRadius = board.getCornerRadius();
                const input = container.querySelector('.radius input');
                ReactTestUtils.Simulate.keyPress(input, {keyCode: 38});
                const incrementedRadius = board.getCornerRadius();
                expect(incrementedRadius > startingRadius).toBe(true);

                ReactTestUtils.Simulate.keyPress(input, {keyCode: 40});
                ReactTestUtils.Simulate.keyPress(input, {keyCode: 40});
                const decrementedRadius = board.getCornerRadius();
                expect(decrementedRadius < startingRadius).toBe(true);
            });

            it('triggers BOARD_DIMENSIONS_CHANGED on select key presses', function () {
                const board = new BoardBuilder().withWidth(100).withHeight(100).build();
                const workspace = new Workspace(true, true);
                board.setCornerRadius(10);
                makeCornerRadius(board, workspace);
                const input = container.querySelector('.radius input');
                let numEventsFired = 0;
                events.subscribe(BOARD_DIMENSIONS_CHANGED, () => numEventsFired++);
                ReactTestUtils.Simulate.keyPress(input, {keyCode: 38});
                ReactTestUtils.Simulate.keyPress(input, {keyCode: 40});
                input.value = -5;
                ReactTestUtils.Simulate.input(input);
                expect(numEventsFired).toEqual(3);
            });


            it('undo radius change', function () {
                const board = new BoardBuilder().withWidth(100).withHeight(100).build();
                const workspace = new Workspace(true, true);
                makeCornerRadius(board, workspace);
                const input = container.querySelector('.radius input');
                input.value = 5; // mm; 50 in Geppetto units
                ReactTestUtils.Simulate.input(input);
                expect(board.getCornerRadius()).toBe(50);
                actions.undo();
                expect(board.getCornerRadius()).toBe(0);
            });

            it('redo radius change', function () {
                const board = new BoardBuilder().withWidth(100).withHeight(100).build();
                const workspace = new Workspace(true, true);
                makeCornerRadius(board, workspace);
                const input = container.querySelector('.radius input');
                input.value = 5; // mm; 50 in Geppetto units
                ReactTestUtils.Simulate.input(input);
                expect(board.getCornerRadius()).toBe(50);
                actions.undo();
                expect(board.getCornerRadius()).toBe(0);
                actions.redo();
                expect(board.getCornerRadius()).toBe(50);
            });
        });
    });
});
