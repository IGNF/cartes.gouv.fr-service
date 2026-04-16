let instance = null;

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

function getInstanceEntries(instance) {
	const entries = [];
	const ownKeys = Object.keys(instance || {});

	ownKeys.forEach((key) => {
		entries.push([key, instance[key]]);
	});

	const proto = Object.getPrototypeOf(instance);
	if (!proto || proto === Object.prototype) {
		return entries;
	}

	const methodNames = Object.getOwnPropertyNames(proto)
		.filter((name) => name !== 'constructor' && typeof instance[name] === 'function');

	methodNames.forEach((name) => {
		entries.push([name, instance[name]]);
	});

	return entries;
}

export function setInstance(i) {
	if (!i || typeof i !== 'object') {
		return;
	}

	instance = i;
}

/**
 * Retourne l'instance injectee active.
 * @returns {any}
 */
export function getInstance() {
	return instance;
}

export function applyInstances(service) {
	if (!instance) {
		return;
	}

	const entries = getInstanceEntries(instance);
	entries.forEach(([key, value]) => {
		assignValue(service, key, value);
	});
}