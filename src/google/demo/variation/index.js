// import waitForElem from './../../../../utils/wait-for-elem';
import waitForElem from "@utils/wait-for-elem";
import { subtract } from './helper';
waitForElem("body", () => console.log("Experiment is running! 1...2...3...4"));
let x = 121;
console.log(subtract(1, 2), ++x);