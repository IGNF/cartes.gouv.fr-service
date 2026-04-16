import ServiceBase from "@/core/ServiceBase";
import ServiceLocal from '@/core/ServiceLocal';
import ServiceRemote from '@/core/ServiceRemote';
import { applyClasses } from '@/core/extends/ExtendClass';
import { applyInstances } from '@/core/extends/ExtendInstance';
import { applyMixins } from '@/core/extends/ExtendMixin';

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

    applyClasses(instance);
    applyInstances(instance);
    applyMixins(instance);

    return instance;
}