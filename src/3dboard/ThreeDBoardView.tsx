import * as React from "react";
import 'lib/ThreeCSG';
import * as THREE from 'three';
import {Object3D} from 'three';
import {DesignController} from "../design/DesignController";
import {Board} from "../model/Board";
import {PlacedModule} from "../placedmodule/PlacedModule";
import {Observable} from "rxjs";
import {ModelFileTypes, parseModelData} from "./Parser";
import * as Sentry from "@sentry/browser";
import {Workspace} from "../workspace/Workspace";
import * as _ from "underscore";

interface ThreeDBoardViewProps {
    workspace: Workspace;
    board: Board;
    boardOffset?: number[];
    modules: PlacedModule[];
}

interface ThreeDboardViewState {
    isShown: boolean;
    modules: PlacedModule[];
}

declare const ThreeCSG;
const boardThickness = 8.5;
const modelfile_fetch_promises: { [url: string]: Observable<string> } = {};
let scene;
let camera;
let renderer;
let pointLight;

export class ThreeDBoardView extends React.Component<ThreeDBoardViewProps, ThreeDboardViewState> {
    boardRef;
    private static BOARD_COLOR = 0x307B40;

    constructor(props: ThreeDBoardViewProps) {
        super(props);
        this.state = {
            isShown: false,
            modules: [],
        }
        this.boardRef = React.createRef();
    }

    componentWillReceiveProps(nextProps: Readonly<ThreeDBoardViewProps>, nextContext: any) {
        const width = Math.ceil(nextProps.board.getWidth() * nextProps.workspace.scale);
        const height = Math.ceil(nextProps.board.getHeight() * nextProps.workspace.scale);

        if (nextProps.modules) {
            scene.modules.clear();
            const board_mesh = this.createBoardMesh();
            scene.modules.add(board_mesh);
            this.loadModelFiles(nextProps.modules, this.addSceneModule);
            camera = new THREE.OrthographicCamera(0, nextProps.board.getWidth(),
                nextProps.board.getHeight(), 0, -1000, 10000);
            renderer.setSize(width, height);
            pointLight.position.set(nextProps.board.getWidth() / 2, nextProps.board.getHeight() / 2, 500);
            this.setState({modules: nextProps.modules});
        }
    }

    componentDidMount() {
        const width = Math.ceil(this.props.board.getWidth() * this.props.workspace.scale);
        const height = Math.ceil(this.props.board.getHeight() * this.props.workspace.scale);

        // init scene
        scene = new THREE.Scene();
        scene.background = new THREE.Color('white');
        scene.modules = this.scene_module_helper(scene);

        // init camera
        camera = new THREE.OrthographicCamera(0, this.props.board.getWidth(),
            this.props.board.getHeight(), 0, -1000, 10000);

        // init light
        pointLight = new THREE.PointLight(0xffffff, 0.8);
        pointLight.position.set(this.props.board.width / 2, this.props.board.height / 2, 500);
        scene.add(pointLight);

        // init renderer
        renderer = new THREE.WebGLRenderer({
            antialias: true,
            preserveDrawingBuffer: true,
        });
        // renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(width, height);
        renderer.setClearColor(0x000000, 1);

        // load models
        scene.modules.clear();
        const board_mesh = this.createBoardMesh();
        scene.modules.add(board_mesh);
        const modules = this.props.modules;
        if (modules.length === 0) {
            renderer.render(scene, camera);
        } else {
            this.loadModelFiles(modules, this.addSceneModule);
        }

        //render the board
        this.boardRef.appendChild(renderer.domElement);
        const animate = () => {
            requestAnimationFrame(animate);
            renderer.render(scene, camera);
        }
        animate();
    }

