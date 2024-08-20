/**
 * A basic function to wait for a function to return true
 * @param {Function} poller - waits till this function returns true
 * @param {Function} callback - function to be executed after waitFor returns true
 * @param {number} timer - time to wait for waitFor to return true
 * @param {number} frequency - frequency to check for waitFor to return true
 * @returns 
 */
export default function waitFor(poller, callback, timer = 10000, frequency = 25) {
    if (timer <= 0) return; const result = poller(); if (result) return callback(result);
    setTimeout(waitFor.bind(null, poller, callback, (timer - frequency)), frequency);
};