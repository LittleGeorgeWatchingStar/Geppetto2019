/**
 * Add any additional extensions to THREE here. For example, we add exporters
 * that are not in the minified script
 *
 * https://github.com/mrdoob/three.js/blob/master/examples/js/exporters/STLExporter.js
 */
define(function (require) {
    var THREE_STL = require('three');

    THREE_STL.STLExporter = function () {};

    THREE_STL.STLExporter.prototype = {

        constructor: THREE_STL.STLExporter,

        parse: ( function () {

            var vector = new THREE_STL.Vector3();
            var normalMatrixWorld = new THREE_STL.Matrix3();

            return function parse( scene ) {

                var output = '';

                output += 'solid exported\n';

                scene.traverse( function ( object ) {

                    if ( object instanceof THREE_STL.Mesh ) {

                        var geometry = object.geometry;
                        var matrixWorld = object.matrixWorld;

                        if ( geometry instanceof THREE_STL.BufferGeometry ) {

                            geometry = new THREE_STL.Geometry().fromBufferGeometry( geometry );

                        }

                        if ( geometry instanceof THREE_STL.Geometry ) {

                            var vertices = geometry.vertices;
                            var faces = geometry.faces;

                            normalMatrixWorld.getNormalMatrix( matrixWorld );

                            for ( var i = 0, l = faces.length; i < l; i ++ ) {

                                var face = faces[ i ];

                                vector.copy( face.normal ).applyMatrix3( normalMatrixWorld ).normalize();

                                output += '\tfacet normal ' + vector.x + ' ' + vector.y + ' ' + vector.z + '\n';
                                output += '\t\touter loop\n';

                                var indices = [ face.a, face.b, face.c ];

                                for ( var j = 0; j < 3; j ++ ) {

                                    vector.copy( vertices[ indices[ j ] ] ).applyMatrix4( matrixWorld );

                                    output += '\t\t\tvertex ' + vector.x + ' ' + vector.y + ' ' + vector.z + '\n';

                                }

                                output += '\t\tendloop\n';
                                output += '\tendfacet\n';

                            }

                        }

                    }

                } );

                output += 'endsolid exported\n';

                return output;

            };

        }() )

    };

    return THREE_STL;
});