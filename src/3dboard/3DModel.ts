/*
* 3D Model View
*/
import * as $ from 'jquery';

import 'lib/ThreeCSG';
import * as THREE_STL from 'lib/threeStl';
import * as THREE from 'three';
import {Object3D} from 'three';
import * as _ from 'underscore';
import {downloadString} from 'utils/download';
import events from 'utils/events';
import {PlacedModule} from "../placedmodule/PlacedModule";
import {ModelFileTypes, parseModelData} from "./Parser";
import {Board} from "../model/Board";
import {DesignController} from "../design/DesignController";
import * as Sentry from '@sentry/browser';
import {Observable} from "rxjs";

declare const ThreeCSG;


const boardThickness = 8.5;

const modelfile_fetch_promises: {[url: string]: Observable<string>} = {};
let dialog;
let view;
let renderer;
let scene;
let camera;
let camera_light;
let top_light;
let bottom_light;

function render() {
    scene.remove(camera_light);
    camera_light.position.copy(camera.position);
    scene.add(camera_light);
    renderer.render(scene, camera);
}

function deg_to_rad(angle: number): number {
    return angle * Math.PI / 180;
}

function camera_perspective_helper(camera: THREE.Camera) {
    return _.bindAll({
        x: 0,
        y: 0,
        z: 0,
        theta: 0,
        phi: 0,
        rho: 0,
        phi_max: deg_to_rad(89.9),
        phi_min: deg_to_rad(-89.9),
        update_position: function () {
            this.enforce_limits();
            camera.position.x = this.rho * Math.cos(this.phi) * Math.cos(this.theta) + this.x;
            camera.position.y = this.rho * Math.cos(this.phi) * Math.sin(this.theta) + this.y;
            camera.position.z = this.rho * Math.sin(this.phi) + this.z;
            camera.lookAt(new THREE.Vector3(this.x, this.y, this.z));
        },
        enforce_limits: function () {
            if (this.phi_max && this.phi > this.phi_max) {
                this.phi = this.phi_max;
            }
            if (this.phi_min && this.phi < this.phi_min) {
                this.phi = this.phi_min;
            }
            if (this.rho_max && this.rho > this.rho_max) {
                this.rho = this.rho_max;
            }
            if (this.rho_min && this.rho < this.rho_min) {
                this.rho = this.rho_min;
            }
        },
        move: function (modifier) {
            _.each(modifier, (delta, attribute) => {
                this[attribute] += delta;
            });
            this.update_position();
        },
        set: function (attributes) {
            _.each(attributes, (delta, attribute) => {
                this[attribute] = delta;
            });
            this.update_position();
        }
    }, 'update_position', 'enforce_limits', 'move', 'set');
}

function scene_module_helper(scene) {
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

function openDialog(options) {
    const listen = [
        'Action.executed.3D',
        'Action.reversed.3D',
        'Board.resize.3D',
        'Board.radiusResize.3D'
    ];

    dialog.dialog(options);
    dialog.dialog('open');

    events.subscribe(listen.join(' '), buildboard)
}

function closeDialog() {
    dialog.dialog('close');
    events.unsubscribe('.3D');
}

function captureImage() {
    const oCanvas = $('canvas')[0] as HTMLCanvasElement;
    const encoded = oCanvas.toDataURL("image/png");
    const image = encoded.match(/.*?,([\s\S]*)/)[1];

    events.publishEvent('capture', {image: image});
    closeDialog();
}

function getRoundedBoard(board: Board): THREE.ExtrudeGeometry {
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
        Math.PI, Math.PI/2,
        true // Clockwise
    );

    boardShape.lineTo(x + width - radius, y + height); // D
    boardShape.arc( // D-E
        0, -radius,
        radius,
        Math.PI/2, 0,
        true // Clockwise
    );

    boardShape.lineTo(x + width, y + radius); // F
    boardShape.arc( // F-G
        -radius, 0,
        radius,
        0, Math.PI*1.5,
        true // Clockwise
    );

    boardShape.lineTo(x + radius, y); // H
    boardShape.arc( // H-A
        0, radius,
        radius,
        Math.PI*1.5, Math.PI,
        true // Clockwise
    );

    const extrudeSettings = {
        amount: boardThickness,
        bevelEnabled: false
    };
    return new THREE.ExtrudeGeometry(boardShape, extrudeSettings);
}

