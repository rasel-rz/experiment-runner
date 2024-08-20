/**
 * A basic function to wait for an element to be present in the DOM
 * @param {string} waitFor - CSS Selector or variable name i.e. '.button' or 'jQuery
 * @param {Function} callback - function to be executed after waitFor returns true
 * @param {number} minElements - minimum number of elements to wait for when variable is set to false
 * @param {boolean} isVariable - if waitFor is a window variable
 * @param {number} timer - time to wait for waitFor to return true
 * @param {number} frequency - frequency to check for waitFor to return true
 * @returns 
 */
export default function waitForElem(waitFor, callback, minElements = 1, isVariable = false, timer = 10000, frequency = 25) {
    let elements = isVariable ? window[waitFor] : document.querySelectorAll(waitFor);
    if (timer <= 0) return console.log(`waitForElem | Couldn't find element with selector: ${waitFor}`);
    ((!isVariable && elements.length >= minElements) || (isVariable && (typeof window[waitFor] !== 'undefined'))) ?
        callback(elements) :
        setTimeout(waitForElem.bind(null, waitFor, callback, minElements, isVariable, (timer - frequency)), frequency);
};