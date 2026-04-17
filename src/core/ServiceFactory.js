import ServiceBase from "@/core/ServiceBase";
import ServiceLocal from '@/core/ServiceLocal';
import ServiceRemote from '@/core/ServiceRemote';
import { applyClass } from '@/core/extends/ExtendClass';
import { applyInstance } from '@/core/extends/ExtendInstance';
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

    applyClass(instance);
    applyInstance(instance);
    applyMixins(instance);

    return instance;
}