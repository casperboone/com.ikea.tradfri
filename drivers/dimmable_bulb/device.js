'use strict';

const ZigBeeDevice = require('homey-meshdriver').ZigBeeDevice;

const maxBrightness = 255;

class DimmableBulb extends ZigBeeDevice {
	onMeshInit() {

		// Register onoff capability
		this.registerCapability('onoff', 'genOnOff', {
			set: value => value ? 'on' : 'off',
			setParser: () => ({}),
			get: 'onOff',
			reportParser: value => value === 1,
		});

		// Register dim capability
		this.registerCapability('dim', 'genLevelCtrl', {
			set: 'moveToLevel',
			setParser: value => ({
				level: value * maxBrightness,
				transtime: this.getSetting('transtime'),
			}),
			get: 'currentLevel',
			reportParser: value => value / maxBrightness,
		});
	}
}

module.exports = DimmableBulb;
