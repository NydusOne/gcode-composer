// ugly global to communicate between view and model....
var scene = null;
var bed = null;

var THREE = require('three');

$(function() {
    if ( ! Detector.webgl ) Detector.addGetWebGLMessage();

    var camera;
    var webglRenderer;

    var mouseX = 0, mouseY = 0;
    var mousemoveX = 0, mousemoveY = 0;

    init();
    animate();

    function init() {
        container = document.getElementById( 'viewport' );

        //scene
        scene = new THREE.Scene();
        scene.add( new THREE.AmbientLight( 0x999999 ) );

        // camera
        camera = new THREE.PerspectiveCamera( 35, window.innerWidth / window.innerHeight, 1, 100 );
        camera.up.set( 0, 0, 1 );
	      camera.position.set( 10, -9, 6 );
        camera.add( new THREE.PointLight( 0xffffff, 0.8 ) );
        scene.add(camera);

        bed = new PrintBedHelper( 25, 21, 5, 0x555555 );
        scene.add( bed );

        var gizmo = new THREE.AxesHelper(1.5);
        gizmo.translateZ(0.01);
        scene.add(gizmo);

        // renderer
        webglRenderer = new THREE.WebGLRenderer();
        webglRenderer.setClearColor( 0x999999 );
        webglRenderer.setPixelRatio( window.devicePixelRatio );
        webglRenderer.setSize( window.innerWidth/2, window.innerHeight/2 );
        webglRenderer.domElement.style.position = "relative";
        container.appendChild( webglRenderer.domElement );

        // controller
        var controls = new THREE.OrbitControls( camera, webglRenderer.domElement );
        controls.addEventListener( 'change', render );
        controls.target.set( 10, 10, 2 );
        controls.update();
        window.addEventListener( 'resize', onWindowResize, false );
    }

    function animate() {
        requestAnimationFrame( animate );
        render();
    }

    function render() {
        webglRenderer.render( scene, camera );
    }

    function onWindowResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        webglRenderer.setSize( window.innerWidth/2, window.innerHeight/2 );
        render();
    }
});
