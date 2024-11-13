'use strict';
/** UI variables */
const colors = {
	outerBackground: 'black',
	innerBackground: 'black',
	border: 'blue',
	graduation: 'yellow',
	hourGraduation: 'white',
	digit: 'yellow',
	pointer: 'yellow',
	pivot: 'red',
};
const preferences = (() => {
	let storage = localStorage.getItem('preferences');
	if (storage) return JSON.parse(storage);
	else {
		return {
			rhythm: 'flow',
			diff: 0,
		};
	}
})();
const messages = {
	customTime: 'לתשומת לבך: השעון מציג זמן מותאם אישית.',
	adjusting: 'בחר מחוג וגרור אותו למיקום הרצוי.',
	adjustmentSucceed: `✅ השעה עודכנה בהצלחה!`,
};

const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');

const WHOLE_ANGLE = Math.PI * 2;
const PI_HALF = Math.PI / 2; // זווית של רבע עיגול

let maxX, maxY;
/** @type Clock */
let clock;
let hPointer, mPointer, sPointer;

function toClockAngle(standardRadians) {
	const ang = standardRadians - PI_HALF;
	return ang < 0 ? WHOLE_ANGLE + ang : ang;
}

//** Calculate methods */
function timeToRad(time, max) {
	return (WHOLE_ANGLE * time) / max;
}

// always radToTime(timeToRad(n, x), x) === n (if max > n > 0)
function radToTime(rad, max) {
	let toTime = toClockAngle(rad) * max;
	//if (toTime < 0) toTime += max;
	//else if (toTime > max) toTime -= max;
	return toTime;
}

function getFixedTime(floor) {
	const now = clock.start + performance.now() / 1000;
	const hours = now / 3600,
		minutes = (now % 3600) / 60,
		seconds = now % 60;
	return {
		hours,
		minutes: floor ? Math.floor(minutes) : minutes,
		seconds: floor ? Math.floor(seconds) : seconds,
	};
}

// --- Classes ---
class Point {
	constructor(x, y) {
		this.x = x;
		this.y = y;
	}

	*[Symbol.iterator]() {
		yield this.x;
		yield this.y;
	}
}

class ClockPointer {
	constructor(name, timeUnit, max, bodyLen, width, tail) {
		this.name = name;
		this.timeUnit = timeUnit;
		this.max = max;
		this.bodyLen = bodyLen;
		this.width = width;
		this.value = 0;
		this.angle = PI_HALF;
		this.path = new Path2D();
		this.tailLen = tail ? bodyLen / 10 : 0;
		this.edgeLen = bodyLen / 30;
	}
	draw() {
		const bodyPath = (this.path = new Path2D());
		bodyPath.moveTo(...clock.center);
		bodyPath.lineTo(...clock.getPointCoordinates(this.angle, this.bodyLen));
		ctx.lineWidth = this.width;
		ctx.strokeStyle = colors.pointer;
		ctx.stroke(bodyPath);
		this.drawTail();
		this.drawEdge();
	}

	drawTail() {
		const path = new Path2D();
		path.moveTo(...clock.getPointCoordinates(Math.PI + this.angle, this.tailLen));
		path.lineTo(...clock.center);
		ctx.stroke(path);
	}

	drawEdge() {
		const widthRadians = (this.width / (this.bodyLen * Math.PI)) * 1.5;
		const side1Angle = this.angle + widthRadians;
		const side2Angle = this.angle - widthRadians;

		ctx.beginPath();
		ctx.moveTo(...clock.getPointCoordinates(side1Angle, this.bodyLen));
		ctx.lineTo(...clock.getPointCoordinates(this.angle, this.bodyLen + this.edgeLen));
		ctx.lineTo(...clock.getPointCoordinates(side2Angle, this.bodyLen));
		ctx.closePath();

		ctx.fillStyle = colors.pointer;
		ctx.fill();
	}
}

class Clock {
	constructor(startPoint) {
		let radius = maxY * 0.4;
		if (radius * 2.2 > maxX) radius = maxX / 2.2;
		this.radius = radius;
		this.center = new Point(maxX / 2, maxY / 2);
		this.hPointer = new ClockPointer('hours', 60 * 60, 12, radius * 0.45, radius / 45);
		this.mPointer = new ClockPointer(
			'minutes',
			60,
			60,
			radius * 0.6,
			radius / 80,
			true
		);
		this.sPointer = new ClockPointer(
			'seconds',
			1,
			60,
			radius * 0.8,
			radius / 160,
			true
		);
		this.isRunning = false;
		if (startPoint) this.start = startPoint;
		else {
			const now =
				new Date().getTime() / 1000 - new Date().getTimezoneOffset() * 60;
			this.start = now % (12 * 60 * 60);
		}
		this.originStart = this.start;
		this.animationFrameId = null;
	}

