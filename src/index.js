const { InstanceBase, runEntrypoint } = require('@companion-module/base')
const UpgradeScripts = require('./upgrades')

const config = require('./config')
const actions = require('./actions')
const feedbacks = require('./feedbacks')
const variables = require('./variables')
const presets = require('./presets')

const api = require('./api')
const utils = require('./utils')

class onvifInstance extends InstanceBase {
	constructor(internal) {
		super(internal)

		// Assign the methods from the listed files to this class
		Object.assign(this, {
			...config,
			...actions,
			...feedbacks,
			...variables,
			...presets,
			...api,
			...utils,
		})

		this.DEVICE = null // The ONVIF device

		//global vars here

		this.DATA = {
			deviceInformation: {},
			systemDateAndTime: {},
			services: {},
			serviceCapabilities: {},
			status: {},
			presets: [],
		}

		this.CHOICES_PRESETS = [{ id: 0, label: '(no presets loaded)' }]
	}

	async destroy() {
		clearInterval(this.pollingInterval)
		clearTimeout(this.reconnectTimeout)
	}

	async init(config) {
		this.configUpdated(config)
	}

	async configUpdated(config) {
		this.updateStatus('connecting')

		this.config = config

		this.initActions()
		this.initFeedbacks()
		this.initVariables()
		this.initPresets()

		if (this.config.host !== '') {
			this.updateStatus('Connecting')
			this.initConnection()
		}

		this.checkVariables()
		this.checkFeedbacks()
	}
}

runEntrypoint(onvifInstance, UpgradeScripts)
