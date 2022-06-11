'use strict';

const { BrowserWindow } = require('@electron/remote');

// hide the input until an appropriate
$('#biostructureQuantity').parent().hide();

// get file system and dialogues
var app = require('@electron/remote');
var fs = app.require('fs');
var dialog = app.dialog;

// shared variables
var targetContainer = null; //!< target container geometry information
var printAreas = []; //!< the areas we can print into
var biostructureGCodes = []; //!< the biostructures' gcodes we print per area

// device constants
const EXTRUDER_TRAVEL_SPEED = 0.2; //!< empirical value for extruder travel speed
const EXTRUDER_DOCK_SPEED = 0.02; //!< empirical value for extruder docking speed
const STEPPER_RATIO = 25600; //!< ratio for direct transmission into ml/s extrusion
const EXTRUDER_AXIS_LENGTH = 6.8; //!< extruder axis length in cm
const EXTRUDER_Y_OFFSET = 4.5; //< extruder depth offset in cm
const EXTRUDER_Z_OFFSET  = 1.0;//< extruder height offset in cm

// additional constants
const TOLERANCE = 0.02; //!< 2% tolerance to compensate measurement inaccuracies

// only some unsafe gcodes are within this list....
///@todo complete this list!
const UNSAFE_GCODES = [
    'M81', // power off
    'G28', 'G80', // move home
    'G29', // bed leveling
    'M84', // disable motors
    'M906' // set motor currents
];


// utility functions
function limitTo3DecimalPlaces(number) {
    return Math.round(number*1000)/1000;
}


// move the target's center to bed's center
function centerContainer(container) {
    var bbox = new THREE.Box3().setFromObject(container);
    var toCenterAxis = new THREE.Vector3(); 
    bbox.getCenter(toCenterAxis);
    toCenterAxis.negate();
    toCenterAxis.normalize();
    container.translateOnAxis(toCenterAxis, toCenterAxis.length());

    bbox.setFromObject(bed);
    bbox.getCenter(toCenterAxis);
    container.translateX(toCenterAxis.x);
    container.translateY(toCenterAxis.y);
    container.translateZ(bbox.min.z);

    var bbox = new THREE.Box3().setFromObject(container);
    container.translateZ(-bbox.min.z);
}



function availablePrintSlots(printAreas) {
    var sum = 0;
    printAreas.forEach(function(area){
        if(area.material.color.r == 1){
            sum++;
        }
    });
    return sum;
}



function loadTargetContainerFromObjFile(fileName) {
    var loader = new THREE.OBJLoader();
    loader.load(fileName, function(objObject) {
        // extract print areas from file and initialize materials to aid
        // visualization of the current experiment design
        objObject.traverse( function ( child ) {
            if(child instanceof THREE.Mesh ) {
                if(child.material.name == "PrintArea"){
                    printAreas.push(child);
                    child.material.transparent = true;
                    child.material.opacity = 0.5;
                    child.material.color.setRGB(1,0,0);
                }
            }
        });

        //
        if(printAreas.length == 0) {
            dialog.showErrorBox("", 'Target container must contain at least one tagged print area via metadata (name="PrintArea").');
            return;
        }

        // add new structure to scene and program
        targetContainer = objObject;
        objObject.add(new THREE.BoxHelper(targetContainer));
        scene.add(targetContainer);

        // move the target's center to bed's center
        centerContainer(objObject);

        // update ui
        $('#targetContainerFileName').val(fileName);
        $('#biostructureQuantity').attr({'max':availablePrintSlots(printAreas)});
        $('#biostructureQuantity').parent().show(100);
    });
}


