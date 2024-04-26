'use strict'

var varapiv1stressController = require('./apiv1stressControllerService');

module.exports.newStress = function newStress(req, res, next) {
  varapiv1stressController.newStress(req.swagger.params, res, next);
};

module.exports.getStress = function getStress(req, res, next) {

  var stressRequest = {
    "problem": "knapsack",
    "parameters": [
      {
        "id": "itemNumber",
        "value": req.swagger.params.itemNumber.value
      },
      {
        "id": "maxWeight",
        "value": req.swagger.params.maxWeight.value
      }
    ],
    "config": {
      "maxMemory": -1,
      "maxTime": -1
    }
  };
  req.swagger.params.stressRequest = {
    "value": stressRequest
  };

  varapiv1stressController.newStress(req.swagger.params, res, next);
};


module.exports.getStressInfo = function getStressInfo(req, res, next) {
  varapiv1stressController.getStressInfo(req.swagger.params, res, next);
};