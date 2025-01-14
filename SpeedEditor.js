// SpeedEditor.js
//
// Speed Editor HID for Node JS
// Copyright (C) 2022 Radomir Rytych

class SpeedEditor {
	device;
	keys = [];
	authTimer;
	keyNames = {
		1: "Smart Insert",
		2: "Append",
		3: "Ripple",
		4: "Close Up",
		5: "Place On Top",
		6: "Source",
		7: "In",
		8: "Out",
		9: "Trim In",
		10: "Trim Out",
		11: "Roll",
		12: "Slip Source",
		13: "Slip Destination",
		14: "Transistion Duration",
		15: "Cut",
		16: "Dissolve",
		17: "Smooth Cut",
		49: "Escape",
		31: "Sync Bin",
		44: "Audio Level",
		45: "Full View",
		34: "Transistion",
		47: "Split",
		46: "Snap",
		43: "Ripple Delete",
		51: "Camera 1",
		52: "Camera 2",
		53: "Camera 3",
		54: "Camera 4",
		55: "Camera 5",
		56: "Camera 6",
		57: "Camera 7",
		58: "Camera 8",
		59: "Camera 9",
		48: "Live",
		37: "Video Only",
		38: "Audio Only",
		60: "Play / Pause",
		26: "Source",
		27: "Timeline",
		28: "Shuttle",
		29: "Jog",
		30: "Scroll"
	}
	static leds = {
		closeUp: 1 << 0,
		cut: 1 << 1,
		dis: 1 << 2,
		smthCut: 1 << 3,
		trans: 1 << 4,
		snap: 1 << 5,
		cam7: 1 << 6,
		cam8: 1 << 7,
		cam9: 1 << 8,
		liveOwr: 1 << 9,
		cam4: 1 << 10,
		cam5: 1 << 11,
		cam6: 1 << 12,
		videoOnly: 1 << 13,
		cam1: 1 << 14,
		cam2: 1 << 15,
		cam3: 1 << 16,
		audioOnly: 1 << 17,
		jog: 262145,
		shtl: 262146,
		scrl: 262148
	}
	static jogMode = {
		raw: 0,
		absoluteContinuous: 1,
		relative: 2,
		absoluteDeadZero: 3,
		ffff: 4,
	};
	currentLed = [];
	keyAction(data) {
		/* on each keydown or keyup keyboard will send all pressed button at the moment
		 * so we need to filter new keys and check which keys was released.
		 * keyboard can handle 6 simultaneous buttons
		 * */
		let currentKeys = [];
		for (let i = 0; i < data.length; i += 2) {
			if (data[i] > 0) currentKeys.push(data[i]);
			else break;
		}
		currentKeys.forEach(button => {
			if (this.keys.indexOf(button) == -1)
				this.emit('keydown', { keyCode: button, keyName: this.keyNames[button] });
		});
		this.keys.forEach(button => {
			if (currentKeys.indexOf(button) == -1)
				this.emit('keyup', { keyCode: button, keyName: this.keyNames[button] });
		});
		this.keys = currentKeys;
	}

	constructor() {
		let hid = require('node-hid');
		this.device = new hid.HID(7899, 55822);
		let success = this.authenticate();
		this.device.on("data", (buffer) => {
			let data = [...buffer];
			if (data[0] == 4) {
				console.log(data);
				this.keyAction(data.slice(1));
			} else if (data[0] == 3) {
				
					let value = buffer.readInt32LE(2);
					this.emit('jog', Math.round(value / 360));
			} else {
				console.log(data);
			}
		});
		this.authTimer = setInterval(() => {
			this.authenticate();
		}, 1500000);
		this.setLight(false, 0);
	}

