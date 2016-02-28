# webtorrent-http-api

json http api for webtorrent

# Install

```
npm i mh-cbon/webtorrent-http-api -g
```

# Usage

```
webtorrent-http-api 1.0.0
  json http api for webtorrent

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
      "cert": "a path to the SSL cert file",
    },
    "clear": {
      "port": "a number, or null for a random port",
      "host": "a host value to listen for http requests",
    }
  }
```

# Api

An api is provided on top of `express`.

## Install

```
npm i mh-cbon/webtorrent-http-api --save
```

## Usage

```js
var http        = require('http');
var https       = require('https');
var express     = require('express');
var bodyParser  = require('body-parser');
var wtHttpApi   = require('./index.js')(config.webtorrent);

var app = express();

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

var CLEAR = http.createServer( app );

CLEAR.listen(config.clear.port, config.clear.host);
```

## Documentation

Please check the source code at that moment.

# Read more
- https://github.com/feross/webtorrent
- http://expressjs.com/en/api.html
