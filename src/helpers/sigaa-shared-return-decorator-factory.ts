/* eslint-disable @typescript-eslint/no-unused-vars */

/**
 * @category Internal
 * Method decorator to cache the return,
 * it identifies the returns based on the
 * parameter id of the first argument.
 **/
export function sharedReturn() {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ): void {
    if (target.kind !== 'method')
      throw new Error('SIGAA: SharedReturn is only supported on methods.');

    const originalMethod = target.descriptor.value; // save a reference to the original method
    const cache = new Map<string, any>(); // create a regular JavaScript object as a cache

    target.descriptor.value = function (...args: any[]): any {
      const id = args[0].id;
      if (!id) return originalMethod.apply(this, args);

      if (cache.has(id)) {
        const cachedValue = cache.get(id);
        return cachedValue;
      }
      
      const instance = originalMethod.apply(this, args);
      cache.set(id, instance);
      return instance;
    };
  };
}
