# GCode Composer Prototype
This program plans paths for an automatized experiment with our open source bioprinter. In addition, it fixes the shortcomings of the current design, as we cannot detect the initial fill of the syringe (and other parameters), when an experiment starts.
!Please carefully read the bioprinter manual before conducting any experiments, as manual intervention is necessary!


## Installation
1. Install NodeJS (e.g. via https://nodejs.org/en/download/)

2. Run "launch-windows.bat" on Windows or "launch.sh" on OSX (and Linux)


## How to use the composer
1. Generate a valid target container (e.g. six-well plate) and mark the printable volumes individually. The material of the printable volumes must be named "PrintArea".

2. Design or reconstruct the biostructures you want to print. They must fit into the printable volumes of the target container!

3. Slice the biostructure model. Make sure that the produced gcode does not contain a prologue or epilogue, which may interfere with combined prints. The coordinate system's origin must be set according to the stuff.

4. Load the target container in the composer and fill the printable volumes with your biostructures at will. You can only put one biostructure per printable volume! If you want to add multiple small biostructures into a printable volume, then you can simply add multiple biostructures in the slicing program and slice them into a "single" structure.

5. Fill the configuration parameters.

6. Generate and save the enhanced gcode. This generates an additional path preview for the syringe's needle tip. Make sure it is plausible and does not collide with something.

7. Send the gcode to the device. There will be two stops, where you need to intervene manually. At the first checkpoint remove syringe and target container from the device. After you press the continue the device checks its calibration status. When the device finished the checking routing it waits again to mount the syringe and the target container appropriately.

## Note
The composer does NOT check, whenever the initial amount of bioink in the syringe is sufficient for an experiment and does not check for any collisions!
