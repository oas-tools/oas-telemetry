'use strict';

var fs = require('fs'),
  http = require('http'),
  path = require('path');

var express = require("express");
var app = express();
var bodyParser = require('body-parser');
app.use(bodyParser.json({
  strict: false,
  limit: '50mb'
}));
// =======================
// This was to test if the performance issue when using node:20-alpine was due to the nedb package. (It was, do not ask how long it took to figure it out :D)
// This means that is highly recommended to use the official node:20 image instead of the alpine one.
const nedb = require('@seald-io/nedb');
const db = new nedb({ filename: 'db.json', autoload: true });
// =======================
var oasTools = require('oas-tools');
var jsyaml = require('js-yaml');
var serverPort = process.env.PORT || 8080;

var spec = fs.readFileSync(path.join(__dirname, '/api/oas-doc.yaml'), 'utf8');
var oasDoc = jsyaml.safeLoad(spec);

var options_object = {
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
  var heapStats = v8.getHeapStatistics();

  // Round stats to MB
  var roundedHeapStats = Object.getOwnPropertyNames(heapStats).reduce(function (map, stat) {
    map[stat] = Math.round((heapStats[stat] / 1024 / 1024) * 1000) / 1000;
    return map;
  }, {});
  roundedHeapStats['units'] = 'MB';

  res.send(roundedHeapStats);
});