function getBoxBoard(board: Board): THREE.BoxGeometry {
    return new THREE.BoxGeometry(board.getWidth(), board.getHeight(), boardThickness);
}

function getBaseBoard(board: Board, boardMaterial: THREE.MeshLambertMaterial): THREE.Mesh {
    let boardGeometry;
    let positionZ;

    if (board.getCornerRadius() === 0) {
        // Without a corner radius, there's no need for arcs, so we can use a regular BoxGeometry.
        boardGeometry = getBoxBoard(board);
        positionZ = boardThickness / 2;
    } else {
        boardGeometry = getRoundedBoard(board);
        positionZ = 0;
    }

    const boardMesh = new THREE.Mesh(boardGeometry, boardMaterial);
    boardMesh.position.x = board.getWidth() / 2;
    boardMesh.position.y = board.getHeight() / 2;
    boardMesh.position.z = positionZ;

    return boardMesh;
}

function createBoardMesh(): THREE.Mesh {
    const currentDesign = DesignController.getCurrentDesign();
    const board = currentDesign.board;
    const modules = currentDesign.getPlacedModules();
    const boardMaterial = new THREE.MeshLambertMaterial({color: 0x307B40, reflectivity: 0.5});
    let board_mesh = getBaseBoard(board, boardMaterial);
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

function center_camera() {
    camera.perspective.set({
        x: top_light.position.x,
        y: top_light.position.y
    });
    render();
}

/*
* Update the scene when the model is changed
*/
function buildboard() {
    const currentDesign = DesignController.getCurrentDesign();
    const board = currentDesign.board;
    const board_x = board.getWidth() / 2;
    const board_y = board.getHeight() / 2;

    if (dialog.dialog('isOpen') === false) {
        return;
    }

    top_light.position.x = board_x;
    top_light.position.y = board_y;
    bottom_light.position.x = board_x;
    bottom_light.position.y = board_y;

    scene.modules.clear();

    const board_mesh = createBoardMesh();
    scene.modules.add(board_mesh);

    const modules = currentDesign.getPlacedModules();
    if (modules.length === 0) {
        render();
    } else {
        loadModelFiles(modules, addSceneModule);
    }
}

function getExportString() {
    const exporter = new (THREE_STL as any).STLExporter();
    downloadString(exporter.parse(scene), 'model.stl', 'text/plain');
}

function addSceneModule(placed_module: PlacedModule, module_object: Object3D) {
    module_object.castShadow = true;
    module_object.receiveShadow = true;
    module_object.scale.x = 10;
    module_object.scale.y = 10;
    module_object.scale.z = 10;
    module_object.position.x = placed_module.boardPosition.x;
    module_object.position.y = placed_module.boardPosition.y;
    module_object.rotation.z = deg_to_rad(placed_module.rotation);

    scene.modules.add(module_object);
    render();
}

function resize() {
    const width = view.width();
    const height = view.height();

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    render();
}

function hideMessage() {
    $(this).animate({
        top: -(2 + $(this).height())
    });
}

function initEvents() {
    const ROTATE_BUTTON = 1;  // left button
    const MOVE_BUTTON = 2;  // middle button
    const mouse = {
        x: undefined,
        y: undefined,
    };
    const MOVE_FACTOR = 1 / 300;
    const ZOOM_FACTOR = 100;

    view.mousewheel(function (event, delta) {
        camera.perspective.move({
            rho: -delta * ZOOM_FACTOR
        });
        render();
    });

    view.mousedown(function (e) {
        handleDrag(e);
        e.preventDefault();
        mouse.x = e.pageX;
        mouse.y = e.pageY;
        hideMessage.call($('#display-msg'));
    });

    function getDelta(event) {
        return {
            x: event.pageX - mouse.x,
            y: event.pageY - mouse.y
        };
    }

    function handleDrag(event) {
        const isMoveButton = event.which === MOVE_BUTTON;
        const isRotateButton = event.which === ROTATE_BUTTON;

        $(document).mousemove((moveEvent) => {
            if (isRotateButton) {
                rotate(moveEvent);
            } else if (isMoveButton) {
                move(moveEvent);
            }
            mouse.x = moveEvent.pageX;
            mouse.y = moveEvent.pageY;
        }).mouseup(() => {
            $(document).off('mousemove');
            $(document).off('mouseup');
        });
    }

    function rotate(moveEvent) {
        const delta = getDelta(moveEvent);
        camera.perspective.move({
            theta: deg_to_rad(-delta.x),
            phi: deg_to_rad(delta.y)
        });
        render();
    }

    function move(moveEvent) {
        const delta = getDelta(moveEvent);
        const use_y = delta.y * Math.sin(camera.perspective.phi);
        const move = MOVE_FACTOR * camera.perspective.rho;
        const theta = camera.perspective.theta;
        camera.perspective.move({
            x: move * (delta.x * Math.sin(theta) - use_y * Math.cos(theta)),
            y: -move * (delta.x * Math.cos(theta) + use_y * Math.sin(theta))
        });
        render();
        moveEvent.preventDefault();
    }

    events.subscribe({
        "bom.selected": buildboard
    });
}

function initFixedLights() {
    bottom_light = new THREE.PointLight(0xFFFFFF, 0.8);
    top_light = new THREE.PointLight(0xFFFFFF, 0.8);

    bottom_light.position.set(0, 0, -500);
    top_light.position.set(0, 0, 500);

    scene.add(bottom_light);
    scene.add(top_light);
}

function initLights() {
    initFixedLights();
    camera_light = new THREE.PointLight(0xFFFFFF, 0.5);
    scene.add(camera_light);
}

function addgeom(module: PlacedModule,
                 modelObject: Object3D,
                 modelData: string,
                 type: ModelFileTypes): Object3D {
    const rotation = new THREE.Matrix4();
    const translation = new THREE.Matrix4();

    // TODO: Is this code ever executed anymore?
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

function processModelData(module: PlacedModule,
                          modelData: string): Observable<THREE.Object3D> {
    return new Observable<THREE.Object3D>(subscriber => {
        parseModelData(modelData).subscribe(
            res => {
                subscriber.next(addgeom(module, res.object3D, modelData, res.modelFileType));
                subscriber.complete();
            },
            err => {
                subscriber.error(err);
                subscriber.complete();
            });
    });
}

function loadModelFiles(placedModules: PlacedModule[],
                        callback: (
                            module: PlacedModule, model_object: Object3D
                        ) => void): void {
    for (const placedModule of placedModules) {
        const modelFile = placedModule.getModelFile();
        fetchModelFileContents(modelFile).subscribe(data => {
            processModelData(placedModule, data).subscribe(object3D => {
               callback(placedModule, object3D);
            });
        });
    }
}

function fetchModelFileContents(url: string): Observable<string> {
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

function init() {
    dialog = $("#container-3d");
    view = $("#viewport-3d");

    // set up the camera
    // fov, aspect, near, far
    camera = new THREE.PerspectiveCamera(50, 1, 10, 10000);
    // z+ is out of the board
    camera.up.set(0, 0, 1);
    camera.perspective = camera_perspective_helper(camera);
    camera.perspective.set({
        x: 0,
        y: 0,
        z: 0,
        theta: deg_to_rad(-90),
        phi: deg_to_rad(45),
        rho: 1500,
        rho_max: 5000,
        rho_min: 100
    });

    $('#display-msg').button().click(hideMessage);


    dialog.dialog({
        autoOpen: false,
        open: resize,
        resizable: true,
        resize: resize,
        height: 300,
        width: 400,
        minWidth: 200
    });

    initEvents();

    /*
     * create a WebGL renderer, camera, and a scene
     */
    renderer = new THREE.WebGLRenderer({
        antialias: true,
        preserveDrawingBuffer: true,
    });
    renderer.setClearColor(0xffffff, 1); // the background color
    renderer.shadowMap.enabled = true;

    scene = new THREE.Scene();
    scene.modules = scene_module_helper(scene);

    // attach the render-supplied DOM element
    view.append(renderer.domElement);

    initLights();
    resize();
}

export default {
    init: init,
    buildboard: buildboard,
    center_camera: center_camera,
    openDialog: openDialog,
    closeDialog: closeDialog,
    dialog: dialog,
    captureImage: captureImage,
    getExportString: getExportString
};