	setJogMode = (mode) => {
		let buf = Buffer.from([3, mode, 0, 255]);
		this.device.write(buf);
	}
	setLight = (value, ...code) => {
		for (let c of code.flat()) {
			if (value && this.currentLed.indexOf(c) == -1) this.currentLed.push(c);
			if (!value && this.currentLed.indexOf(c) != -1) this.currentLed.splice(this.currentLed.indexOf(c), 1);
		}
		let leds = 0;
		let jogs = 0;
		for (let i of this.currentLed) {
			if (i > 1 << 18) jogs |= i - 262144;
			else leds |= i;
		}
		let buf = Buffer.from([4, jogs]);
		this.device.write(buf);
		buf = Buffer.from([2, 0, 0, 0, 0, 0]);
		buf.writeUInt32LE(leds, 1);
		this.device.write(buf);
	}
	getLight = () => {
		return this.currentLed;
	}
	getLightNames = () => {
		let keys = Object.getOwnPropertyNames(SpeedEditor.leds);
		let vals = Object.values(SpeedEditor.leds);
		return this.currentLed.map(element => keys[vals.indexOf(element)]);
	}
	/*
	* Authenticate module is taken from:
	* https://github.com/smunaut/blackmagic-misc
	* Copyright (C) 2021 Sylvain Munaut <tnt@246tNt.com>
	*
	* */
	rol8(v) {
		return BigInt(((v << 56n) | (v >> 8n)) & 18446744073709551615n)
	}
	rol8n(v, n) {
		for (let i = 0; i < n; i++)
			v = this.rol8(v);
		return v;
	}
	#AUTH_EVEN_TBL = [
		4242707987619187656n,
		3069963097229903046n,
		2352841328256802570n,
		12646368222702737177n,
		17018789593460232529n,
		12706253227766860309n,
		11978781369061872007n,
		8438608961089703390n];
	#AUTH_ODD_TBL = [
		4477338132788707294n,
		2622620659002747676n,
		11637077509869926595n,
		7923852755392722584n,
		8224257920127642516n,
		4049197610885016386n,
		18266591397768539273n,
		7035737829027231430n];
	#MASK = 12077075256910773232n;

	authenticate() {
		// Reset the auth state machine
		this.device.sendFeatureReport(Buffer.from([6, 0, 0, 0, 0, 0, 0, 0, 0, 0]));
		// Read the keyboard challenge (for keyboard to authenticate app)
		let data = this.device.getFeatureReport(6, 10);
		if (data[0] != 6 || data[1] != 0) {
			console.log("Failed authentication get challenge");
			return false;
		}
		const data_buf = Buffer.from(data);
		let challenge = data_buf.readBigUInt64LE(2);
		// Send our challenge (to authenticate keyboard)
		// We don't care ... so just send 0x0000000000000000
		this.device.sendFeatureReport(Buffer.from([6, 1, 0, 0, 0, 0, 0, 0, 0, 0]));
		// Read the keyboard response
		// Again, we don't care, ignore the result
		data = this.device.getFeatureReport(6, 10);
		if (data[0] != 6 || data[1] != 2) {
			console.log("Failed authentication response");
			return false;
		}
		let n = BigInt(challenge & 7n);
		let v = BigInt(this.rol8n(challenge, n));
		let k = BigInt(0n);
		if ((v & 1n) == ((120n >> n) & 1n))
			k = this.#AUTH_EVEN_TBL[n];
		else {
			v = v ^ this.rol8(v);
			k = this.#AUTH_ODD_TBL[n];
		}
		let response = BigInt(v ^ (this.rol8(v) & this.#MASK) ^ k);
		let buf = Buffer.from([6, 3, 0, 0, 0, 0, 0, 0, 0, 0]);
		buf.writeBigUInt64LE(response, 2);
		this.device.sendFeatureReport(buf);
		//Read the status
		data = this.device.getFeatureReport(6, 10);
		if (data[0] != 6 || data[1] != 4) {
			console.log("Failed authentication status");
			return false;
		}
		return true;
	}// end of authenticate

}; //end of class

module.exports = SpeedEditor;
require('util').inherits(SpeedEditor, require('events').EventEmitter);
