'use strict';

// eslint-disable-next-line node/no-unpublished-require
const Homey = require('homey');
// eslint-disable-next-line no-unused-vars
const { Log } = require('homey-log');

// Enable zigbee-cluster logging
const { Util } = require('homey-zigbeedriver');

Util.debugZigbeeClusters(true);

class IkeaTradfriApp extends Homey.App {

  onInit() {
    this.log('init');
  }

}

module.exports = IkeaTradfriApp;
