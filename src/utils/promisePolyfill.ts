'use client';

/**
 * Polyfill for Promise.withResolvers
 * This adds support for the Promise.withResolvers() method which was introduced in ES2023
 * but may not be available in all JavaScript environments.
 */
export function setupPromiseWithResolversPolyfill() {
  if (typeof Promise.withResolvers !== 'function') {
    // @ts-ignore - Adding a method to the Promise constructor
    Promise.withResolvers = function() {
      let resolve!: (value: any) => void;
      let reject!: (reason?: any) => void;
      
      const promise = new Promise((res, rej) => {
        resolve = res;
        reject = rej;
      });
      
      return { promise, resolve, reject };
    };
    
    console.log('Promise.withResolvers polyfill installed');
  }
}
