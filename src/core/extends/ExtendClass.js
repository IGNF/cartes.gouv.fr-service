let clazz = null;

function assignValue(target, key, value) {
	if (typeof value === 'function') {
		target[key] = value.bind(target);
	} else if (Array.isArray(value)) {
		target[key] = [...value];
	} else if (value && typeof value === 'object') {
		target[key] = { ...value };
	} else {
		target[key] = value;
	}
}

function getClassEntries(c) {
	if (!c) {
		return [];
	}

	if (typeof c === 'function') {
		const names = Object.getOwnPropertyNames(c.prototype || {})
			.filter((name) => name !== 'constructor' && typeof c.prototype[name] === 'function');

		return names.map((name) => [name, c.prototype[name]]);
	}

	if (typeof c === 'object') {
		return Object.keys(c).map((key) => [key, c[key]]);
	}

	return [];
}

export function setClass(c) {
	if (!c || (typeof c !== 'function' && typeof c !== 'object')) {
		return;
	}

	clazz = c;
}

/**
 * Retourne la classe injectee active.
 * @returns {any}
 */
export function getClass() {
	return clazz;
}

export function applyClasses(service) {
	if (!clazz) {
		return;
	}

	const entries = getClassEntries(clazz);
	entries.forEach(([key, value]) => {
		assignValue(service, key, value);
	});
}