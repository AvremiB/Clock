'use strict';
// --- Classes ---

export class Point {
	constructor(x, y) {
		this.x = x;
		this.y = y;
	}

	*[Symbol.iterator]() {
		yield this.x;
		yield this.y;
	}
}
