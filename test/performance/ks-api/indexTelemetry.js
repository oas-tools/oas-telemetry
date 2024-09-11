'use strict';
//CHANGE 1
// this MUST be the first line in your file (before any imports)
const oasTelemetry = require('../../../dist/index.cjs');
let fs = require('fs');
let http = require('http');
let path = require('path');
let jsyaml = require('js-yaml');

let express = require("express");
let app = express();

//CHANGE 2
// Now you can use the oasTelemetry middleware, configured with the default options, passing the OAS Spec

let spec = fs.readFileSync(path.join(__dirname, '/api/oas-doc.yaml'), 'utf8');
let oasDoc = jsyaml.safeLoad(spec);

app.use(oasTelemetry({spec : spec}))

let bodyParser = require('body-parser');
app.use(bodyParser.json({
  strict: false,
  limit: '50mb'
}));


let oasTools = require('oas-tools');

let serverPort = process.env.PORT || 8080;



let options_object = {
  controllers: path.join(__dirname, './controllers'),
  loglevel: 'error',
  strict: false,
  router: true,
  validator: true
};

oasTools.configure(options_object);

oasTools.initialize(oasDoc, app, function () {
  http.createServer(app).listen(serverPort, function () {
    console.log("App running at http://localhost:" + serverPort);
    console.log("________________________________________________________________");
    if (options_object.docs !== false) {
      console.log('API docs (Swagger UI) available on http://localhost:' + serverPort + '/docs');
      console.log("________________________________________________________________");
    }
  });
});

app.get('/', function (req, res) {
  res.redirect('/docs');
});

const v8 = require('v8');
app.get('/heapStats', function (req, res) {
  let heapStats = v8.getHeapStatistics();

  // Round stats to MB
  let roundedHeapStats = Object.getOwnPropertyNames(heapStats).reduce(function (map, stat) {
    map[stat] = Math.round((heapStats[stat] / 1024 / 1024) * 1000) / 1000;
    return map;
  }, {});
  roundedHeapStats['units'] = 'MB';

  res.send(roundedHeapStats);
});