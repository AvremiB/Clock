'use strict';
import { messages } from './config.js';
import {
	canvas,
	clock,
	msgsLine,
	initializeBtn,
	adjustMode,
	ctx,
	PI_HALF,
	LOAD_TIME,
	timeToRad,
} from './main-script.js';

// --- Adjust clock by user ---
export const adjustBtn = document.querySelector('#adjust');
export let selectedPointer;
export function startAdjustMode() {
	clock.stop();
	msgsLine.innerText = messages.adjusting;
	adjustBtn.innerText = 'סיים כיוונון';
	canvas.style.cursor = 'grab';
	initializeBtn.hidden = false;
}
export function onMouseDown(event) {
	if (!adjustMode) return;
	// מאפשר לדעת שהסמן עלה על מחוג גם אם הוא לא נוגע בו במרכז המדויק
	ctx.lineWidth = 20;
	const { clientX, clientY } = event;
	const pointerToSelect = clock.pointers.find((p) =>
		ctx.isPointInStroke(p.path, clientX, clientY)
	);
	if (pointerToSelect) {
		selectPointer(pointerToSelect);
	}
}
function selectPointer(pointer) {
	selectedPointer = pointer;
	canvas.style.cursor = 'grabbing';
}
export function onMouseMove(event) {
	if (adjustMode && selectedPointer) {
		dragSelectedPointer(event);
	}
}
function dragSelectedPointer(event) {
	const x = clock.center.x - event.clientX,
		y = clock.center.y - event.clientY;
	selectedPointer.angle = -Math.atan2(x, y) - PI_HALF;

	const details = {
		x,
		y,
		prevX: x - event.movementX,
		prevY: y - event.movementY,
	};

	updateTimeByPointer(selectedPointer, true, details);
	// טיפול מיוחד במחוג השניות:
	// איננו רוצים שהוא יושפע מיידית בעת הזזת מחוגים אחרים.
	// זה לא נראה טוב.
	// ראה שורה -+337
	clock.update(true, selectedPointer.name === 'seconds');
}
let passedInLowerHalf, lastCrossingDirection;
function updateTimeByPointer(pointer, isMoving, { x, y, prevX, prevY }) {
	const currentTime = clock.hPointer.value * 3600;
	let updatedTime = currentTime - pointer.value * pointer.timeUnit;
	updatedTime += pointer.toSeconds();
	console.log(pointer.value * pointer.timeUnit);
	// כדי להבטיח שמיקום הסמן המדווח לא יהיה זהה למרכז:
	const centerX = Math.round(clock.center.x) + 0.5,
		centerY = clock.center.y;

	if (
		pointer.name !== 'seconds' &&
		isMoving &&
		prevX !== x && // הייתה תזוזה אופקית
		prevY < centerY && // התזוזה החלה בחציו העליון של השעון
		y < centerY // והגיעה לנקודה בחציו העליון של השעון
	) {
		if (prevX < centerX && x > centerX) {
			// חלף על 12 בכיוון השעון
			console.log(
				`עברת בכיוון השעון מנקודה ${prevX} לנקודה ${x}`,
				`lastMovingDirection: ${lastCrossingDirection}`
			);
			if (lastCrossingDirection !== 'clockwise' || passedInLowerHalf) {
				passedInLowerHalf = false;
				lastCrossingDirection = 'clockwise';
				updatedTime += pointer.timeUnit * pointer.max;
			}
		} else if (prevX > centerX && x < centerX) {
			// חלף על 12 נגד כיוון השעון
			console.log(
				`עברת נגד כיוון השעון מנקודה ${prevX} לנקודה ${x}`,
				`lastMovingDirection: ${lastCrossingDirection}`
			);
			if (lastCrossingDirection !== 'counterclockwise' || passedInLowerHalf) {
				passedInLowerHalf = false;
				lastCrossingDirection = 'counterclockwise';
				updatedTime -= pointer.timeUnit * pointer.max;
			}
		}
	}

	if (y < centerY) passedInLowerHalf = true;

	clock.start = updatedTime - (Date.now() / 1000 - LOAD_TIME);
}
export function onPointerLoosened() {
	selectedPointer = null;
	canvas.style.cursor = 'grab';
	// עדכון מיוחד למחוג השניות,
	// שעדיין אינו מעודכן אם לא נגרר ישירות על ידי המשתמש
	// ראה שורה -+371
	const sP = clock.sPointer;
	sP.angle = timeToRad(sP.value, sP.max);
	clock.drawAll();
}
export function endAdjustMode() {
	adjustBtn.innerText = 'כוון';
	adjustMode = false;
	clock.pointers.forEach(updateTimeByPointer);
	canvas.style.cursor = 'auto';
	clock.run();

	initializeBtn.hidden = false;
	msgsLine.innerText = messages.adjustmentSucceed;
	setTimeout(() => {
		if (!adjustMode && clock.start !== clock.originStart) {
			msgsLine.innerText = messages.customTime;
		}
	}, 5000);
}