	get pointers() {
		return [this.hPointer, this.mPointer, this.sPointer];
	}

	getPointCoordinates(angle, distanceFromCenter) {
		angle = toClockAngle(angle);
		const x = this.center.x + Math.cos(angle) * distanceFromCenter;
		const y = this.center.y + Math.sin(angle) * distanceFromCenter;
		return [x, y];
	}

	draw() {
		this.drawBase();
		this.pointers.forEach((p) => p.draw());
		this.drawPivot();
	}

	drawBase() {
		ctx.fillStyle = colors.outerBackground;
		ctx.fillRect(0, 0, maxX, maxY);
		this.drawBorder();
		this.drawDigits();
		this.drawGraduations();
	}

	drawBorder() {
		this.borderPath = new Path2D();
		this.borderPath.arc(...this.center, this.radius, 0, WHOLE_ANGLE);
		ctx.lineWidth = this.radius / 18;
		ctx.strokeStyle = colors.border;
		ctx.stroke(this.borderPath);
		ctx.fillStyle = colors.innerBackground;
		ctx.fill(this.borderPath);
	}

	drawDigits() {
		ctx.lineWidth = this.radius / 150;
		ctx.strokeStyle = colors.digit;
		ctx.font = `${this.radius * 0.24}px narkisim`;
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		const distanceFromCenter = this.radius * 0.73;
		for (let i = 1; i <= 12; i++) {
			const angle = timeToRad(i, 12);
			ctx.strokeText(
				i.toString(),
				...this.getPointCoordinates(angle, distanceFromCenter)
			);
		}
	}

	drawGraduations() {
		for (let i = 0; i < 60; i++) {
			const angle = timeToRad(i, 60);
			let distanceFromCenter, length;

			if (i % 5 === 0) {
				distanceFromCenter = this.radius * 0.86;
				length = this.radius * 0.08;
				ctx.lineWidth = this.radius / 150;
				ctx.strokeStyle = colors.hourGraduation;
			} else {
				distanceFromCenter = this.radius * 0.89;
				length = this.radius * 0.05;
				ctx.lineWidth = this.radius / 200;
				ctx.strokeStyle = colors.graduation;
			}

			ctx.beginPath();
			ctx.moveTo(...this.getPointCoordinates(angle, distanceFromCenter));
			ctx.lineTo(...this.getPointCoordinates(angle, distanceFromCenter + length));
			ctx.stroke();
		}
	}

	drawPivot() {
		ctx.beginPath();
		ctx.arc(...this.center, this.radius / 50, 0, WHOLE_ANGLE);
		ctx.closePath();
		ctx.fillStyle = colors.pivot;
		ctx.fill();
	}

	run() {
		if (this.isRunning) return;
		this.isRunning = true;
		this.update();
	}

	update(singleTick = false, includeSeconds = true) {
		const newTime = getFixedTime(preferences.rhythm === 'tick' && clock.isRunning);

		this.pointers.forEach((pointer) => {
			pointer.value = newTime[pointer.name];
			//	if (pointer.name !== 'seconds' || includeSeconds) {
			pointer.angle = timeToRad(pointer.value, pointer.max);
			//	}
		});

		this.draw();
		if (!singleTick) {
			this.animationFrameId = requestAnimationFrame(() => this.update());
		}
	}

	stop() {
		if (!this.isRunning) return;
		this.isRunning = false;
		cancelAnimationFrame(this.animationFrameId);
		this.animationFrameId = null;
	}
}
// execution
let adjustMode = false;

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
	if (adjustMode) {
		clock.update(true);
	} else clock.run();
}

window.addEventListener('resize', init);

// --- Adjust clock by user ---
let selectedPointer;

canvas.addEventListener('mouseup', () => (selectedPointer ? onPointerLoosened() : undefined));
canvas.addEventListener('mouseout', () => (selectedPointer ? onPointerLoosened() : undefined));

function startAdjustMode() {
	clock.stop();

	canvas.addEventListener('mousedown', onMouseDown);
	canvas.addEventListener('mousemove', onMouseMove);

	msgsLine.innerText = messages.adjusting;
	adjustBtn.innerText = 'סיים כיוונון';
	canvas.style.cursor = 'grab';
	initializeBtn.hidden = false;
}

