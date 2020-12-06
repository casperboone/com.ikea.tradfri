'use strict';

// eslint-disable-next-line no-unused-vars,node/no-unpublished-require
const Homey = require('homey');
const { Util, ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

const LevelControlBoundCluster = require('../../lib/LevelControlBoundCluster');
const OnOffBoundCluster = require('../../lib/OnOffBoundCluster.js');

const { throttle, debounce } = Util;

const maxValue = 255;

const FLOW_TRIGGER = {
  VOLUME_ROTATED: 'volume_rotated',
  VOLUME_ROTATE_STOPPED: 'volume_rotate_stopped',
};

class RemoteRotatingVolume extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.moving = false;
    this.movingSince = null;
    this.moveDirection = null;
    this.rate = null;
    this.value = this.getStoreValue('last_value');

    this.homey.flow.getActionCard('sync_current_value')
      .registerRunListener(async args => {
        try {
          if (this.getSetting('relative') === false) {
            this.log('FlowCardAction sync value: ', args.new_value);
            this.setStoreValue('last_value', args.new_value);
            this.value = args.new_value;
          }
          return Promise.resolve(true);
        } catch (error) {
          return Promise.reject(error);
        }
      });


    // Migration step, adds measure_battery capability if not already available
    if (!this.hasCapability('alarm_battery')) {
      await this.addCapability('alarm_battery');
    }

    // Register measure_battery capability and configure attribute reporting
    this.batteryThreshold = 20;
    this.registerCapability('alarm_battery', CLUSTER.POWER_CONFIGURATION, {
      getOpts: {
        getOnStart: true,
      },
      reportOpts: {
        configureAttributeReporting: {
          minInterval: 0, // No minimum reporting interval
          maxInterval: 60000, // Maximally every ~16 hours
          minChange: 5, // Report when value changed by 5
        },
      },
    });

    // Bind bound cluster which handles incoming commands from the node, must be hardcoded on
    // endpoint 1 for this device
    const moveCommandParser = this.moveCommandParser.bind(this);
    const stopCommandParser = this.stopCommandParser.bind(this);
    const stepCommandParser = this.stepCommandParser.bind(this);
    const toggleCommandHandler = this.toggleCommandHandler.bind(this);

    this.zclNode.endpoints[1].bind(CLUSTER.LEVEL_CONTROL.NAME, new LevelControlBoundCluster({
      onMove: moveCommandParser,
      onMoveWithOnOff: moveCommandParser,
      onStop: stopCommandParser,
      onStopWithOnOff: stopCommandParser,
      onStep: stepCommandParser,
      onStepWithOnOff: stepCommandParser,
    }));

    // Bind on/off button commands
    zclNode.endpoints[1].bind(CLUSTER.ON_OFF.NAME, new OnOffBoundCluster({
      onToggle: toggleCommandHandler,
    }));

    // Create throttled function for trigger flow
    this.triggerVolumeRotatedFlow = throttle(() => {
      this.triggerFlow({
        id: FLOW_TRIGGER.VOLUME_ROTATED,
        tokens: { value: this.currentRotateValue },
        state: null,
      }).then(() => {
        this.log(`triggered value ${this.currentRotateValue}`);
      });
    },
    100);

    // Create debounced functions for triggering flows
    this.triggerVolumeRotateStoppedFlow = debounce(() => {
      this.triggerFlow({
        id: FLOW_TRIGGER.VOLUME_ROTATE_STOPPED,
        tokens: { value: this.currentRotateValue },
        state: null,
      }).then(() => {
        this.log(`stopped trigger value ${this.currentRotateValue}`);
        if (this.getSetting('relative') === true) {
          this.log('reset value');
          this.value = 0;
        }
        this.setStoreValue('last_value', this.value);
      });
    },
    500);

    this.triggerDebouncedPress1x = debounce(() => {
      this.triggerFlow({
        id: 'pressed_1x',
      }).then(() => this.log('flow pressed_1x was triggered'));
    },
    100);

    this.triggerDebouncedPress2x = debounce(() => {
      this.triggerFlow({
        id: 'pressed_2x',
      }).then(() => this.log('flow pressed_2x was triggered '));
    },
    100);

    this.triggerDebouncedPress3x = debounce(() => {
      this.triggerFlow({
        id: 'pressed_3x',
      }).then(() => this.log('flow pressed_3x was triggered'));
    },
    100);
  }

  /**
   * Returns currently calculated rotate value.
   * @returns {number}
   */
  get currentRotateValue() {
    return Math.round((this.value / maxValue) * 100) / 100;
  }

  /**
   * Method that parsed an incoming `move` or `moveWithOnOff` command.
   * @param {object} payload
   * @property {string} payload.moveMode - 'up' or 'down'
   * @property {number} payload.rate
   */
  moveCommandParser(payload) {
    this.debug('moveCommandParser', payload);
    this.moving = true;
    this.movingSince = Date.now();
    this.moveDirection = payload.moveMode === 'up' ? 1 : -1;
    this.rate = payload.rate;
    this.triggerVolumeRotatedFlow();
    this.triggerVolumeRotateStoppedFlow();
  }

  /**
   * Method that handles an incoming `stop` or `stopWithOnOff` command.
   */
  stopCommandParser() {
    this.debug('stopCommandParser', {
      moving: this.moving,
      movingSince: this.movingSince,
      value: this.value,
      rate: this.rate,
      direction: this.moveDirection,
    });

    if (this.moving === true || Date.now() - this.movingSince < 3000) {
      const sensitivity = this.getSetting('sensitivity');

      let delta = 0;
      if (typeof sensitivity === 'number' && !Number.isNaN(sensitivity) && sensitivity > 0.1) {
        delta = ((Date.now() - this.movingSince) / 1000) * this.rate * sensitivity;
      } else {
        delta = ((Date.now() - this.movingSince) / 1000) * this.rate;
      }

      this.value += delta * this.moveDirection;

      if ((this.getSetting('relative') === true) && (this.value < (maxValue * -1))) {
        this.value = (maxValue * -1);
      } else if ((this.getSetting('relative') === false) && (this.value < 0)) {
        this.value = 0;
      }

      if (this.value > maxValue) this.value = maxValue;

      this.moving = false;
      this.movingSince = null;
    }

    this.triggerVolumeRotatedFlow();
    this.triggerVolumeRotateStoppedFlow();
  }

  toggleCommandHandler() {
    this.triggerDebouncedPress1x();
  }

  stepCommandParser(payload) {
    this.debug('stepCommandParser', payload);
    if (payload.mode === 'up') {
      this.triggerDebouncedPress2x();
    } else {
      this.triggerDebouncedPress3x();
    }
  }

}

module.exports = RemoteRotatingVolume;
