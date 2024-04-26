import {run} from 'apipecker'
import fs from 'fs';
 

function myResultsHandler(results){
  //console.log("Results")
  //console.log(JSON.stringify(results.lotStats,null,2));
  //console.log(JSON.stringify(results.summary,null,2));
  const line = ` "${process.argv[2]}",${process.argv[3]},${process.argv[4]},${process.argv[5]},${process.argv[6]},${process.argv[7]},${results.summary.count},${results.summary.min},${results.summary.max},${results.summary.mean},${results.summary.std} \n`;
  fs.writeFileSync("output.csv", line,{flag:'a+'});
  console.log("Finished "+process.argv[2]);
}

function myUrlBuilder(){
  return "http://localhost:8080/api/v1/stress/"+process.argv[6]+"/"+process.argv[7];
}
  // process.argv.forEach(function (val, index, array) {
  //   console.log(index + ': ' + val);
  // });
  console.log("Started "+process.argv[2]);

run({
  concurrentUsers : process.argv[3],
  iterations : process.argv[4],
  delay : process.argv[5],
  verbose : true,
  urlBuilder: myUrlBuilder,
  resultsHandler : myResultsHandler
});