let clazz = null;

function assignValue(service, key, value) {
	if (typeof value === 'function') {
		service[key] = value.bind(service);
	} else if (Array.isArray(value)) {
		service[key] = [...value];
	} else if (value && typeof value === 'object') {
		service[key] = { ...value };
	} else {
		service[key] = value;
	}
}

function getClassEntries() {
	if (!clazz) {
		return [];
	}

	if (typeof clazz === 'function') {
		const names = Object.getOwnPropertyNames(clazz.prototype || {})
			.filter((name) => name !== 'constructor' && typeof clazz.prototype[name] === 'function');

		return names.map((name) => [name, clazz.prototype[name]]);
	}

	if (typeof clazz === 'object') {
		return Object.keys(clazz).map((key) => [key, clazz[key]]);
	}

	return [];
}

export function setClass(c) {
	if (!c || (typeof c !== 'function' && typeof c !== 'object')) {
		return;
	}

	clazz = c;
}

export function applyClass(service) {
	if (!clazz) {
		return;
	}

	const entries = getClassEntries();
	entries.forEach(([key, value]) => {
		assignValue(service, key, value);
	});
}