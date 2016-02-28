var WebTorrent = require('webtorrent')

function wtHttpApi (opts) {

  var client;
  if (opts.immediate) client = new Webtorrent(opts || {})

  var start = function () {
    return function (req, res, next) {
      if (client) return res.send(200).json({error: "Client already started"})
      client = new Webtorrent(opts || {})
      res.send(200).json({error: null})
    }
  }

  var stop = function () {
    return function (req, res, next) {
      if (!client) return res.send(200).json({error: "Client not started"})
      client.destroy(function callback (err) {
        res.send(200).json({error: err})
      });
      client = null;
    }
  }

  var status = function () {
    return function (req, res, next) {
      if (!client) return res.send(200).json({error: "Client not started"})
      var bodyRes = []
      build torrents status response
      client.torrents.forEach(function (t, i){
        var files = [];
        f.files.forEach(function (f, e) {
          files.push({
            id:     e,
            name:   f.name,
            path:   f.path,
            length: f.length,
          })
        })
        bodyRes.push({
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
        })
      })
      res.send(200).json({error: null, content: bodyRes})
    }
  }

  var addTorrent = function (dlPath) {
    return function (req, res, next) {
      if (!client) return res.send(200).json({error: "Client not started"})
      client.add(req.body.torrent, {path: dlPath, announce: req.body.announce}, function () {
        if (!req.body.immediate) res.send(200).json({error: null})
      })
      if (req.body.immediate) res.send(200).json({error: null})
    }
  }

  var seedTorrent = function (dlPath) {
    return function (req, res, next) {
      if (!client) return res.send(200).json({error: "Client not started"})
      client.seed(req.body.torrent, req.body.opts, function () {
        if (!req.body.immediate) res.send(200).json({error: null})
      })
      if (req.body.immediate) res.send(200).json({error: null})
    }
  }

  var removeTorrent = function () {
    return function (req, res, next) {
      if (!client) return res.send(200).json({error: "Client not started"})
      client.remove(req.body.torrent, function (err) {
        res.send(200).json({error: err})
      })
    }
  }

  var getTorrentInfo = function () {
    return function (req, res, next) {
      if (!client) return res.send(200).json({error: "Client not started"})
      var torrent = client.get(req.body.torrent);
      if (!torrent) return res.send(200).json({error: "Torrent not found"})
      var bodyRes = []
      // build torrent status response
      res.send(200).json({error: null, content: bodyRes})
    }
  }

  var torrentAddPeer = function () {
    return function (req, res, next) {
      if (!client) return res.send(200).json({error: "Client not started"})
      var torrent = client.get(req.body.torrent);
      if (!torrent) return res.send(200).json({error: "Torrent not found"})
      var added = torrent.addPeer(req.body.peer)
      res.send(200).json({error: added ? null : "Peer blocked by blocklist"})
    }
  }

  var torrentSelect = function () {
    return function (req, res, next) {
      if (!client) return res.send(200).json({error: "Client not started"})
      var torrent = client.get(req.body.torrent);
      if (!torrent) return res.send(200).json({error: "Torrent not found"})
      var o = req.body
      torrent.select(o.start, o.end, o.priority, function () {
        res.send(200).json({error: null})
      })
    }
  }

  var torrentDeselect = function () {
    return function (req, res, next) {
      if (!client) return res.send(200).json({error: "Client not started"})
      var torrent = client.get(req.body.torrent);
      if (!torrent) return res.send(200).json({error: "Torrent not found"})
      var o = req.body
      torrent.select(o.start, o.end, o.priority)
      res.send(200).json({error: null})
    }
  }
  var torrentCritical = function () {
    return function (req, res, next) {
      if (!client) return res.send(200).json({error: "Client not started"})
      var torrent = client.get(req.body.torrent);
      if (!torrent) return res.send(200).json({error: "Torrent not found"})
      var o = req.body
      torrent.critical(o.start, o.end)
      res.send(200).json({error: null})
    }
  }

  var getPort = require('get-port');
  var torrentServers = {
    /*torrentid: server*/
  }
  var torrentStream = function () {
    return function (req, res, next) {
      if (!client) return res.send(200).json({error: "Client not started"})
      var torrentId = req.body.torrent;
      var torrent = client.get(torrentId);
      if (!torrent) return res.send(200).json({error: "Torrent not found"})
      var okId = torrent.infoHash;
      if (torrentServers[okId])
        return res.send(200).json({body: torrentServers[okId].href})
      getPort().then(function (port) {
        var server = torrent.createServer()
        server.listen(port)
        torrentServers[okId] = {
          href: 'http://localhost:' + port + '/',
          server: server
        }
        return res.send(200).json({body: torrentServers[okId].href})
      });
    }
  }
  var torrentStreamStop = function () {
    return function (req, res, next) {
      if (!client) return res.send(200).json({error: "Client not started"})
      var torrentId = req.body.torrent;
      var torrent = client.get(torrentId);
      if (!torrent) return res.send(200).json({error: "Torrent not found"})
      var okId = torrent.infoHash;
      if (!torrentServers[okId])
        return res.send(200).json({error: "Torrent not streamed"})
      torrentServers[okId].server.close(function (err) {
        res.send(200).json({error: err})
      });
      delete torrentServers[torrentId];
    }
  }

  var torrentPause = function () {
    return function (req, res, next) {
      if (!client) return res.send(200).json({error: "Client not started"})
      var torrent = client.get(req.body.torrent);
      if (!torrent) return res.send(200).json({error: "Torrent not found"})
      torrent.pause()
      res.send(200).json({error: null})
    }
  }

  var torrentResume = function () {
    return function (req, res, next) {
      if (!client) return res.send(200).json({error: "Client not started"})
      var torrent = client.get(req.body.torrent);
      if (!torrent) return res.send(200).json({error: "Torrent not found"})
      torrent.resume()
      res.send(200).json({error: null})
    }
  }

  var fileTorrentInfo = function () {
    return function (req, res, next) {
      if (!client) return res.send(200).json({error: "Client not started"})
      var torrent = client.get(req.body.torrent);
      if (!torrent) return res.send(200).json({error: "Torrent not found"})
      torrent.resume()
      res.send(200).json({error: null})
    }
  }

  var fileTorrentSelect = function () {
    return function (req, res, next) {
      if (!client) return res.send(200).json({error: "Client not started"})
      var torrent = client.get(req.body.torrent);
      if (!torrent) return res.send(200).json({error: "Torrent not found"})
      var file = torrent.files[req.body.file];
      if (!file) return res.send(200).json({error: "File not found"})
      file.select()
      res.send(200).json({error: null})
    }
  }

  var fileTorrentDeselect = function () {
    return function (req, res, next) {
      if (!client) return res.send(200).json({error: "Client not started"})
      var torrent = client.get(req.body.torrent);
      if (!torrent) return res.send(200).json({error: "Torrent not found"})
      var file = torrent.files[req.body.file];
      if (!file) return res.send(200).json({error: "File not found"})
      file.deselect()
      res.send(200).json({error: null})
    }
  }



  return {
    start:                start,
    stop:                 stop,

    status:               status,
    add:                  addTorrent,
    seed:                 seedTorrent,
    remove:               removeTorrent,
    torrentInfo:          getTorrentInfo,

    torrentAddPeer:       torrrentAddPeer,
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
