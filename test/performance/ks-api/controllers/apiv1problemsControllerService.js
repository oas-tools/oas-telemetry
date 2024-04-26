'use strict'

function itemsMarshall(unMarshalledItems) {
  return unMarshalledItems.map((i) => {
    var objInput = {};
    objInput[i.item] = i.value;
    return objInput;
  });
}

function itemsUnMarshall(marshalledItems) {
  var unMarshalledItems = []
  marshalledItems.forEach((item) => {
    var objOutput = {};
    Object.getOwnPropertyNames(item).forEach(function (val) {
      objOutput.item = val;
      objOutput.value = item[val];
      unMarshalledItems.push(objOutput);
    });
  });
  return unMarshalledItems;
}

function itemsWeight(unMarshalledItems) {
  return unMarshalledItems.reduce((totalWeight, item) => {
    return totalWeight + item.value;
  }, 0);
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


module.exports.newProblem = function newProblem(req, res, next) {
  var problemRequest = req.problem.value;

  var ksProblemItems = itemsMarshall(problemRequest.problem.items);


  var beginHR = process.hrtime()
  var begin = beginHR[0] * 1000000 + beginHR[1] / 1000;

  var ksSolutionItems = ksProblemSolving(problemRequest.problem.size, ksProblemItems);

  var endHR = process.hrtime()
  var end = endHR[0] * 1000000 + endHR[1] / 1000;

  var solutionSolvingTime = (end - begin) / 1000;

  var solutionItems = itemsUnMarshall(ksSolutionItems);
  problemRequest.problem.items = problemRequest.problem.items;

  problemRequest.solution = {
    items: solutionItems,
    size: itemsWeight(solutionItems),
    stats: {
      solvingTime: solutionSolvingTime
    }
  };


  res.send(problemRequest);
};