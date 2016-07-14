'use strict';

var config = require('../config');
var logger = config.logger;
var request = require('request');

exports.metricsPOST = function(args, res, next) {
  /**
   * parameters expected in the args:
  * metrics (Metrics)
  **/
  // no response value expected for this operation

  if(args.metrics.value && Object.keys(args.metrics.value).length > 0){
      var body = args.metrics.value;

      logger.metricsCtl("New request to POST new metrics values");

      logger.metricsCtl("Sending new metrics to registry...");
      logger.metricsCtl("Return 201"); res.sendStatus(201);

      insertMetrics(body, (data) => {
          logger.metricsCtl("All metrics have been sent.");
      }, (err) => {
          logger.error(err);
      });

  }else{

      res.status(400);
      res.send(new error(400, "Bad request, metrics body is required"));

  }

}

function insertMetrics(metrics, successCb, errorCb){
    logger.metricsCtl("Preparing requests...");

    var baseURI = config.services.registry.uri + config.services.registry.apiVersion + "/states/" + metrics.sla + "/metrics/"; // + metricId
    getAgreementById(metrics, (agreement) => {
        metrics.measures.forEach((element)=>{
            var uri = baseURI + "requests/increase"
            var scope = {resource: element.resource.split('?')[0], operation: element.method.toLowerCase(), level: "account"};


            logger.debug(JSON.stringify(getPeriodsByScope(scope, agreement, "requests"), null, 2));
            getPeriodsByScope(scope, agreement, "requests").forEach((element)=>{
                var query = {
                    scope: scope,
                    window: {type: "static", period: element.period}
                };
                logger.metricsCtl("Request to increase requests metric (uri = %s)", uri);
                logger.metricsCtl("With query = " + JSON.stringify(query, null, 2));
                request.post({url : uri, json: true, body: query}, (error, response, body) => {
                    if(!error){
                        if(response.statusCode == 200){
                            logger.metricsCtl("Response from registry: ");
                            logger.debug(JSON.stringify(body));
                        }else{
                            logger.error("Error retriving state: " + JSON.stringify(response));
                        }
                    }else{
                        logger.error("Error retriving state: " + JSON.stringify(error));
                        errorCb(error);
                    }
                });
            });

        });

    }, errorCb);


    successCb(null);
}

//NOW only quotas
function getPeriodsByScope(scope, agreement, metric){
    return agreement.terms.quotas.filter((element)=>{
        return element.over[metric] ? true : false;
    }).map((element)=>{
        return element.of;
    })[0].filter((element)=>{
        return element.scope.resource === scope.resource && element.scope.operation === scope.operation && element.scope.level === scope.level;
    }).map((element)=>{
        return element.limits;
    })[0];
}

function getAgreementById(requestInfo, successCb, errorCb){
    var uri = config.services.registry.uri + config.services.registry.apiVersion + "/agreements/" + requestInfo.sla ;
    logger.metricsCtl("Getting SLA from registry (url = %s)", uri);

    request.get({url : uri, json: true}, (error, response, body) => {
        if(!error){
            if(response.statusCode == 200){
                logger.metricsCtl("Response from registry: ");
                logger.debug(JSON.stringify(body));
                successCb(body);
            }else{
                logger.error("Error retriving agreement definition: " + JSON.stringify(response));
                errorCb(null, response, body);
            }
        }else{
            logger.error("Error retriving agreement definition: " + JSON.stringify(error));
            errorCb(error, body);
        }
    });
}

function error (code, message){
  this.code = code;
  this.message = message;
}
