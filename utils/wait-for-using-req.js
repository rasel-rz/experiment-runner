/**
 * 
 * @param {string} selector - A valid CSS selector to find the element
 * @param {number} timer - The maximum time to wait for the element to be found 
 * @returns {Promise<Element>} - A promise that resolves to a Element that match the selector
 */

export default function waitFor$(selector, timer = 10000) {
    return new Promise((resolve, reject) => {
        const startTime = performance.now();
        function check() {
            const element = document.querySelector(selector);
            if (element) return resolve(element);
            const elapsedTime = performance.now() - startTime;
            if (elapsedTime >= timer) return reject(`Polling timed out after ${timer}ms`);
            requestAnimationFrame(check);
        }
        requestAnimationFrame(check);
    });
}