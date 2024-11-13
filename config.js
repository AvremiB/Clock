'use strict';
/** UI variables */
export const colors = {
	outerBackground: 'black',
	innerBackground: 'black',
	border: 'blue',
	graduation: 'yellow',
	hourGraduation: 'white',
	digit: 'yellow',
	pointer: 'yellow',
	pivot: 'red',
};
export const preferences = (() => {
	let storage = localStorage.getItem('preferences');
	if (storage) return JSON.parse(storage);
	return {
		rhythm: 'flow',
		diff: 0,
	};
})();
export const messages = {
	customTime: 'לתשומת לבך: השעון מציג זמן מותאם אישית.',
	adjusting: 'בחר מחוג וגרור אותו למיקום הרצוי.',
	adjustmentSucceed: `✅ השעה עודכנה בהצלחה!`,
};