    render() {
        if (this.props.boardOffset) {
            return (
                <div id="threed-canvas-board"
                     ref={ref => this.boardRef = ref}
                     style={{
                         width: Math.ceil(this.props.board.width * this.props.workspace.scale),
                         height: Math.ceil(this.props.board.height * this.props.workspace.scale),
                         left: this.props.boardOffset[0],
                         top: this.props.boardOffset[1],
                     }}/>
            );
        }
        return (
            <div id="threed-canvas-board"
                 ref={ref => this.boardRef = ref}
                 style={{
                     width: Math.ceil(this.props.board.width * this.props.workspace.scale),
                     height: Math.ceil(this.props.board.height * this.props.workspace.scale),
                 }}/>
        );
    }

    private getRoundedBoard(board: Board): THREE.ExtrudeGeometry {
        const boardShape = new THREE.Shape();
        const radius = board.getCornerRadius();
        const width = board.getWidth();
        const height = board.getHeight();
        const x = -width / 2;
        const y = -height / 2;

        /**
         *   Draw the board:
         *
         *            lineTo
         *    arc     (G->H)     arc         Arcs (radians):
         *  (H->A)  H________G  (F->G)           PI*1.5
         *        A            F                   |
         * lineTo |            |  lineTo     PI  -   - 0 / PI*2
         * (A->B) |            |  (E->F)           |
         *        B            E                  PI/2
         *    arc   C________D    arc
         *  (B->C)    lineTo    (D->E)
         *            (C->D)
         */

        boardShape.moveTo(x, y + radius);  // A
        boardShape.lineTo(x, y + height - radius); // B

        boardShape.arc( // C-D
            radius, 0, // arc centre relative to previous point
            radius,
            Math.PI, Math.PI / 2,
            true // Clockwise
        );

        boardShape.lineTo(x + width - radius, y + height); // D
        boardShape.arc( // D-E
            0, -radius,
            radius,
            Math.PI / 2, 0,
            true // Clockwise
        );

        boardShape.lineTo(x + width, y + radius); // F
        boardShape.arc( // F-G
            -radius, 0,
            radius,
            0, Math.PI * 1.5,
            true // Clockwise
        );

        boardShape.lineTo(x + radius, y); // H
        boardShape.arc( // H-A
            0, radius,
            radius,
            Math.PI * 1.5, Math.PI,
            true // Clockwise
        );

        const extrudeSettings = {
            amount: boardThickness,
            bevelEnabled: false
        };
        return new THREE.ExtrudeGeometry(boardShape, extrudeSettings);
    }

    private getBoxBoard(board: Board): THREE.BoxGeometry {
        return new THREE.BoxGeometry(board.getWidth(), board.getHeight(), boardThickness);
    }

    private getBaseBoard(board: Board, boardMaterial: THREE.MeshLambertMaterial): THREE.Mesh {
        let boardGeometry;
        let positionZ;

        if (board.getCornerRadius() === 0) {
            // Without a corner radius, there's no need for arcs, so we can use a regular BoxGeometry.
            boardGeometry = this.getBoxBoard(board);
            positionZ = boardThickness / 2;
        } else {
            boardGeometry = this.getRoundedBoard(board);
            positionZ = 0;
        }

        const boardMesh = new THREE.Mesh(boardGeometry, boardMaterial);
        boardMesh.position.x = board.getWidth() / 2;
        boardMesh.position.y = board.getHeight() / 2;
        boardMesh.position.z = positionZ;

        return boardMesh;
    }

    private createBoardMesh(): THREE.Mesh {
        const currentDesign = DesignController.getCurrentDesign();
        const board = currentDesign.board;
        const modules = currentDesign.getPlacedModules();
        const boardMaterial = new THREE.MeshLambertMaterial({color: ThreeDBoardView.BOARD_COLOR, reflectivity: 0.5});
        let board_mesh = this.getBaseBoard(board, boardMaterial);
        const holes_geometry = new THREE.Geometry();

        for (const placed_module of modules) {
            if (placed_module.name === 'Mounting Hole') {
                const rotation = new THREE.Matrix4();
                const translation = new THREE.Matrix4();
                // TODO: Un-hardcode top right corner.
                const top_right = placed_module.getFootprintPolylines()[0].points[2];
                const hole_mesh = new THREE.Mesh(new THREE.CylinderGeometry(11, 11, boardThickness, 15, 1, false), boardMaterial);
                rotation.makeRotationX(deg_to_rad(90));
                hole_mesh.geometry.applyMatrix(rotation);
                const transVector = placed_module.boardPosition.add(top_right).multiply(0.5);
                translation.makeTranslation(transVector.x, transVector.y, boardThickness / 2);
                hole_mesh.geometry.applyMatrix(translation);
                holes_geometry.mergeMesh(hole_mesh);
            }
        }

        if (holes_geometry.vertices.length === 0) {
            return board_mesh;
        }

        let board_csg = new ThreeCSG(board_mesh);
        const holes_csg = new ThreeCSG(holes_geometry);
        board_csg = board_csg.subtract(holes_csg);

        board_mesh = board_csg.toMesh(boardMaterial);
        board_mesh.receiveShadow = true;
        board_mesh.castShadow = false;

        return board_mesh;
    }

