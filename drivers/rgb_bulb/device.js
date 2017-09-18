'use strict';

const space = require('color-space');

const ZigBeeLightDevice = require('homey-meshdriver').ZigBeeLightDevice;

const rgbToCie = require('../../node_modules/homey-meshdriver/lib/util/cie_rgb_color_space_conversion.js').rgb_to_cie;
const cieToRgb = require('../../node_modules/homey-meshdriver/lib/util/cie_rgb_color_space_conversion.js').cie_to_rgb;

const maxHue = 254;
const CIEMultiplier = 65279;

// TODO clean up
// TODO light_saturation
// TODO light_mode
// TODO make XY a system capability?

class RgbBulb extends ZigBeeLightDevice {

	onMeshInit() {

		this.printNode();

		// Register capabilities if present on device
		if (this.hasCapability('onoff')) this.registerCapability('onoff', 'genOnOff');
		if (this.hasCapability('dim')) this.registerCapability('dim', 'genLevelCtrl');

		this.registerCapability('light_hue', 'lightingColorCtrl', {
			set: 'moveToColor',
			setParser(value) {
				// TODO s, v
				console.log('HSV', [value * 360, 100, 100]);
				const RGB = space.hsv.rgb([value * 360, 100, 100]);
				console.log('RGB', RGB)

				const CIE = rgbToCie(RGB[0], RGB[1], RGB[2]);
				console.log('CIE', CIE)

				// TODO brightness
				console.log('RGB reverted', Number(CIE[0]), cieToRgb(Number(CIE[0]), Number(CIE[1]), 254));

				return {
					colorx: CIE[0] * CIEMultiplier,
					colory: CIE[1] * CIEMultiplier,
					transtime: Math.round(this.getSetting('transition_time') * 10),
				};
			},
			get: 'currentHue',
			reportParser(value) {
				return value / maxHue;
			},
			report: 'currentHue',
			getOpts: {
				getOnStart: true,
			},
		});

		this.registerCapability('light_temperature', 'lightingColorCtrl', {
			set: 'moveToColor',
			setParser(value) {

				// Correct a bit for a nice temperature curve
				const temperature = 0.2 + value / 4;
				return {
					colorx: temperature * CIEMultiplier,
					colory: temperature * CIEMultiplier,
					transtime: Math.round(this.getSetting('transition_time') * 10),
				};
			},
		});

		this.registerCapability('light_mode', 'lightingColorCtrl', {
			set: 'moveToColor',
			setParser(value) {
				console.log('light mode new value', value);

				if (value === 'color') {
					let color = space.rgb.xyz(space.hsv.rgb([this.getCapabilityValue('light_hue') * 360, 100, 100]));
					return {
						colorx: (color[0] / (color[0] + color[1] + color[2])) * 65536,
						colory: (color[1] / (color[0] + color[1] + color[2])) * 65536,
						transtime: Math.round(this.getSetting('transition_time') * 10),
					};
				} else {
					const temperature = ((1 / 3) - 0.125) + this.getCapabilityValue('light_temperature') / 4;
					// let color = space.rgb.xyz(space.hsv.rgb([value * 360, 100, 100]));

					// white
					// colorx: 0.4 * 65536, //(color[0] / (color[0] + color[1] + color[2])) * 65536,
					// colory: 0.4 * 65536,

					return {
						colorx: temperature * 65536,
						colory: temperature * 65536,
						transtime: Math.round(this.getSetting('transition_time') * 10),
					};
				}
				// todo moveToColor depending on value
				// const temperature = ((1 / 3) - 0.125) + value / 4;
				// // let color = space.rgb.xyz(space.hsv.rgb([value * 360, 100, 100]));
				//
				// // white
				// // colorx: 0.4 * 65536, //(color[0] / (color[0] + color[1] + color[2])) * 65536,
				// // colory: 0.4 * 65536,
				//
				// return {
				// 	colorx: temperature * 65536,
				// 	colory: temperature * 65536,
				// 	transtime: Math.round(this.getSetting('transition_time') * 10),
				// };
			},
		});
	}

	// TODO override light_temperature and light_mode
}

module.exports = RgbBulb;