import waitForElem from './../../../../utils/wait-for-elem';
import { subtract } from './helper';
waitForElem("body", () => console.log("Experiment is running! 1...2...3...5"));
console.log(subtract(1, 2));