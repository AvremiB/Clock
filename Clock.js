'use strict';
import { colors, preferences } from './config.js';
import { maxY, maxX, ctx, WHOLE_ANGLE, timeToRad, PI_HALF } from './main-script.js';
import { ClockPointer } from './ClockPointer.js';
import { Point } from './Point.js';

function getFixedTime(startingFrom, floor) {
	const now = startingFrom + performance.now() / 1000;
	const hours = now / 3600,
		minutes = (now % 3600) / 60,
		seconds = now % 60;
	return {
		hours,
		minutes: floor ? Math.floor(minutes) : minutes,
		seconds: floor ? Math.floor(seconds) : seconds,
	};
}

export default class Clock {
	constructor(startPoint) {
		let radius = maxY * 0.4;
		if (radius * 2.2 > maxX) radius = maxX / 2.2;
		this.radius = radius;
		this.center = new Point(maxX / 2, maxY / 2);

		this.sketchBorder();
		this.sketchDigits();
		this.sketchGraduations();
		this.sketchPivot();

		this.createPointers(radius);

		this.isRunning = false;

		if (startPoint) {
			this.start = startPoint;
		} else {
			const now =
				new Date().getTime() / 1000 - new Date().getTimezoneOffset() * 60;
			this.start = now % (12 * 60 * 60);
		}
		this.originStart = this.start;
		this.animationFrameId = null;
	}

	createPointers(radius) {
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
	}

	get pointers() {
		return [this.hPointer, this.mPointer, this.sPointer];
	}

	getPointCoordinates(angle, distanceFromCenter) {
		const x = this.center.x + Math.cos(angle) * distanceFromCenter;
		const y = this.center.y + Math.sin(angle) * distanceFromCenter;
		return [x, y];
	}

	drawAll() {
		this.cleanUp();
		this.pointers.forEach((p) => p.draw());
		this.drawPivot();
	}

	cleanUp() {
		ctx.fillStyle = colors.outerBackground;
		ctx.fillRect(0, 0, maxX, maxY);
		this.drawBorder();
		this.drawDigits();
		this.drawGraduations();
	}

	sketchBorder() {
		this.borderPath = new Path2D();
		this.borderPath.arc(...this.center, this.radius, 0, WHOLE_ANGLE);
	}

	drawBorder() {
		// border
		ctx.lineWidth = this.radius / 18;
		ctx.strokeStyle = colors.border;
		ctx.stroke(this.borderPath);
		// inner color
		ctx.fillStyle = colors.innerBackground;
		ctx.fill(this.borderPath);
	}

	sketchDigits() {
		const distanceFromCenter = this.radius * 0.73;
		this.digitsPaths = [];

		for (let i = 1; i <= 12; i++) {
			const angle = timeToRad(i, 12) - PI_HALF;
			this.digitsPaths.push({
				digit: i,
				point: this.getPointCoordinates(angle, distanceFromCenter),
			});
		}
	}

	drawDigits() {
		ctx.lineWidth = this.radius / 150;
		ctx.strokeStyle = colors.digit;
		ctx.font = `${this.radius * 0.24}px narkisim`;
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';

		for (const { digit, point } in this.digitsPoints) {
			ctx.strokeText(digit.toString(), ...point);
		}
	}

	sketchGraduations() {
		this.graduations = [];

		for (let i = 0; i < 60; i++) {
			const grad = { path: new Path2D() };
			this.graduations.push(grad);
			grad.angle = timeToRad(i, 60);

			let startDistance;
			if (i % 5 === 0) {
				startDistance = this.radius * 0.86;
				grad.length = this.radius * 0.08;
				// width and color
				grad.lineWidth = this.radius / 150;
				grad.strokeStyle = colors.hourGraduation;
			} else {
				startDistance = this.radius * 0.89;
				grad.length = this.radius * 0.05;
				// width and color
				ctx.lineWidth = this.radius / 200;
				ctx.strokeStyle = colors.graduation;
			}

			const start = this.getPointCoordinates(grad.angle, startDistance);
			const end = this.getPointCoordinates(grad.angle, startDistance + grad.length);
			grad.path.moveTo(start);
			grad.path.lineTo(end);
		}
	}

	drawGraduations() {
		this.graduations.forEach((g) => {
			ctx.lineWidth = g.lineWidth;
			ctx.strokeStyle = g.strokeStyle;
			ctx.stroke(g.path);
		});
	}

	sketchPivot() {
		this.pivot = new Path2D();
		this.pivot.arc(...this.center, this.radius / 50, 0, WHOLE_ANGLE);
	}

	drawPivot() {
		ctx.fillStyle = colors.pivot;
		ctx.fill(this.pivot);
	}

	run() {
		if (this.isRunning) return;
		this.isRunning = true;
		this.update();
	}

	update(singleTick = false, includeSeconds = true) {
		const newTime = getFixedTime(
			this.start,
			preferences.rhythm === 'tick' && this.isRunning
		);

		this.pointers.forEach((pointer) => {
			pointer.value = newTime[pointer.name];
			if (pointer.name !== 'seconds' || includeSeconds) {
				pointer.angle = timeToRad(pointer.value, pointer.max) - PI_HALF;
			}
		});

		this.drawAll();
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
