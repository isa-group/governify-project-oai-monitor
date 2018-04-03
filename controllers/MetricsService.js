'use strict';

var config = require('../config');
var logger = config.logger;
var request = require('request');

exports.metricsPOST = function (args, res, next) {
    /**
     * parameters expected in the args:
    * metrics (Metrics)
    **/
    // no response value expected for this operation

    if (args.metrics.value && Object.keys(args.metrics.value).length > 0) {
        var body = args.metrics.value;

        logger.metricsCtl("New request to POST new metrics values");

        logger.metricsCtl("Sending new metrics to registry...");
        logger.metricsCtl("Return 201"); res.sendStatus(201);

        insertMetrics(body, (data) => {
            logger.metricsCtl("All metrics have been sent.");
        }, (err) => {
            logger.error(err);
        });

    } else {

        res.status(400);
        res.send(new error(400, "Bad request, metrics body is required"));

    }

}

function insertMetrics(metrics, successCb, errorCb) {
    logger.metricsCtl("Preparing requests...");

    var baseURI = config.services.registry.uri + config.services.registry.apiVersion + "/states/" + metrics.sla + "/metrics/"; // + metricId
    getAgreementById(metrics, (agreement) => {
        metrics.measures.forEach((element) => {

            //Increasing requests metrics...
            var uri = baseURI + "requests/increase"

            logger.metricsCtl("Increase metrics by account...");
            var scope = { resource: element.resource.split('?')[0], operation: element.method.toLowerCase(), level: "account", account: metrics.scope.account };

            var periods = getPeriodsByScope(scope, agreement, "requests");
            if (!periods)
                logger.metricsCtl("Not found limits by account...");
            logger.debug(JSON.stringify(periods, null, 2));
            (periods ? periods : []).forEach((element) => {
                var query = {
                    scope: scope,
                    window: { type: element.type, period: element.period }
                };
                logger.metricsCtl("Request to increase requests metric (uri = %s)", uri);
                logger.metricsCtl("With query = " + JSON.stringify(query, null, 2));
                request.post({ url: uri, json: true, body: query }, (error, response, body) => {
                    if (!error) {
                        if (response.statusCode == 200) {
                            logger.metricsCtl("Response from registry: ");
                            logger.debug(JSON.stringify(body));
                        } else {
                            logger.error("Error retriving state: " + JSON.stringify(response));
                        }
                    } else {
                        logger.error("Error retriving state: " + JSON.stringify(error));
                        errorCb(error);
                    }
                });
            });

            logger.metricsCtl("Increase metrics by tenant...");
            var scope = { resource: element.resource.split('?')[0], operation: element.method.toLowerCase(), level: "tenant", account: agreement.context.consumer };
            var periods = getPeriodsByScope(scope, agreement, "requests");
            if (!periods)
                logger.metricsCtl("Not found limits by account...");
            logger.debug(JSON.stringify(periods, null, 2));
            (periods ? periods : []).forEach((element) => {
                var query = {
                    scope: scope,
                    window: { type: element.type, period: element.period }
                };
                logger.metricsCtl("Request to increase requests metric (uri = %s)", uri);
                logger.metricsCtl("With query = " + JSON.stringify(query, null, 2));
                request.post({ url: uri, json: true, body: query }, (error, response, body) => {
                    if (!error) {
                        if (response.statusCode == 200) {
                            logger.metricsCtl("Response from registry: ");
                            logger.debug(JSON.stringify(body));
                        } else {
                            logger.error("Error retriving state: " + JSON.stringify(response));
                        }
                    } else {
                        logger.error("Error retriving state: " + JSON.stringify(error));
                        errorCb(error);
                    }
                });
            });

            //Put metrics account:
            logger.metricsCtl("Sending metrics...");
            var scope = { resource: element.resource.split('?')[0], operation: element.method.toLowerCase(), level: "account", account: metrics.scope.account };
            for (var index in element.metrics) {
                var metric = element.metrics[index];
                logger.metricsCtl("Sending metric = " + index);
                var periods = getPeriodsByScope(scope, agreement, index);
                logger.debug(JSON.stringify(periods, null, 2));
                (periods ? periods : []).forEach((element) => {
                    var query = {
                        scope: scope,
                        window: { type: element.type, period: element.period }
                    };
                    var uri = null;
                    if (query.period) {
                        uri = baseURI + index + "/increase";
                        logger.metricsCtl("Request to increase " + index + " metric (uri = %s)", uri);
                        logger.metricsCtl("With query = " + JSON.stringify(query, null, 2));
                        request.post({ url: uri, json: true, body: query }, (error, response, body) => {
                            if (!error) {
                                if (response.statusCode == 200) {
                                    logger.metricsCtl("Response from registry: ");
                                    logger.debug(JSON.stringify(body));
                                } else {
                                    logger.error("Error retriving state: " + JSON.stringify(response));
                                }
                            } else {
                                logger.error("Error retriving state: " + JSON.stringify(error));
                                errorCb(error);
                            }
                        });
                    } else {
                        uri = baseURI + index;
                        query.value = metric;
                        delete (query.window);
                        logger.metricsCtl("Request to put " + index + " metric (uri = %s)", uri);
                        logger.metricsCtl("With query = " + JSON.stringify(query, null, 2));
                        request.put({ url: uri, json: true, body: query }, (error, response, body) => {
                            if (!error) {
                                if (response.statusCode == 200) {
                                    logger.metricsCtl("Response from registry: ");
                                    logger.debug(JSON.stringify(body));
                                } else {
                                    logger.error("Error retriving state: " + JSON.stringify(response));
                                }
                            } else {
                                logger.error("Error retriving state: " + JSON.stringify(error));
                                errorCb(error);
                            }
                        });
                    }


                });
            }

        });

    }, errorCb);


    successCb(null);
}


