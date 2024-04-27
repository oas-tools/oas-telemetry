import {run} from 'apipecker'
import fs from 'fs';
import axios from 'axios';
let heapStats; 
/*
{
  "total_heap_size": 57.348,
  "total_heap_size_executable": 2,
  "total_physical_size": 57.348,
  "total_available_size": 4099.035,
  "used_heap_size": 43.971,
  "heap_size_limit": 4144,
  "malloced_memory": 1.145,
  "peak_malloced_memory": 5.889,
  "does_zap_garbage": 0,
  "number_of_native_contexts": 0,
  "number_of_detached_contexts": 0,
  "total_global_handles_size": 0.016,
  "used_global_handles_size": 0.006,
  "external_memory": 2.574,
  "units": "MB"
}
*/
//Heap stats headers csv: total_heap_size,total_heap_size_executable,total_physical_size,total_available_size,used_heap_size,heap_size_limit,malloced_memory,peak_malloced_memory,does_zap_garbage,number_of_native_contexts,number_of_detached_contexts,total_global_handles_size,used_global_handles_size,external_memory
//Heap after headers csv: total_heap_size_after,total_heap_size_executable_after,total_physical_size_after,total_available_size_after,used_heap_size_after,heap_size_limit_after,malloced_memory_after,peak_malloced_memory_after,does_zap_garbage_after,number_of_native_contexts_after,number_of_detached_contexts_after,total_global_handles_size_after,used_global_handles_size_after,external_memory_after
function myResultsHandler(results){
  let heapStatsAfter;
  axios.get("http://localhost:8080/heapStats").then((response) => {
    heapStatsAfter = response.data;
    
    const line = `"${process.argv[2]}",${process.argv[3]},${process.argv[4]},${process.argv[5]},${process.argv[6]},${process.argv[7]},${results.summary.count},${results.summary.min},${results.summary.max},${results.summary.mean},${results.summary.std},${heapStats.total_heap_size},${heapStats.total_heap_size_executable},${heapStats.total_physical_size},${heapStats.total_available_size},${heapStats.used_heap_size},${heapStats.heap_size_limit},${heapStats.malloced_memory},${heapStats.peak_malloced_memory},${heapStats.does_zap_garbage},${heapStats.number_of_native_contexts},${heapStats.number_of_detached_contexts},${heapStats.total_global_handles_size},${heapStats.used_global_handles_size},${heapStats.external_memory},${heapStatsAfter.total_heap_size},${heapStatsAfter.total_heap_size_executable},${heapStatsAfter.total_physical_size},${heapStatsAfter.total_available_size},${heapStatsAfter.used_heap_size},${heapStatsAfter.heap_size_limit},${heapStatsAfter.malloced_memory},${heapStatsAfter.peak_malloced_memory},${heapStatsAfter.does_zap_garbage},${heapStatsAfter.number_of_native_contexts},${heapStatsAfter.number_of_detached_contexts},${heapStatsAfter.total_global_handles_size},${heapStatsAfter.used_global_handles_size},${heapStatsAfter.external_memory}\n`;
    fs.writeFileSync("output.csv", line,{flag:'a+'});
    console.log("Finished "+process.argv[2]);
  }).catch((error) => {
    console.log("Error getting heapStats after"+error.message);
  });
}

function myUrlBuilder(){
  return "http://localhost:8080/api/v1/stress/"+process.argv[6]+"/"+process.argv[7];
}
  // process.argv.forEach(function (val, index, array) {
  //   console.log(index + ': ' + val);
  // });
console.log("Started "+process.argv[2]);
axios.get("http://localhost:8080/heapStats").then((response) => {
  heapStats = response.data;
  run({
    concurrentUsers : process.argv[3],
    iterations : process.argv[4],
    delay : process.argv[5],
    verbose : true,
    urlBuilder: myUrlBuilder,
    resultsHandler : myResultsHandler
  });
}).catch((error) => {
  console.log("Error getting heapStats before"+error.message);
});