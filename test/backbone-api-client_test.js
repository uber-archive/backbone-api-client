var GitHubApi = require('github');
var Backbone = require('backbone');
var BackboneApiClient = require('../');

// TODO: Use eightTrack/express/http in front of GitHub

describe('A BackboneApiClient-mixed model using GitHub\'s API client', function () {
  before(function createGitHubUser () {
    // Generate a UserModel
    var UserModel = BackboneApiClient.mixinModel(Backbone.Model).extend({
      resourceName: 'user',
      // DEV: Technically, this would be part of a GitHubModel but this is compressed for testing
      callApiClient: function (method, options, cb) {
        if (method === 'read') {
          console.log(this.apiClient, this.resourceName);
          return this.apiClient[this.resourceName].get({}, function () {
            console.log('hai');
          });
        } else {
          throw new Error('We have not yet implemented "' + method + '" for `UserModel`');
        }
      }
      // TODO: We are probably going to need `parse` logic
    });

    // Generate our user
    this.user = new UserModel({}, {
      apiClient: new GitHubApi({
        version: '3.0.0'
      })
    });
  });
  after(function cleanupGitHubUser () {
    delete this.user;
  });

  describe('fetching data', function () {
    before(function fetchUserData () {
      var that = this;
      this.user.fetch(function (err, userModel, options) {
        console.log(arguments);
      });
    });

    it('retrieves data from the API', function () {
      // console.log(this.user);
    });
  });

  describe.skip('failing to retrieve data', function () {
    it('calls back with an error', function () {

    });
  });
});

// TODO: Test the entirety of methods (e.g. create, read, update, patch, delete)

// TODO: Test collections
