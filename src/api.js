const { InstanceStatus } = require('@companion-module/base')

const Cam = require('onvif').Cam

module.exports = {
	initConnection: function () {
		let self = this

		clearInterval(self.pollingInterval)
		clearTimeout(self.reconnectTimeout)

		if (self.config.port == undefined) {
			self.config.port = 80
		}

		if (
			self.config.host &&
			self.config.host !== '' &&
			self.config.username &&
			self.config.username !== '' &&
			self.config.password &&
			self.config.password !== ''
		) {
			self.DEVICE = new Cam(
				{
					hostname: self.config.host,
					username: self.config.username,
					password: self.config.password,
					path: self.config.path,
					port: self.config.port,
				},
				function (err) {
					if (err) {
						self.updateStatus(InstanceStatus.ConnectionFailure, 'Error connecting. See log for details.')
						self.log('error', 'Error connecting to ' + self.config.host + ': ' + String(err))
						self.log(
							'error',
							'Check your ONVIF device configuration. The authentication mode should be set to "digest/wsse".'
						)
						const delay = (self.config.reconnectInterval || 30) * 1000
						self.log('info', `Retrying connection in ${delay / 1000} seconds...`)
						self.reconnectTimeout = setTimeout(() => self.initConnection(), delay)
						return
					}

					self.updateStatus(InstanceStatus.Ok)

					self.getDeviceInformation()
					self.getSystemDateAndTime()
					self.getServices()
					self.getServiceCapabilities()
					self.getStatus()
					self.getNodes()
					self.getPresets()

					self.getImagingSettings()
					self.startPolling()
				}
			)
		}
	},

	getDeviceInformation: function () {
		let self = this

		self.DEVICE.getDeviceInformation((err, info) => {
			if (err) {
				self.log('error', 'Error getting device information: ' + String(err))
				return
			}

			self.DATA.deviceInformation = info
			self.checkFeedbacks()
			self.checkVariables()
		})
	},

	getSystemDateAndTime: function () {
		let self = this

		self.DEVICE.getSystemDateAndTime((err, dt) => {
			if (err) {
				self.log('error', 'Error getting system date and time: ' + String(err))
				return
			}

			self.DATA.systemDateAndTime = dt
			self.checkFeedbacks()
			self.checkVariables()
		})
	},

	getServices: function () {
		let self = this

		self.DEVICE.getServices((err, services) => {
			if (err) {
				self.log('error', 'Error getting services: ' + String(err))
				return
			}

			self.DATA.services = services
			self.checkFeedbacks()
			self.checkVariables()
		})
	},

	getServiceCapabilities: function () {
		let self = this

		self.DEVICE.getServiceCapabilities((err, capabilities) => {
			if (err) {
				self.log('error', 'Error getting service capabilities: ' + String(err))
				return
			}

			self.DATA.serviceCapabilities = capabilities
			self.checkFeedbacks()
			self.checkVariables()
		})
	},

	getStatus: function () {
		let self = this

		self.DEVICE.getStatus((err, status) => {
			if (err) {
				//self.log('error', 'Error getting status: ' + String(err))
				return
			}

			self.DATA.status = status
			self.checkFeedbacks()
			self.checkVariables()
		})
	},

	getNodes: function () {
		let self = this

		self.DEVICE.getNodes((err, nodes) => {
			if (err) {
				//self.log('error', 'Error getting nodes: ' + String(err))
				return
			}

			self.DATA.nodes = nodes
		})
	},

	getPresets: function () {
		let self = this

		self.DEVICE.getPresets((err, presets) => {
			if (err) {
				//self.log('error', 'Error getting presets: ' + String(err))
				return
			}

			self.DATA.presets = presets

			//build choices_presets array with key/value pairs
			//save copy of current array to compare for changes
			let tempChoices = self.CHOICES_PRESETS
			self.CHOICES_PRESETS = []
			for (let key in presets) {
				self.CHOICES_PRESETS.push({ id: presets[key], label: key })
			}

			// If no presets are found, add a default option
			if (self.CHOICES_PRESETS.length === 0) {
				self.CHOICES_PRESETS.push({ id: 0, label: '(no presets loaded)' })
			}

			//rebuild dropdowns and variables, but only if the presets have changed
			if (JSON.stringify(tempChoices) !== JSON.stringify(self.CHOICES_PRESETS)) {
				self.initActions()
				self.initFeedbacks()
				self.initVariables()
				self.checkFeedbacks()
				self.checkVariables()
			}
		})
	},

	getImagingSettings: function () {
		let self = this

		self.DEVICE.getImagingSettings((err, settings) => {
			if (err) {
				self.log('error', 'Error getting imaging settings: ' + String(err))
				return
			}

			self.DATA.imagingSettings = settings
		})
	},

	startPolling: function () {
		let self = this

		if (self.config.polling) {
			self.pollingInterval = setInterval(() => {
				self.getStatus()
				self.getPresets()
				//console.log(self.DATA)
			}, self.config.interval)
		}
	},

	//PTZ Functions
	relativeMove: function (options) {
		let self = this

		if (self.DEVICE) {
			self.DEVICE.relativeMove(options)
		}
	},

	absoluteMove: function (options) {
		let self = this

		if (self.DEVICE) {
			self.DEVICE.absoluteMove(options)
		}
	},

	continuousMove: function (options) {
		let self = this

		if (self.DEVICE) {
			self.DEVICE.continuousMove(options)
		}
	},

	stop: function () {
		let self = this

		if (self.DEVICE) {
			self.DEVICE.stop()
		}
	},

	gotoHomePosition: function (options) {
		let self = this

		if (self.DEVICE) {
			self.DEVICE.gotoHomePosition(options, (err, status) => {
				if (err) {
					self.log('error', 'Error going to home position: ' + String(err))
					return
				}

				console.log(status)
			})
		}
	},

	setHomePosition: function () {
		let self = this

		if (self.DEVICE) {
			self.DEVICE.setHomePosition((err, status) => {
				if (err) {
					self.log('error', 'Error setting home position: ' + String(err))
					return
				}

				console.log(status)
			})
		}
	},

	gotoPreset: function (options) {
		let self = this

		if (self.DEVICE) {
			self.DEVICE.gotoPreset(options, (err, status) => {
				if (err) {
					self.log('error', 'Error going to preset: ' + String(err))
					return
				}

				console.log(status)
			})
		}
	},

	setPreset: function (options) {
		let self = this

		if (self.DEVICE) {
			self.DEVICE.setPreset(options, (err, status) => {
				if (err) {
					self.log('error', 'Error setting preset: ' + String(err))
					return
				}

				console.log(status)

				self.getPresets()
			})
		}
	},

	//Imaging Functions
	setImaging: function (options) {
		let self = this

		if (self.DEVICE) {
			self.DEVICE.setImagingSettings(options, (err, status) => {
				if (err) {
					self.log('error', 'Error setting imaging settings: ' + String(err))
					return
				}

				console.log(status)
			})
		}
	},

	//Other Functions
	systemReboot: function () {
		let self = this

		if (self.DEVICE) {
			self.DEVICE.systemReboot((err, status) => {
				if (err) {
					self.log('error', 'Error rebooting system: ' + String(err))
					return
				}

				console.log(status)
			})
		}
	},
}
