'use strict';

const ZigBeeDriver = require('homey-zigbeedriver');

const maxBrightness = 255;

module.exports = new ZigBeeDriver('tradfri-dim', {
    debug: false,
    capabilities: {
        dim: {
            command_endpoint: 0,
            command_cluster: 'genLevelCtrl',
            command_set: 'moveToLevel',
            command_set_parser: (value, node) => {
                return {
                    level: value * maxBrightness,
                    transtime: node.settings['transtime']
                };
            },
            command_get: 'currentLevel',
            command_report_parser: (value, node) => {
                return value/maxBrightness;
            }
        },
        onoff: {
            command_endpoint: 0,
            command_cluster: 'genOnOff',
            command_set: (value, node) => {
                return value?'on':'off';
            },
            command_set_parser: (value, node) => {
                return {};
            },
            command_get: 'onOff',
            command_report_parser: (value, node) => {
                return value==1;
            }
        }
    }
});