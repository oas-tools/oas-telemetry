'use strict'
const v8 = require('v8');


function ksProblemGeneration(itemNumber, maxWeight) {

  const NI = itemNumber || 100; // Number of Items
  const WMAX = maxWeight || 100; // Maximum weight

  var items = [];
  var totalItemsWeight = 0;

  for (var i = 0; i < NI; i++) {
    var item = {}
    var itemWeight = Math.floor((Math.random() * WMAX) + 1);
    var itemName = "item" + i;
    item[itemName] = itemWeight;
    totalItemsWeight += itemWeight;
    items.push(item);
  }
  return {
    items: items,
    size: totalItemsWeight / 2
  };

}


function ksProblemSolving(capacity, items) {
  /*
    The MIT License (MIT)

    Copyright (c) 2014 Fatih Cetinkaya (http://github.com/devfacet/knapsack)
    
    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:
    
    The above copyright notice and this permission notice shall be included in all
    copies or substantial portions of the Software.
    
    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
    SOFTWARE.
  */

  var result = [],
    leftCap = capacity,
    itemsFiltered;

  if (typeof capacity !== 'number')
    return false;

  if (!items || !(items instanceof Array))
    return false;

  // Resolve
  var item,
    itemKey,
    itemVal,
    itemObj;

  itemsFiltered = items.filter(function (value) {
    itemVal = (typeof value === 'object') ? value[Object.keys(value)[0]] : null;
    if (!isNaN(itemVal) && itemVal > 0 && itemVal <= capacity) {
      return true;
    } else {
      return false;
    }
  });
  itemsFiltered.sort(function (a, b) {
    return a[Object.keys(a)[0]] < b[Object.keys(b)[0]];
  });

  for (item in itemsFiltered) {
    if (itemsFiltered.hasOwnProperty(item)) {
      itemKey = Object.keys(itemsFiltered[item])[0];
      itemVal = itemsFiltered[item][itemKey];

      if ((leftCap - itemVal) >= 0) {
        leftCap = leftCap - itemVal;

        itemObj = Object.create(null);
        itemObj[itemKey] = itemVal;
        result.push(itemObj);

        delete itemsFiltered[item];

        if (leftCap <= 0) break;
      }
    }
  }

  return result;
};