function getPeriodsByScope(scope, agreement, metric) {
    var periords = [];
    //adding quotas period
    var quotasPeriods = agreement.terms.quotas.filter((element) => {
        return element.over[metric] ? true : false;
    }).map((element) => {
        return element.of;
    })[0]
    quotasPeriods = (quotasPeriods ? quotasPeriods : []).filter((element) => {
        return element.scope.resource === scope.resource && element.scope.operation === scope.operation && element.scope.level === scope.level;
    }).map((element) => {
        return element.limits;
    })[0];
    if (quotasPeriods)
        quotasPeriods.forEach((element) => {
            element.type = "static";
            periords.push(element);
        });
    //adding rates period
    var ratesPeriods = agreement.terms.rates.filter((element) => {
        return element.over[metric] ? true : false;
    }).map((element) => {
        return element.of;
    })[0]
    ratesPeriods = (ratesPeriods ? ratesPeriods : []).filter((element) => {
        return element.scope.resource === scope.resource && element.scope.operation === scope.operation && element.scope.level === scope.level;
    }).map((element) => {
        return element.limits;
    })[0];
    if (ratesPeriods)
        ratesPeriods.forEach((element) => {
            element.type = "dynamic";
            periords.push(element);
        });
    return periords;
}

function getAgreementById(requestInfo, successCb, errorCb) {
    var uri = config.services.registry.uri + config.services.registry.apiVersion + "/agreements/" + requestInfo.sla;
    logger.metricsCtl("Getting SLA from registry (url = %s)", uri);

    request.get({ url: uri, json: true }, (error, response, body) => {
        if (!error) {
            if (response.statusCode == 200) {
                logger.metricsCtl("Response from registry: ");
                logger.debug(JSON.stringify(body));
                successCb(body);
            } else {
                logger.error("Error retriving agreement definition: " + JSON.stringify(response));
                errorCb(null, response, body);
            }
        } else {
            logger.error("Error retriving agreement definition: " + JSON.stringify(error));
            errorCb(error, body);
        }
    });
}

function error(code, message) {
    this.code = code;
    this.message = message;
}
