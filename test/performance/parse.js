const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: true
});

rl.on('line', (line) => {
    console.log(line);
});

rl.once('close', () => {
     // end of input
 });