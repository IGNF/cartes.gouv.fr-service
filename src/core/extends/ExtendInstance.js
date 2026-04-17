let instance = null;

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

function getInstanceEntries() {
	if (!instance || typeof instance !== 'object') {
		return [];
	}

	const ownEntries = Object.entries(instance);

	const proto = Object.getPrototypeOf(instance);
	if (!proto || proto === Object.prototype) {
		return ownEntries;
	}

	const methodEntries = Object.getOwnPropertyNames(proto)
		.filter((name) => name !== 'constructor' && typeof instance[name] === 'function')
		.map((name) => [name, instance[name]]);

	return [...ownEntries, ...methodEntries];
}

export function setInstance(i) {
	if (!i || typeof i !== 'object') {
		return;
	}

	instance = i;
}

export function applyInstance(service) {
	if (!instance) {
		return;
	}

	const entries = getInstanceEntries();
	entries.forEach(([key, value]) => {
		assignValue(service, key, value);
	});
}