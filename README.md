# OAI Monitor

This project is an implementation of Basic SLA Management [SLA Metrics](https://github.com/isa-group/SLA4OAI-Specification/blob/master/operationalServices.md#43-sla-metrics) endpoint.
You can find a running instance [here](http://monitor.oai.governify.io/api/v1/docs).

This component depends on other component:

1. Registry,  [read more]().

You can configure the endpoint of this component on `./config/config.yaml`

## Running Local

Download this repository, configure component and execute these commands:

```javascript

npm install

npm start

```
## Running Docker

Run the component which monitor depends on and execute this command:

```javascript

docker run -d --name monitor-container -e NODE_ENV=production --link registry-container:registry -p 5030:80 isagroup/governify-project-oai-supervisor

```
