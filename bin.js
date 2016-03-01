#!/usr/bin/env node

function usage () {/*

Usage
  webtorrent-http-api --config=/path/to/config.json

Options
  --config  | -c   Path to the JSON configuration file
  --verbose | -v   Enable verbosity pass in the module list to debug.

Config
  The configuration is a plain json object describing several options to
  apply to your server instance.
  {
    "base_url": "/base/url/to/serve/the/api",
    "dl_path": "/path/to/the/folder/to/download/files",
    "webtorrent": {
      immediate: Boolean,     // Starts the torrent server asap
      dht: Boolean|Object,    // Enable DHT (default=true), or options object for DHT
      max_conns: Number,      // Max number of connections per torrent (default=55)
      node_id: String|Buffer, // DHT protocol node ID (default=randomly generated)
      peer_id: String|Buffer, // Wire protocol peer ID (default=randomly generated)
      tracker: Boolean        // Whether or not to enable trackers (default=true)
    },
    "ssl": {
      "port": "a number, or null for a random port",
      "host": "a host value to listen for https requests",
      "key": "a path to an SSL key",
      "ca": "a path to the SSL CA file",
      "cert": "a path to the SSL cert file"
    },
    "clear": {
      "port": "a number, or null for a random port",
      "host": "a host value to listen for http requests"
    },
    "cors": {
      "origin": "*",
      "credentials": "true|false",
      "methods": ["GET", "PUT", "POST"],
      "allowedHeaders": ["Content-Type", "Authorization"],
      "exposedHeaders": ["Content-Range", "X-Content-Range"],
      "maxAge": 600
    }
  }
*/}
var pkg   = require('./package.json')
var argv  = require('minimist')(process.argv.slice(2));
var help  = require('@maboiteaspam/show-help')(usage, argv.h||argv.help, pkg)
var debug = require('@maboiteaspam/set-verbosity')(pkg.name, argv.v || argv.verbose);
var fs    = require('fs')

var configPath  = argv.config || argv.c || false;
configPath      = process.join(process.cdw(), configPath)
configPath      = process.resolve(configPath)

(!configPath) && help.print(usage, pkg) && help.die(
  "Wrong invokation"
);

var config = {}
try{
  config = require(configPath)
}catch(ex){
  help.die(
    "Config path must exist and be a valid JSON file.\n" + ex
  );
}

(!config) && help.print(usage, pkg)
&& help.die(
  "The configuration could not be loaded, please double check the file"
);

(!config.clear && !config.ssl)
&& help.print(usage, pkg)
&& help.die(
  "Configuration options are wrong : you must provide one of clear or ssl options"
);

(!config.dl_path || !fs.existsSync(config.dl_path))
&& help.print(usage, pkg)
&& help.die(
  "Configuration options are wrong : dl_path directory must exist"
);

(config.ssl && !fs.existsSync(config.ssl.key))
&& help.print(usage, pkg)
&& help.die(
  "Configuration options are wrong : SSL key file must exist"
);

(config.ssl && config.ssl.ca && !fs.existsSync(config.ssl.ca))
&& help.print(usage, pkg)
&& help.die(
  "Configuration options are wrong : SSL ca file must exist"
);

(config.ssl && !fs.existsSync(config.ssl.cert))
&& help.print(usage, pkg)
&& help.die(
  "Configuration options are wrong : SSL cert file must exist"
);


var http        = require('http');
var https       = require('https');
var express     = require('express');
var bodyParser  = require('body-parser');
var wtHttpApi   = require('./index.js')(config.webtorrent);

var app = express();

config.clear && console.log("%s clear %j", pkg.name, config.clear);
config.ssl && console.log("%s ssl %j", pkg.name, config.ssl);

config.cors && console.log("%s cors %j", pkg.name, config.cors);
config.cors && app.use(cors(config.cors));

var base_url = config.base_url || '/';

app.use(bodyParser.json())
app.post(config.base_url + "/start",                wtHttpApi.start());
app.post(config.base_url + "/stop",                 wtHttpApi.stop());
app.post(config.base_url + "/status",               wtHttpApi.status());
app.post(config.base_url + "/add",                  wtHttpApi.add(config.dl_path));
app.post(config.base_url + "/seed",                 wtHttpApi.seed());
app.post(config.base_url + "/status",               wtHttpApi.status());
app.post(config.base_url + "/remove",               wtHttpApi.remove());
app.post(config.base_url + "/torrentinfo",          wtHttpApi.torrentInfo());
app.post(config.base_url + "/torrentaddpeer",       wtHttpApi.torrentAddPeer());
app.post(config.base_url + "/torrentselect",        wtHttpApi.torrentSelect());
app.post(config.base_url + "/torrentdeselect",      wtHttpApi.torrentDeselect());
app.post(config.base_url + "/torrentcritial",       wtHttpApi.torrentCritical());
app.post(config.base_url + "/torrentstream",        wtHttpApi.torrentStream());
app.post(config.base_url + "/torrentstreamstop",    wtHttpApi.torrentStreamStop());
app.post(config.base_url + "/torrentpause",         wtHttpApi.torrentPause());
app.post(config.base_url + "/torrentresume",        wtHttpApi.torrentResume());
app.post(config.base_url + "/filetorrentinfo",      wtHttpApi.fileTorrentInfo());
app.post(config.base_url + "/filetorrentselect",    wtHttpApi.fileTorrentSelect());
app.post(config.base_url + "/filetorrentdeselect",  wtHttpApi.fileTorrentDeselect());



if ( config.ssl && config.ssl.key && config.ssl.cert ) {
  var SSL = https.createServer( {
      key: fs.readFileSync( config.ssl.key ),
      cert: fs.readFileSync( config.ssl.cert ),
      ca: config.ssl.ca || []
  }, app );

  SSL.listen(config.ssl.port, config.ssl.host);
}

var CLEAR = http.createServer( app );

CLEAR.listen(config.clear.port, config.clear.host);

var tearDown = function (then) {
  CLEAR.close();
  SSL && SSL.close();
  wtHttpApi.destroy();
}
process.on('beforeExit', tearDown)
process.on('SIGINT', tearDown)
