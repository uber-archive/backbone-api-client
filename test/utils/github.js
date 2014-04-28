// Load in utility dependency
var GitHubApi = require('github');

// Define helpers to create/cleanup a GitHub API client
exports._createClient = function () {
  var apiClient = new GitHubApi({
    version: '3.0.0',
    protocol: 'http',
    host: 'localhost',
    port: 1337
  });
  apiClient.authenticate({
    type: 'basic',
    username: 'twolfsontest',
    password: 'password1234'
  });
  return apiClient;
};
exports.createClient = function () {
  before(function createClient () {
    this.apiClient = exports._createClient();
  });
  after(function cleanupClient () {
    delete this.apiClient;
  });
};
