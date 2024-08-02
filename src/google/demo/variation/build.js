function waitForElem(waitFor, callback, minElements = 1, isVariable = false, timer = 10000, frequency = 25) {
    let elements = isVariable ? window[waitFor] : document.querySelectorAll(waitFor);
    if (timer <= 0) return console.log(`waitForElem | Couldn't find element with selector: ${waitFor}`);
    ((!isVariable && elements.length >= minElements) || (isVariable && (typeof window[waitFor] !== 'undefined'))) ?
        callback(elements) :
        setTimeout(waitForElem.bind(null, waitFor, callback, minElements, isVariable, (timer - frequency)), frequency);
}

function subtract(a, b) {
    return a - b;
}

waitForElem("body", () => console.log("Experiment is running! 1...2...3...5"));
console.log(subtract(1, 2));
