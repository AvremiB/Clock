'use strict';
import { colors } from './config.js';
import { PI_HALF, radToTime, clock, ctx } from './main-script.js';

export class ClockPointer {
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

	toSeconds() {
		return radToTime(this.angle, this.max) * this.timeUnit;
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
