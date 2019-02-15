'use strict';

const ZigBeeDevice = require('homey-meshdriver').ZigBeeDevice;

/**
 * TODO: add proper icon (https://github.com/athombv/homey-vectors/issues/82)
 * TODO: what happens if the device gets switched externally, does it send a report to Homey?
 */
class ControlOutlet extends ZigBeeDevice {
	onMeshInit() {

		// Register onoff capability
		this.registerCapability('onoff', 'genOnOff');
	}
}

module.exports = ControlOutlet;
