/**
 * A basic function to wait for a function to return true
 * @template T - The type of the value returned by the poller function
 * @param {function(): T} poller - waits till this function returns {@link https://developer.mozilla.org/en-US/docs/Glossary/Truthy truthy}
 * @param {number} timer - time to wait for waitFor to return true
 * @param {number} frequency - frequency to check for waitFor to return true
 * @returns {Promise<T>} A promise that resolves to the value returned by the poller function
 */
export default function waitUntil(poller, timer = 10000, frequency = 25) {
    return new Promise((resolve, reject) => {
        if (timer <= 0) return reject('waitFor | Timer expired');
        const result = poller();
        if (result) return resolve(result);
        return setTimeout(() => {
            waitUntil(poller, (timer - frequency), frequency)
                .then(resolve)
                .catch(reject);
        }, frequency);
    });
};