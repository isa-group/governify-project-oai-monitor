'use strict';

var url = require('url');


var Default = require('./DefaultService');


module.exports.metricsPOST = function metricsPOST (req, res, next) {
  Default.metricsPOST(req.swagger.params, res, next);
};