// connect events with callbacks
$(function(){
    $('#loadTargetContainerButton').on("click", function(){
        dialog.showOpenDialog(BrowserWindow, {properties: ["openFile"]}).then(function (result) {
            if (result.cancelled) {
                return;
            }

            // remove previous target container from scene
            if(targetContainer){
                scene.remove(targetContainer.name);
                printAreas = [];
            }

            // load new target container
            loadTargetContainerFromObjFile(result.filePaths[0]);
        });
    });

    $('#biostructureFileButton').on("click", function(){
        dialog.showOpenDialog(BrowserWindow, {properties: ["openFile"]}).then(function (result) {
            if (result.cancelled) {
                return;
            }

             if(availablePrintSlots(printAreas) == 0)
             {
               dialog.showErrorBox("Unable to add biostructure", "All printable volumes are in use.");
               return;
             }

             fs.readFile(result.filePaths[0], 'utf-8', function (err, data) {
                 if(err){
                     dialog.showErrorBox("", "An error ocurred loading the file: " + err.message);
                     return;
                 }

                 if(!data){
                     dialog.showErrorBox("", "Empty file.");
                     return;
                 }

                 // poor mans gcode validation
                 var isValid = data.split('\n').every(function(line, lineNum){
                     line = line.trim();
                     if(line[0] == 'M' || line[0] == 'G' || line[0] == ';' || line.length == 0){
                         return true;
                     }
                     dialog.showErrorBox("", "Invalid GCode at line " + (lineNum+1) + ": " + line);
                     return false;
                 });

                 if(!isValid){
                     return;
                 }

                 var isSafe = UNSAFE_GCODES.every(function(unsafeGCode){
                     if(data.search(unsafeGCode) != -1){
                         dialog.showErrorBox("", "Unsafe biostructure. GCode: " + unsafeGCode + " found.");
                         return false;
                     }
                     return true;
                 });

                 if(isSafe){
                     var biostructureQuantity = Math.min($('#biostructureQuantity').val(), availablePrintSlots(printAreas));
                     var usedSlots = printAreas.length - availablePrintSlots(printAreas);

                     $('#biostructure-list').append('<li class="list-group-item justify-content-between">' + result.filePaths[0].substring(result.filePaths[0].lastIndexOf('/')+1) + '<span class="badge badge-default badge-pill">'+ biostructureQuantity +'</span></li>');

                     for(var i = 0; i < biostructureQuantity; i++){
                         biostructureGCodes.push(data);
                         printAreas[usedSlots+i].material.color.setRGB(0,1,0);
                     }

                     $('#biostructureQuantity').attr({'max':availablePrintSlots(printAreas)});
                 }
             });
        });
    });

    $('#composeGCodeButton').on("click", function(){
        if(targetContainer == null){
            dialog.showErrorBox("No target container found", "Choose a target container.");
            return;
        }
        if(biostructureGCodes.length == 0){
            dialog.showErrorBox("No biostructure found", "Choose at least one biostructure.");
            return;
        }

        var needleLenght = $('#needleLenght').val();
        var syringeRadius = $('#syringeRadius').val();
        var initialFill = $('#initialFill').val();

        var syringeCrossSection = Math.PI*syringeRadius*syringeRadius; // cm^2

        var amRatioExtrusion = STEPPER_RATIO/(Math.round(10*syringeCrossSection)/10)/1000;
        var zOffset = needleLenght*(1+TOLERANCE)+10*EXTRUDER_Z_OFFSET;
        var bbox = new THREE.Box3().setFromObject(targetContainer);
        var aboveTargetContainerZ = zOffset + bbox.max.z*(1.05+TOLERANCE)*10;

        var initialExtruderOffset = limitTo3DecimalPlaces(EXTRUDER_AXIS_LENGTH-initialFill/syringeCrossSection);
        var initialExtruderOffsetUpper = initialExtruderOffset*(0.98); // axis is
        var initialExtruderOffsetLower = initialExtruderOffset*(1+TOLERANCE);

        // add prolog to initialize an experiment by docking the extruder to the syringe
        var finalCode = "; Code created by gcode-composer " + new Date();
        finalCode = finalCode.concat([ "",
            "M92 E"+STEPPER_RATIO+" ; set axis-movement-ratio",
            "G21 ; Set units to millimeters",
            "M82 ; use absolute distances for extrusion",
            "M203 E"+EXTRUDER_TRAVEL_SPEED+" ;set movement rate",
            "M302 ; allow cold extrusion",
            "M0; remove syringe if plugged in",
            "G90 ; absolute positioning",
            "G80 ; mesh bed leveling",
            "M0 ; replug syringe",
            "G1 E" + initialExtruderOffsetUpper,
            "M203 E" + EXTRUDER_DOCK_SPEED +" ;set maximum feedrate",
            "G1 E" + initialExtruderOffsetLower,
            "M92 E"+amRatioExtrusion+" ; set axis-movement-ratio",
            "M83",
            "G90",
            "G92 E0 ; save extruder coordinate offset"].join("\n")
        );
        // print biostructures into volumes to execute the experiment by changing the coordinate space
        biostructureGCodes.forEach(function(biostructureGCode, index){
            var bboxPrintArea = new THREE.Box3().setFromObject(printAreas[index]);
            var areaCenter = new THREE.Vector3();
            bboxPrintArea.getCenter(areaCenter);

            // target container center with
            var containerCenterX = limitTo3DecimalPlaces(areaCenter.x*10);
            var containerCenterY = limitTo3DecimalPlaces((areaCenter.y+EXTRUDER_Y_OFFSET)*10);
            var containerGroundZ = limitTo3DecimalPlaces(zOffset+bboxPrintArea.min.z*10+TOLERANCE);

            // absolute metrics for the target container
            var containerMetrics = {
              min: {
                x: limitTo3DecimalPlaces(bboxPrintArea.min.x*10),
                y: limitTo3DecimalPlaces((bboxPrintArea.min.y+EXTRUDER_Y_OFFSET)*10)
              },
              center: {
                x: containerCenterX,
                y: containerCenterY
              },
              firstLayerOffset: containerGroundZ // z barely above the containers ground
            };

            finalCode = finalCode.concat(["",
                "G1 Z" + limitTo3DecimalPlaces(aboveTargetContainerZ),
                "G1 X" + containerMetrics.center.x + " Y" + containerMetrics.center.y,
                "G1 Z" + containerMetrics.firstLayerOffset,
                "G92 X"+(containerMetrics.center.x-containerMetrics.min.x)+" Y"+(containerMetrics.center.y-containerMetrics.min.y)+" Z0 ; relative positioning",
                biostructureGCode,
                "G90 ; absolute positioning",
                "G1 Z" + limitTo3DecimalPlaces(aboveTargetContainerZ),
                "G1 X"+(containerMetrics.center.x-containerMetrics.min.x)+" Y"+(containerMetrics.center.y-containerMetrics.min.y),
                "G92 X" + containerMetrics.center.x + " Y" + containerMetrics.center.y + " Z" + limitTo3DecimalPlaces(aboveTargetContainerZ+containerMetrics.firstLayerOffset) + "; reset coordinate system"
                ].join("\n")
            );
        });
        // add epilog to move the extruder away from target container
        finalCode = finalCode.concat(["",
            "M82",
            "M203 E"+EXTRUDER_TRAVEL_SPEED+" ;set movement rate",
            "M92 E"+STEPPER_RATIO+" ; set axis-movement-ratio to cm",
            "G1 X200 Y200 E-"+initialExtruderOffsetUpper,
            "M140 S39"].join("\n")
        );

        // update ui
        $('#gcode-preview').text(finalCode);
        $('#saveGCodeButton').prop('disabled', false);

        // render the path
        const defaultPathColor = new THREE.Color(0xFF4444);
        const createLineSegment = (v1, v2) => {
            const vertices = [
                new THREE.Vector3(v1.x, v1.y-EXTRUDER_Y_OFFSET*10, v1.z),
                new THREE.Vector3(v2.x, v2.y-EXTRUDER_Y_OFFSET*10, v2.z)
            ];
            const colors = [defaultPathColor, defaultPathColor];

            return { vertices, colors };
        };
        const Toolpath = require("./js/Toolpath.js"); // replace with gcode-toolpath, when G92 bugs fixed
        var pathGeometry = new THREE.BufferGeometry();
        var points = []
        const toolpath = new Toolpath({
            addLine: (modal, v1, v2) => {
                v1.z -= zOffset;
                v2.z -= zOffset;
                const line = createLineSegment(v1, v2);
                points.push(line.vertices[0]);
                points.push(line.vertices[1]);
            }
        });

        toolpath.loadFromString(finalCode, (line, index) => {
        })
        .on('end', (results) => {
            var pathgeo = new THREE.BufferGeometry();
            pathgeo.setFromPoints(points);
            const path = new THREE.LineSegments(
                pathgeo,
                new THREE.LineBasicMaterial({
                    color: defaultPathColor,
                    linewidth: 1,
                    transparent: false
                })
            );
            path.scale.x = 0.1;
            path.scale.y = 0.1;
            path.scale.z = 0.1;
            scene.add(path);
        });
    });

    $('#saveGCodeButton').on("click", function(){
        if(!$('#gcode-preview').text()){
            dialog.showErrorBox("", "No GCode to save.");
            return;
        }

        dialog.showSaveDialog({filters: [{
          name: 'GCode',
          extensions: ['gcode']
        }]}, function(fileName) {
            // if user canceled the dialog, filaName is undefined, so just abort.
            if (fileName === undefined){
              return;
            }

            // write gcode to file
            fs.writeFile(fileName, $('#gcode-preview').text(), function (err) {
               if(err){
                   dialog.showErrorBox("", "An error ocurred creating the file: " + err.message);
               }

               dialog.showMessageBox({message: "Successfully saved GCode to file '" + fileName + "'"});
            });
        });
    });
});
