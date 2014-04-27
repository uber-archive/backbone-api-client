// Load in test dependencies
var Backbone = require('backbone');
var expect = require('chai').expect;
var BackboneApiClient = require('../');
var FakeGitHub = require('./utils/fake-github');
var githubUtils = require('./utils/github');

describe('A BackboneApiClient-mixed model using GitHub\'s API client', function () {
  githubUtils.createClient();
  before(function createGitHubUser () {
    // Generate a UserModel
    var UserModel = BackboneApiClient.mixinModel(Backbone.Model).extend({
      resourceName: 'user',
      // DEV: Technically, this would be part of a GitHubModel but this is compressed for testing
      callApiClient: function (method, options, cb) {
        if (method === 'read') {
          return this.apiClient[this.resourceName].get(options, cb);
        } else {
          throw new Error('We have not yet implemented "' + method + '" for `UserModel`');
        }
      }
    });

    // Generate our user
    this.user = new UserModel({/* no attributes */}, {
      apiClient: this.apiClient
    });
  });
  after(function cleanupGitHubUser () {
    delete this.user;
  });

  describe('fetching data', function () {
    FakeGitHub.run();
    before(function fetchUserData (done) {
      var that = this;
      this.user.fetch(done);
    });

    it('retrieves data from the API', function () {
      expect(this.user.attributes).to.have.property('login', 'twolfsontest');
    });
  });

  describe('failing to retrieve data', function () {
    before(function fetchUserData (done) {
      var that = this;
      this.user.fetch(function saveError (err, userModel, userInfo) {
        that.err = err;
        done();
      });
    });

    it('calls back with an error', function () {
      expect(this.err).to.not.equal(null);
    });
  });
});

// TODO: Test the entirety of methods (e.g. create, read, update, patch, delete)

// TODO: Test collections
