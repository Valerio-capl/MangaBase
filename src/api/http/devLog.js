const devLog = (...args) => { if (__DEV__) console.log(...args); };
const devWarn = (...args) => { if (__DEV__) console.warn(...args); };
export { devLog, devWarn };
