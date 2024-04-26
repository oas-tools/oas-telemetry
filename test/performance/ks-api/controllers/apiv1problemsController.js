'use strict'

var varapiv1problemsController = require('./apiv1problemsControllerService');

module.exports.newProblem = function newProblem(req, res, next) {
  varapiv1problemsController.newProblem(req.swagger.params, res, next);
};