    private addSceneModule(placed_module: PlacedModule, module_object: Object3D) {
        module_object.castShadow = true;
        module_object.receiveShadow = true;
        module_object.scale.x = 10;
        module_object.scale.y = 10;
        module_object.scale.z = 10;
        module_object.position.x = placed_module.boardPosition.x;
        module_object.position.y = placed_module.boardPosition.y;
        module_object.rotation.z = deg_to_rad(placed_module.rotation);

        scene.modules.add(module_object);
    }

    private loadModelFiles(placedModules: PlacedModule[],
                           callback: (
                               module: PlacedModule, model_object: Object3D
                           ) => void): void {
        for (const placedModule of placedModules) {
            const modelFile = placedModule.getModelFile();
            this.fetchModelFileContents(modelFile).subscribe(data => {
                this.processModelData(placedModule, data).subscribe(object3D => {
                    callback(placedModule, object3D);
                });
            });
        }
    }

    private fetchModelFileContents(url: string): Observable<string> {
        if (!(url in modelfile_fetch_promises)) {
            modelfile_fetch_promises[url] = new Observable<string>(subscriber => {
                if (url) {
                    fetch(url).then(response => {
                        response.text().then(data => {
                            subscriber.next(data);
                            subscriber.complete();
                        });
                    });
                }
            });
        }
        return modelfile_fetch_promises[url];
    }

    private processModelData(module: PlacedModule,
                             modelData: string): Observable<THREE.Object3D> {
        return new Observable<THREE.Object3D>(subscriber => {
            parseModelData(modelData).subscribe(
                res => {
                    subscriber.next(this.addgeom(module, res.object3D, modelData, res.modelFileType));
                    subscriber.complete();
                },
                err => {
                    subscriber.error(err);
                    subscriber.complete();
                });
        });
    }

    private addgeom(module: PlacedModule,
                    modelObject: Object3D,
                    modelData: string,
                    type: ModelFileTypes): Object3D {
        const rotation = new THREE.Matrix4();
        const translation = new THREE.Matrix4();

        // TODO: Is this code ever executed anymore?
        // Tested on multiple Gumstix designs, the code doesn't executed.
        if (type === ModelFileTypes.JSON_MODEL_FORMAT_3 &&
            !JSON.parse(modelData).version &&
            modelObject instanceof THREE.Mesh) {
            Sentry.captureMessage('3DModel.addgeom() used', Sentry.Severity.Log);
            const outline = module.getDisplayOutline();
            rotation.makeRotationX(deg_to_rad(90));
            modelObject.geometry.applyMatrix(rotation);
            translation.makeTranslation(
                outline.xmax / 20,
                outline.ymax / 20,
                boardThickness / 5
            );
            modelObject.geometry.applyMatrix(translation);
        }
        return modelObject;
    }

    private scene_module_helper(scene) {
        return _.bindAll({
            modules: [],
            add: function (model) {
                scene.add(model);
                this.modules.push(model);
            },
            clear: function () {
                _.each(this.modules, function (module) {
                    scene.remove(module);
                });
                this.modules = [];
            }
        }, 'add', 'clear');
    }
}

function deg_to_rad(angle: number): number {
    return angle * Math.PI / 180;
}