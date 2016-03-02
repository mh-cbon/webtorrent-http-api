var child = require('child_process').spawn

var spawn = function (b, e) {
  var p = child(b, e);
  process.on('SIGINT', function () {
    p.kill()
  })
  p.stdout.pipe(process.stdout);
  p.stderr.pipe(process.stderr);
}

spawn('http-server', ['public', '-o', '-c-1']);
spawn('http-file-store', ['-c', './http-store.json', '-v']);
spawn('node', ['../bin.js', '-c', './config.json', '-v'/*, '*'*/]);
