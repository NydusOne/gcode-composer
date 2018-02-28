var THREE = require('three');

function PrintBedHelper( sizeX, sizeY, step, color ) {
	color = new THREE.Color( color !== undefined ? color : 0x444444 );

	// color and vertex buffer
	var vertices = [], colors = [];
  var bufferOffset=0;

	// create lines in x direction
  for ( var x = 0; x < sizeX; x+=step) {
		vertices.push( x, 0, 0, x, sizeY, 0 );

		color.toArray( colors, bufferOffset ); bufferOffset += 3;
		color.toArray( colors, bufferOffset ); bufferOffset += 3;
	}
  vertices.push( sizeX, 0, 0, sizeX, sizeY, 0 );
  color.toArray( colors, bufferOffset ); bufferOffset += 3;
  color.toArray( colors, bufferOffset ); bufferOffset += 3;

	// create the lines in y direction
  for ( var y = 0; y < sizeY; y+=step) {
    vertices.push( 0, y, 0, sizeX, y, 0 );

		color.toArray( colors, bufferOffset ); bufferOffset += 3;
		color.toArray( colors, bufferOffset ); bufferOffset += 3;
	}
  vertices.push( 0, sizeY, 0, sizeX, sizeY, 0  );
  color.toArray( colors, bufferOffset ); bufferOffset += 3;
  color.toArray( colors, bufferOffset ); bufferOffset += 3;

	var geometry = new THREE.BufferGeometry();
	geometry.addAttribute( 'position', new THREE.Float32BufferAttribute( vertices, 3 ) );
	geometry.addAttribute( 'color', new THREE.Float32BufferAttribute( colors, 3 ) );

	var material = new THREE.LineBasicMaterial( { vertexColors: THREE.VertexColors } );

	THREE.LineSegments.call( this, geometry, material );
}

PrintBedHelper.prototype = Object.create( THREE.LineSegments.prototype );
PrintBedHelper.prototype.constructor = PrintBedHelper;

module.exports = PrintBedHelper;
