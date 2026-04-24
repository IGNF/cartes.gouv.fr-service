import ServiceBase from './ServiceBase.js';
import ServiceLocal from './ServiceLocal.js';
import ServiceRemote from './ServiceRemote.js';
import { applyClass } from './extends/ExtendClass.js';
import { applyInstance } from './extends/ExtendInstance.js';
import { applyMixins } from './extends/ExtendMixin.js';

export const serviceFactoryCreate = (options) => {
    const inputOptions = options || {};

    var base = new ServiceBase(inputOptions);
    const mode = inputOptions.mode || base.mode;
    var instance;
    switch (mode) {
      case "local":
        instance = new ServiceLocal(inputOptions);
        break;
      case "remote":
        instance =  new ServiceRemote(inputOptions);
        break;
      default:
        instance = base;
        break;
    }

    applyClass(instance);
    applyInstance(instance);
    applyMixins(instance);

    return instance;
}