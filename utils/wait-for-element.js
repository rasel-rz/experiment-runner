/**
 * 
 * @param {string} selector - A valid CSS selector
 * @param {number} minElements - The minimum number of elements to wait for 
 * @param {number} timer - The maximum time to wait for the element to be found 
 * @param {number} frequency - The frequency to check for the element
 * @returns {Promise<Element>} - A promise that resolves to a Element that match the selector
 */
export default function waitForElement(selector, timer = 10000, frequency = 25) {
    return new Promise((resolve, reject) => {
        let element = document.querySelector(selector);
        if (timer <= 0) return reject(`waitForElement | Couldn't find element with selector: ${selector}`);
        if (element) return resolve(element);
        setTimeout(() => {
            waitForElement(selector, (timer - frequency), frequency)
                .then(resolve)
                .catch(reject);
        }, frequency);
    });
};