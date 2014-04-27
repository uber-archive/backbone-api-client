var GitHubApi = require('github');
var Backbone = require('backbone');
var BackboneApiClient = require('../');

// TODO: Use eightTrack/express/http in front of GitHub

describe('A BackboneApiClient-mixed model using GitHub\'s API client', function () {
  before(function createGitHub () {
    var UserModel = BackboneApiClient.mixinModel(Backbone).extend({
      resourceName: 'user',
      callApiClient: function (method, options, cb) {
        if (method === 'read') {
          return this.apiClient[this.resourceName].get(options, cb);
        } else {
          throw new Error('We have not yet implemented "' + method + '" for `UserModel`');
        }
      }
    });
  });

  describe('fetching data', function () {
    before(function () {

    });

    it('retrieves data from the API', function () {

    });
  });

  describe('failing to retrieve data', function () {
    it('calls back with an error', function () {

    });
  });
});

// TODO: Test the entirety of methods (e.g. create, read, update, patch, delete)

// TODO: Test collections
