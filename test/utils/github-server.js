// Create an eight-track proxy in front of GitHub
var http = require('http');
var eightTrack = require('eight-track');

exports.run = function () {
  var server;
  before(function startServer () {
    http.createServer(eightTrack({
      url: 'https://api.github.com',
      fixtureDir: __dirname + '/../fixtures/github'
    })).listen(1337);
  });
  after(function stopServer (done) {
    server.close(done);
  });
};
