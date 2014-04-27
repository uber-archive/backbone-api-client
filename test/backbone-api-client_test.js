// Load in test dependencies
var _ = require('underscore');
var Backbone = require('backbone');
var expect = require('chai').expect;
var BackboneApiClient = require('../');
var FakeGitHub = require('./utils/fake-github');
var githubUtils = require('./utils/github');

// Define a set of utilities to instantiate new models easily
var apiModelUtils = {
  createUser: function () {
    before(function createUser () {
      // Generate our user
      this.user = new this.UserModel({/* no attributes */}, {
        apiClient: this.apiClient
      });
    });
    after(function cleanupUser () {
      delete this.user;
    });
  }
};

// Start the tests
describe('A BackboneApiClient-mixed model using GitHub\'s API client', function () {
  githubUtils.createClient();

  // Before we do any updates, reset the user data to a known state
  // DEV: This verifies that previous test runs do not affect the current one (and eight-track guarantees nobody is actively updating the content)
  before(function resetUserBio (done) {
    // this.apiClient.update(
  });

  // Continue with the test
  before(function createModel () {
    // Generate a UserModel
    this.UserModel = BackboneApiClient.mixinModel(Backbone.Model).extend({
      // http://mikedeboer.github.io/node-github/#user
      // https://developer.github.com/v3/users/
      resourceName: 'user',
      // DEV: Technically, this would be part of a GitHubModel but this is compressed for testing
      callApiClient: function (method, options, cb) {
        // Call our corresponding GitHub method (e.g. `github.user.get`, `github.user.update`)
        if (method === 'read') {
          method = 'get';
        }

        // Prepare headers with data and send request
        var params = _.clone(options.data);
        if (options.headers) {
          params.headers = options.headers;
        }
        return this.apiClient[this.resourceName][method](params, cb);
      }
    });
  });
  after(function cleanupModel () {
    delete this.UserModel;
  });

  // Test out `.fetch` functionality
  describe('fetching data', function () {
    apiModelUtils.createUser();
    FakeGitHub.run();
    before(function fetchUserData (done) {
      var that = this;
      this.user.fetch(done);
    });

    it('retrieves data from the API', function () {
      expect(this.user.attributes).to.have.property('login', 'twolfsontest');
    });
  });

  // Simulate a downed server (by not running FakeGitHub) and verify we get back errors
  describe('failing to retrieve data', function () {
    apiModelUtils.createUser();
    before(function fetchUserData (done) {
      var that = this;
      this.user.fetch(function saveError (err, userModel, userInfo) {
        that.err = err;
        done();
      });
    });

    it('calls back with an error', function () {
      expect(this.err).to.have.property('message', 'connect ECONNREFUSED');
    });
  });
});

// TODO: Test the entirety of methods (e.g. create, read, update, patch, delete)

// TODO: Test collections