module.exports.newStress = function newStress(req, res, next) {


  var initialMemUsed = process.memoryUsage().heapUsed / 1024 / 1024;

  var totalBeginHR = process.hrtime();
  var totalBegin = totalBeginHR[0] * 1000000 + totalBeginHR[1] / 1000;

  var stressRequest = req.stressRequest.value;

  var heapStats = v8.getHeapStatistics();

  // Round stats to MB
  var roundedHeapStats = Object.getOwnPropertyNames(heapStats).reduce(function (map, stat) {
    map[stat] = Math.round((heapStats[stat] / 1024 / 1024) * 1000) / 1000;
    return map;
  }, {});

  var stressResponse = {
    "problem": stressRequest.problem,
    "parameters": stressRequest.parameters,
    "config": {
      "maxMemory": -1,
      "maxTime": -1
    },
    "info": {
      "initialMemory": Math.round((initialMemUsed) * 1000) / 1000,
      "heapStats": roundedHeapStats
    },
    "result": {
      "stages": [{
          "id": "problemGeneration",
          "duration": -1,
          "memory": -1
        },
        {
          "id": "problemSolving",
          "duration": -1,
          "memory": -1
        }
      ],
      "total": {
        "duration": -1,
        "memory": -1
      }
    }
  };


  var parametersMap = stressRequest.parameters.reduce(function (map, obj) {
    map[obj.id] = obj.value;
    return map;
  }, {});

  var stagesMap = stressResponse.result.stages.reduce(function (map, obj) {
    map[obj.id] = {
      "duration": obj.duration,
      "memory": obj.memory
    };
    return map;
  }, {});

  var itemNumber = parametersMap["itemNumber"];
  var maxWeight = parametersMap["maxWeight"];


  ///////////////// GENERATION ///////////////////

  var beginHR = process.hrtime()
  var begin = beginHR[0] * 1000000 + beginHR[1] / 1000;

  //console.time(problem+"-"+phase+"-C"); 
  var ksProblem = ksProblemGeneration(itemNumber, maxWeight); /*******/
  //console.timeEnd(problem+"-"+phase+"-C"); 

  var endHR = process.hrtime()
  var end = endHR[0] * 1000000 + endHR[1] / 1000;
  var duration = (end - begin) / 1000;
  var roundedDuration = Math.round(duration * 1000) / 1000;


  stagesMap["problemGeneration"].duration = roundedDuration;

  /////////////////////////////////////////////////

  const genMemUsed = process.memoryUsage().heapUsed / 1024 / 1024;

  stagesMap["problemGeneration"].memory = Math.round((genMemUsed - initialMemUsed) * 1000) / 1000;

  ///////////////////// SOLVING /////////////////
  var phase = "solving";
  var beginHR = process.hrtime()
  var begin = beginHR[0] * 1000000 + beginHR[1] / 1000;

  var ksSolution = ksProblemSolving(ksProblem.size, ksProblem.items); /*******/

  var endHR = process.hrtime()
  var end = endHR[0] * 1000000 + endHR[1] / 1000;
  var duration = (end - begin) / 1000;
  var roundedDuration = Math.round(duration * 1000) / 1000;

  stagesMap["problemSolving"].duration = roundedDuration;

  var finalMemUsed = process.memoryUsage().heapUsed / 1024 / 1024;

  stagesMap["problemSolving"].memory = Math.round((finalMemUsed - genMemUsed) * 1000) / 1000;

  /////////////////////////////////////////////////

  var totalEndHR = process.hrtime()
  var totalEnd = totalEndHR[0] * 1000000 + totalEndHR[1] / 1000;
  var totalDuration = (totalEnd - totalBegin) / 1000;
  var roundedDuration = Math.round(totalDuration * 1000) / 1000;

  stressResponse.result.total.duration = roundedDuration;
  stressResponse.result.total.memory = Math.round((finalMemUsed - initialMemUsed) * 1000) / 1000;

  stressResponse.result.stages = Object.getOwnPropertyNames(stagesMap).map(stageId => {
    return {
      "id": stageId,
      "duration": stagesMap[stageId].duration,
      "memory": stagesMap[stageId].memory
    };
  });

  ksSolution = null;
  ksProblem = null;

  res.send(stressResponse);
};


module.exports.getStressInfo = function getStressInfo(req, res, next) {

  var os = require('os-utils');
  var si = require('systeminformation');

  si.cpu(function (cpuInfo) {
    si.mem(function (memInfo) {

      // Round mem stats to MB
      var roundedMemInfo = Object.getOwnPropertyNames(memInfo).reduce(function (map, stat) {
        map[stat] = Math.round((memInfo[stat] / 1024 / 1024) * 1000) / 1000;
        return map;
      }, {});

      var p = os.platform();

      os.cpuUsage(function (cpuUsage) {

        os.cpuFree(function (cpuFree) {

          res.send({
            "cpuUsage": cpuUsage,
            "cpuFree": cpuFree,
            "cpuCount": os.cpuCount(),
            "memInfo": roundedMemInfo,
            "freemem": Math.round((os.freemem() * 1000)) / 1000,
            "totalmem": Math.round((os.totalmem() * 1000)) / 1000,
            "freememPercentage": os.freememPercentage(),
            "cpuInfo": cpuInfo,
            "sysUptime": os.sysUptime(),
            "processUptime": os.processUptime(),
            "loadavgLast1Minute": os.loadavg(1),
            "loadavgLast5Minutes": os.loadavg(5),
            "loadavgLast15Minutes": os.loadavg(15),
            "platform": os.platform()
          });


        });
      });


    });
  });

};