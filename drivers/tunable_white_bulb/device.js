'use strict';

const ZigBeeDevice = require('homey-meshdriver').ZigBeeDevice;

const tempMin = 250;
const tempMax = 454;
const maxBrightness = 255;

class TunableWhiteBulb extends ZigBeeDevice {
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

		// Register light_temperature capability
		this.registerCapability('light_temperature', 'lightingColorCtrl', {
			set: 'moveToColorTemp',
			setParser: value => ({
				colortemp: Math.round(value * (tempMax - tempMin) + tempMin),
				transtime: this.getSetting('transtime'),
			}),
			get: 'colorTemperature',
			reportParser: value => (value - tempMin) / (tempMax - tempMin),
		});
	}
}

module.exports = TunableWhiteBulb;