function onMouseDown(event) {
	// מאפשר לדעת שהסמן עלה על מחוג גם אם הוא לא נוגע בו בדיוק במרכז הקו
	ctx.lineWidth = 20;
	const { clientX, clientY } = event;
	const pointerToSelect = clock.pointers.find((p) =>
		ctx.isPointInStroke(p.path, clientX, clientY)
	);
	if (pointerToSelect) {
		selectedPointer = pointerToSelect;
		canvas.style.cursor = 'grabbing';
	}
}

function onMouseMove(event) {
	if (selectedPointer) {
		dragSelectedPointer(event);
	}
}
let start = 0;

function dragSelectedPointer(event) {
	const relativeX = event.clientX - clock.center.x;
	const relativeY = event.clientY - clock.center.y;
	const prevAngle = selectedPointer.angle;
	const newAngle = Math.atan2(relativeY, relativeX) + PI_HALF;
	const angleDiff = newAngle - prevAngle;

	const timeDiff = radToTime(angleDiff + PI_HALF, selectedPointer.max);
	const secondsDiff = (timeDiff * selectedPointer.timeUnit) % selectedPointer.max;
	clock.start += secondsDiff;
	clock.update(true);
}
/*
function dragSelectedPointer(event) {
	const relativeX = event.clientX - clock.center.x;
	const relativeY = event.clientY - clock.center.y;
	const prevAngle = selectedPointer.angle;
	const newAngle = Math.atan2(relativeY, relativeX) + PI_HALF;
	const angleDiff = newAngle - prevAngle;

	const timeDiff = radToTime(angleDiff + PI_HALF, selectedPointer.max);
	const secondsDiff = (timeDiff * selectedPointer.timeUnit) % selectedPointer.max;

	const prevTime = clock.hPointer.value * 3600;
	const updatedTime = prevTime + secondsDiff;
	console.log(clock.start);
	//console.log(updatedTime);
	selectedPointer.angle = newAngle;

	//selectedPointer.draw()
	clock.start += secondsDiff; // updatedTime - (performance.now() / 1000 - performance.timeOrigin) /**seconds fro load */ clock.draw();
//clock.update(true);
//updateTimeByPointer(selectedPointer, prevAngle);

/**console.log(`a:`, selectedPointer.angle);
	console.log(
		`t:`,
		radToTime(prevAngle - selectedPointer.angle - PI_HALF, selectedPointer.max)
	); */
// טיפול מיוחד במחוג השניות:
// איננו רוצים שהוא יושפע מיידית בעת הזזת מחוגים אחרים.
// זה לא נראה טוב.
// ראה שורה -+337
//clock.update(true, selectedPointer.name === 'seconds');}

function updateTimeByPointer(pointer, prevAngle) {
	let currentTime = clock.hPointer.value * 3600;
	let diffAngle = pointer.angle - prevAngle,
		fixedDiffAngle = diffAngle < -Math.PI ? diffAngle + WHOLE_ANGLE : diffAngle;
	const diffTime = radToTime(diffAngle, pointer.max) * pointer.timeUnit,
		updatedTime = currentTime + diffTime;
	clock.start = updatedTime - (Date.now() / 1000 - LOAD_TIME);
}

function onPointerLoosened() {
	selectedPointer = null;
	canvas.style.cursor = 'grab';
	// עדכון מיוחד למחוג השניות,
	// שעדיין אינו מעודכן אם לא נגרר ישירות על ידי המשתמש
	// ראה שורה -+371
	//const { sPointer } = clock;
	//sPointer.angle = timeToRad(sPointer.value, sPointer.max);
	//clock.draw();
}

function endAdjustMode() {
	canvas.removeEventListener('mousedown', onMouseDown);
	canvas.removeEventListener('mousemove', onMouseMove);

	clock.run();

	adjustBtn.innerText = 'כוון';
	//clock.pointers.forEach(updateTimeByPointer);
	canvas.style.cursor = 'auto';
	initializeBtn.hidden = false;
	msgsLine.innerText = messages.adjustmentSucceed;
	setTimeout(() => {
		if (!adjustMode && clock.start !== clock.originStart) {
			msgsLine.innerText = messages.customTime;
		}
	}, 5000);
}

// --- Other events ---
const msgsLine = document.querySelector('#messages-line'),
	toolsBtn = document.querySelector('#show-tools'),
	adjustBtn = document.querySelector('#adjust'),
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
	if (!toolsBtn.contains(event.target) && !toolsDialog.contains(event.target)) {
		toolsDialog.hidden = true;
	}
});

adjustBtn.addEventListener('click', () => {
	adjustMode = !adjustMode;
	if (adjustMode) {
		startAdjustMode();
	} else endAdjustMode();
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
