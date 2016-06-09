'use strict';

exports.metricsPOST = function(args, res, next) {
  /**
   * parameters expected in the args:
  * metrics (Metrics)
  **/
  // no response value expected for this operation
  if(args.metrics.value && Object.keys(args.metrics.value).length > 0){
      var metrics = args.metrics.value;
      insertMetrics(metrics, (data) => {
          res.sendStatus(201);
      }, (err) => {
          res.setStatus(500);
          res.send(new error(500, err));
      });
  }else{
      res.status(400);
      res.send(new error(400, "Bad request, metrics body is required"));
  }

}

function insertMetrics(metrics, successCb, errorCb){
    successCb(null);
}

function error (code, message){
  this.code = code;
  this.message = message;
}
