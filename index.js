
var pkg         = require('./package.json');
var debug       = require('debug')(pkg.name);
var WebTorrent  = require('webtorrent');

function wtHttpApi (opts) {

  var client;
  if (opts.immediate) client = new WebTorrent(opts || {});

  function torrentsStatus (t) {
    var files = [];
    (t.files || []).forEach(function (f, e) {
      files.push({
        id:     e,
        name:   f.name,
        path:   f.path,
        length: f.length
      })
    })
    var item = {
      id:             t.infoHash,
      infoHash:       t.infoHash,
      magnetURI:      t.magnetURI,
      files:          files,
      received:       t.received,
      downloaded:     t.downloaded,
      timeRemaining:  t.timeRemaining,
      progress:       t.progress,
      ratio:          t.ratio,
      downloadSpeed:  t.downloadSpeed,
      uploadSpeed:    t.uploadSpeed,
      path:           t.path
    };
    return item;
  }
  function listTorrentsStatus () {
    var items = []
    client.torrents.forEach(function (t, i){
      items.push(torrentsStatus(t))
    })
    return items;
  }

  function respondOkTorrent(res, torrent){
    res.status(200).json({error: null, content: torrentsStatus(torrent)})
  }
  function respondOkTorrents(res){
    res.status(200).json({error: null, content: listTorrentsStatus()})
  }
  function respondError(res, reason){
    res.status(500).json({error: reason})
  }

  var start = function () {
    return function (req, res, next) {
      if (client) return respondError(res, "Client already started")
      client = new WebTorrent(opts || {})
      res.status(200).json({error: null})
    }
  }

  var stop = function () {
    return function (req, res, next) {
      if (!client) return respondError(res, "Client not started")
      client.destroy(function callback (err) {
        res.status(200).json({error: err})
      });
      client = null;
    }
  }

  var status = function () {
    return function (req, res, next) {
      if (!client) return respondError(res, "Client not started")
      respondOkTorrents(res)
    }
  }

  var addTorrent = function (dlPath) {
    return function (req, res, next) {
      if (!client) return respondError(res, "Client not started")
      if (!req.body.torrent) return respondError(res, "Missing torrent parameter")
      var opts = {path: dlPath, announce: req.body.announce};
      debug("req.body %j", req.body);
      client.add(req.body.torrent, opts, function (torrent) {
        if (!req.body.immediate) respondOkTorrent(res, torrent)
      })
      if (req.body.immediate) respondOkTorrents(res)
    }
  }

  var seedTorrent = function (dlPath) {
    return function (req, res, next) {
      if (!client) return respondError(res, "Client not started")
      debug('req.body=%j', req.body)
      client.seed(req.body.torrent, req.body.opts, function (torrent) {
        if (!req.body.immediate) respondOkTorrent(res, torrent)
      })
      if (req.body.immediate) respondOkTorrents(res)
    }
  }

  var removeTorrent = function () {
    return function (req, res, next) {
      if (!client) return respondError(res, "Client not started")
      client.remove(req.body.torrent, function (err) {
        respondOkTorrents(res)
      })
    }
  }

  var getTorrentInfo = function () {
    return function (req, res, next) {
      if (!client) return respondError(res, "Client not started")
      var torrent = client.get(req.body.torrent);
      if (!torrent) return respondError(res, "Torrent not found")
      respondOkTorrent(res, torrent)
    }
  }

  var torrentAddPeer = function () {
    return function (req, res, next) {
      if (!client) return respondError(res, "Client not started")
      var torrent = client.get(req.body.torrent);
      if (!torrent) return respondError(res, "Torrent not found")
      var added = torrent.addPeer(req.body.peer)
      res.status(200).json({error: added ? null : "Peer blocked by blocklist"})
    }
  }

  var torrentSelect = function () {
    return function (req, res, next) {
      if (!client) return respondError(res, "Client not started")
      var torrent = client.get(req.body.torrent);
      if (!torrent) return respondError(res, "Torrent not found")
      var o = req.body
      torrent.select(o.start, o.end, o.priority, function () {
        res.status(200).json({error: null})
      })
    }
  }

  var torrentDeselect = function () {
    return function (req, res, next) {
      if (!client) return respondError(res, "Client not started")
      var torrent = client.get(req.body.torrent);
      if (!torrent) return respondError(res, "Torrent not found")
      var o = req.body
      torrent.select(o.start, o.end, o.priority)
      res.status(200).json({error: null})
    }
  }
  var torrentCritical = function () {
    return function (req, res, next) {
      if (!client) return respondError(res, "Client not started")
      var torrent = client.get(req.body.torrent);
      if (!torrent) return respondError(res, "Torrent not found")
      var o = req.body
      torrent.critical(o.start, o.end)
      res.status(200).json({error: null})
    }
  }

  var getPort = require('get-port');
  var torrentServers = {
    /*torrentid: server*/
  }
  var torrentStream = function () {
    return function (req, res, next) {
      if (!client) return respondError(res, "Client not started")
      var torrentId = req.body.torrent;
      var torrent = client.get(torrentId);
      if (!torrent) return respondError(res, "Torrent not found")
      var okId = torrent.infoHash;
      if (torrentServers[okId])
        return res.status(200).json({body: torrentServers[okId].href})
      getPort().then(function (port) {
        var server = torrent.createServer()
        server.listen(port)
        torrentServers[okId] = {
          href: 'http://localhost:' + port + '/',
          server: server
        }
        return res.status(200).json({body: torrentServers[okId].href})
      });
    }
  }
  var torrentStreamStop = function () {
    return function (req, res, next) {
      if (!client) return respondError(res, "Client not started")
      var torrentId = req.body.torrent;
      var torrent = client.get(torrentId);
      if (!torrent) return respondError(res, "Torrent not found")
      var okId = torrent.infoHash;
      if (!torrentServers[okId])
        return res.status(500).json({error: "Torrent not streamed"})
      torrentServers[okId].server.close(function (err) {
        res.status(200).json({error: err})
      });
      delete torrentServers[torrentId];
    }
  }

  var torrentPause = function () {
    return function (req, res, next) {
      if (!client) return respondError(res, "Client not started")
      var torrent = client.get(req.body.torrent);
      if (!torrent) return respondError(res, "Torrent not found")
      torrent.pause()
      res.status(200).json({error: null})
    }
  }

  var torrentResume = function () {
    return function (req, res, next) {
      if (!client) return respondError(res, "Client not started")
      var torrent = client.get(req.body.torrent);
      if (!torrent) return respondError(res, "Torrent not found")
      torrent.resume()
      res.status(200).json({error: null})
    }
  }

  var fileTorrentInfo = function () {
    return function (req, res, next) {
      if (!client) return respondError(res, "Client not started")
      var torrent = client.get(req.body.torrent);
      if (!torrent) return respondError(res, "Torrent not found")
      torrent.resume()
      res.status(200).json({error: null})
    }
  }

  var fileTorrentSelect = function () {
    return function (req, res, next) {
      if (!client) return respondError(res, "Client not started")
      var torrent = client.get(req.body.torrent);
      if (!torrent) return respondError(res, "Torrent not found")
      var file = torrent.files[req.body.file];
      if (!file) return respondError(res, "File not found")
      file.select()
      res.status(200).json({error: null})
    }
  }

  var fileTorrentDeselect = function () {
    return function (req, res, next) {
      if (!client) return respondError(res, "Client not started")
      var torrent = client.get(req.body.torrent);
      if (!torrent) return respondError(res, "Torrent not found")
      var file = torrent.files[req.body.file];
      if (!file) return respondError(res, "File not found")
      file.deselect()
      res.status(200).json({error: null})
    }
  }


  var destroy = function () {
    client && client.destroy(then);
    client = null;
  }


  return {
    destroy:              destroy,

    start:                start,
    stop:                 stop,

    status:               status,
    add:                  addTorrent,
    seed:                 seedTorrent,
    remove:               removeTorrent,
    torrentInfo:          getTorrentInfo,

    torrentAddPeer:       torrentAddPeer,
    torrentSelect:        torrentSelect,
    torrentDeselect:      torrentDeselect,
    torrentCritical:      torrentCritical,
    torrentStream:        torrentStream,
    torrentStreamStop:    torrentStreamStop,
    torrentPause:         torrentPause,
    torrentResume:        torrentResume,

    fileTorrentInfo:      fileTorrentInfo,
    fileTorrentSelect:    fileTorrentSelect,
    fileTorrentDeselect:  fileTorrentDeselect
  }
}

module.exports = wtHttpApi;
