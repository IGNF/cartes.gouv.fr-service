const mixins = [];

export function setMixin(m) {
  mixins.push(m);
}

export function getMixins() {
  return mixins;
}

export function applyMixins(service) {
  mixins.forEach(mixin => {
    Object.keys(mixin).forEach(key => {
      const value = mixin[key];
      if (typeof value === "function") {
        service[key] = value.bind(service);
      } else if (Array.isArray(value)) {
        service[key] = [...value];
      } else if (value && typeof value === "object") {
        service[key] = { ...value };
      } else {
        service[key] = value;
      }
    })
  })
}