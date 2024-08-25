/**
 * 
 * @param {string} selector - A valid CSS selector
 * @param {number} minElements - The minimum number of elements to wait for 
 * @param {number} timer - The maximum time to wait for the element to be found 
 * @param {number} frequency - The frequency to check for the element
 * @returns {Promise<NodeList>} - A promise that resolves to a NodeList of elements that match the selector
 */
export default function waitForElement(selector, minElements = 1, timer = 10000, frequency = 25) {
    return new Promise((resolve, reject) => {
        let elements = document.querySelectorAll(selector);
        if (timer <= 0) return reject(`waitForElement | Couldn't find element with selector: ${selector}`);
        if (elements.length >= minElements) return resolve(elements);
        setTimeout(() => {
            waitForElement(selector, minElements, (timer - frequency), frequency)
                .then(resolve)
                .catch(reject);
        }, frequency);
    })
};