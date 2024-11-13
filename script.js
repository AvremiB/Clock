'use strict';
import {
	adjustBtn,
	startAdjustMode,
	endAdjustMode,
	onMouseDown,
	onMouseMove,
	onPointerLoosened,
	selectedPointer,
} from './adjust.js';
import Clock from './Clock.js';
import { colors, preferences, messages } from './config.js';

export const canvas = document.querySelector('canvas');
export const ctx = canvas.getContext('2d');
export const WHOLE_ANGLE = Math.PI * 2;
export const LOAD_TIME = Date.now() / 1000;
export const PI_HALF = Math.PI / 2;

export let maxX, maxY;
/** @type Clock */
export let clock;
let hPointer, mPointer, sPointer;

export function timeToRad(time, max) {
	return (WHOLE_ANGLE * time) / max;
}

// always radToTime(timeToRad(n, x), x) === n (if max > n > 0)
export function radToTime(rad, max) {
	let toTime = ((rad + PI_HALF) / WHOLE_ANGLE) * max;
	if (toTime < 0) toTime += max;
	else if (toTime > max) toTime -= max;
	return toTime;
}

export let adjustMode = false;

init();

function init() {
	maxX = window.innerWidth;
	maxY = window.innerHeight;
	canvas.width = maxX;
	canvas.height = maxY;
	ctx.fillStyle = colors.outerBackground;
	ctx.fillRect(0, 0, maxX, maxY);
	clock?.stop();
	clock = new Clock(clock?.start);
	[hPointer, mPointer, sPointer] = clock.pointers;
	if (adjustMode) clock.update(true);
	else clock.run();
}

window.addEventListener('resize', init);

// --- Events of clock adjusting ---
canvas.addEventListener('mousedown', onMouseDown);
canvas.addEventListener('mousemove', onMouseMove);
canvas.addEventListener('mouseup', () => (selectedPointer ? onPointerLoosened() : undefined));
canvas.addEventListener('mouseout', () => (selectedPointer ? onPointerLoosened() : undefined));

// --- Other events ---
export const msgsLine = document.querySelector('#messages-line'),
	toolsBtn = document.querySelector('#show-tools'),
	initializeBtn = document.querySelector('#initialize'),
	toolsDialog = document.querySelector('#tools-dialog'),
	flowCheckbox = document.querySelector('#rhythm-flow'),
	tickCheckbox = document.querySelector('#rhythm-tick');

addEventListener('beforeunload', () =>
	localStorage.setItem(
		'preferences',
		JSON.stringify({
			rhythm: preferences?.rhythm || 'flow',
			diff: clock.originStart - clock.start,
		})
	)
);

toolsBtn.addEventListener('click', () => (toolsDialog.hidden = false));
document.addEventListener('click', (event) => {
	if (!toolsDialog.contains(event.target) && event.target !== toolsBtn) {
		toolsDialog.hidden = true;
	}
});

initializeBtn.addEventListener('click', () => {
	clock.start = clock.originStart;
	this.hidden = true;
	if (adjustMode) {
		clock.update(true);
	} else {
		msgsLine.innerText = messages.adjustmentSucceed;
		setTimeout(() => {
			if (!adjustMode && clock.start === clock.originStart) {
				msgsLine.innerText = '';
			}
		}, 5000);
	}
});

const inputOf = (div) => div.querySelector('input');

flowCheckbox.addEventListener('click', () => {
	inputOf(flowCheckbox).checked = true;
	inputOf(tickCheckbox).checked = false;
	preferences.rhythm = 'flow';
});

tickCheckbox.addEventListener('click', () => {
	inputOf(tickCheckbox).checked = true;
	inputOf(flowCheckbox).checked = false;
	preferences.rhythm = 'tick';
});

if (preferences.rhythm === 'tick') {
	inputOf(tickCheckbox).click();
}

function log(varsStr) {
	const toLog = {};
	for (let str of varsStr.split(',')) {
		try {
			toLog[str] = eval(str);
		} catch {
			toLog[str] = `(cannot eval)`;
		}
	}
	console.log(toLog);
}
adjustBtn.addEventListener('click', () => {
	console.log('click');

	adjustMode = !adjustMode;
	if (adjustMode) startAdjustMode();
	else endAdjustMode();
});
