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
