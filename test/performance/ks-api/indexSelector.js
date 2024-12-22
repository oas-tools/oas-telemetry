//This file selects the correct index.js to run based on the env varibale INDEX_SELECTOR

const indexSelector = process.env.INDEX_SELECTOR || '';
console.log(`indexSelector: ${indexSelector}`);
let fileToRun = `./index${indexSelector}.js`;

require(fileToRun);