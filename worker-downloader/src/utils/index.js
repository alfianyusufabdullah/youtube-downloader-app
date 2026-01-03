export function throttle(func, limit) {
    let lastRun = 0;
    let lastArgs = null;
    let timeout = null;

    const throttled = (...args) => {
        const now = Date.now();
        lastArgs = args;

        if (now - lastRun >= limit) {
            lastRun = now;
            func(...args);
        } else if (!timeout) {
            timeout = setTimeout(() => {
                lastRun = Date.now();
                timeout = null;
                if (lastArgs) {
                    func(...lastArgs);
                }
            }, limit - (now - lastRun));
        }
    };

    throttled.cancel = () => {
        if (timeout) {
            clearTimeout(timeout);
            timeout = null;
        }
    };

    return throttled;
}

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
