import {BoardView, BoardViewOptions} from "../../src/view/BoardView";
import {Board} from "../../src/model/Board";
import {BoardBuilder} from "./BoardBuilder";
import {Workspace} from "../../src/workspace/Workspace";
import {ServerID} from "../../src/model/types";
import {Point} from "../../src/utils/geometry";


export class BoardViewBuilder {
    private board: Board;
    private workspace: Workspace;

    constructor() {
        this.board = new BoardBuilder().build();
        this.workspace = new Workspace(true, true);
    }

    withBoard(board: Board): BoardViewBuilder {
        this.board = board;
        return this;
    }

    withWorkspace(workspace: Workspace): BoardViewBuilder {
        this.workspace = workspace;
        return this;
    }

    build(): BoardView {
        return new BoardView({
            model: this.board,
            workspace: this.workspace,
            addModuleById: (id: ServerID, position: Point) => {},
            addLogo: (position: Point) => {},
            findModule: (id) => {}
        } as BoardViewOptions);
    }
}
