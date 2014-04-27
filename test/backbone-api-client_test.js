// Load in test dependencies
var _ = require('underscore');
var Backbone = require('backbone');
var expect = require('chai').expect;
var BackboneApiClient = require('../');
var FakeGitHub = require('./utils/fake-github');
var githubUtils = require('./utils/github');

// Define some models/collections
var GithubModel = BackboneApiClient.mixinModel(Backbone.Model).extend({
  callApiClient: function (methodKey, options, cb) {
    // Prepare headers with data and send request
    var params = _.clone(options.data) || {};
    if (options.headers) {
      params.headers = options.headers;
    }
    var method = this.methodMap[methodKey];
    var that = this;
    return this.apiClient[this.resourceName][method](params, function handleResponse (err, res) {
      // If there is an error, callback with it
      if (err) {
        return cb(err);
      }

      // If the method was a deletion (and we were successful), mark the item as deleted
      if (methodKey === 'delete' && res.meta.status === '204 No Content') {
        that.set('deleted', true);
      }

      // Callback as per usual
      cb(null, res);
    });
  }
});
var GithubCollection = BackboneApiClient.mixinCollection(Backbone.Collection).extend({
  callApiClient: GithubModel.prototype.callApiClient
});
var UserModel = GithubModel.extend({
  // https://developer.github.com/v3/issues/comments/
  // http://mikedeboer.github.io/node-github/#user
  resourceName: 'user',
  idAttribute: 'login',
  methodMap: {
    read: 'get',
    update: 'update'
  }
  // DEV: Normally, we would us `parse` to pluck out information we wanted. The current setup is way too much info.
});
var CommentModel = GithubModel.extend({
  // https://developer.github.com/v3/users/
  // http://mikedeboer.github.io/node-github/#issues.prototype.createComment
  resourceName: 'issues',
  methodMap: {
    create: 'createComment',
    'delete': 'deleteComment'
  },
  adjustApiClientOptions: function (method, options) {
    // If this is a deletion, add on user, repo, and id
    if (method === 'delete') {
      options.data = _.extend({
        user: this.get('user').login,
        repo: this.get('repo'),
        id: this.get('id')
      }, options.data);
    }
  }
});
var IssueModel = GithubModel.extend({
  resourceName: 'issues'
});
var IssueCollection = GithubCollection.extend({
  // https://developer.github.com/v3/issues/
  // http://mikedeboer.github.io/node-github/#issues.prototype.repoIssues
  model: IssueModel,
  resourceName: IssueModel.prototype.resourceName,
  methodMap: {
    read: 'repoIssues'
  }
});

// Define a set of utilities to instantiate new models easily
var apiModelUtils = {
  initComment: function (_attrs) {
    before(function initComment () {
      // Generate our comment
      var attrs = _.defaults({
        user: 'twolfsontest',
        repo: 'Spoon-Knife'
      }, _attrs);
      this.comment = new CommentModel(attrs, {
        apiClient: this.apiClient
      });
    });
    after(function cleanupComment () {
      delete this.user;
    });
  },
  initIssues: function () {
    before(function initIssues () {
      // Generate our user
      this.issues = new IssueCollection([], {
        apiClient: this.apiClient
      });
    });
    after(function cleanupIssues () {
      delete this.issues;
    });
  },
  initUser: function () {
    before(function initUser () {
      // Generate our user
      this.user = new UserModel({login: 'twolfsontest'}, {
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
  FakeGitHub.run();
  githubUtils.createClient();

  // Before we do any updates, reset the user data to a known state
  // DEV: This verifies that previous test runs do not affect the current one (and eight-track guarantees nobody is actively updating the content)
  before(function resetUserBio (done) {
    this.apiClient.user.update({
      bio: 'This is a test account'
    }, done);
  });

  // Test out `.fetch` functionality
  describe('fetching data', function () {
    apiModelUtils.initUser();
    before(function fetchUserData (done) {
      var that = this;
      this.user.fetch(done);
    });

    it('retrieves data from the API', function () {
      expect(this.user.attributes).to.have.property('bio', 'This is a test account');
    });
  });

  describe('updating data', function () {
    apiModelUtils.initUser();
    before(function fetchUserData (done) {
      this.user.save({
        bio: 'Hello World'
      }, done);
    });

    it('updates API data', function () {
      expect(this.user.attributes).to.have.property('bio', 'Hello World');
    });
  });
});

describe('A model fetching from a downed server', function () {
  // Simulate a downed server (by not running FakeGitHub) and verify we get back errors
  githubUtils.createClient();
  apiModelUtils.initUser();
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

describe('A BackboneApiClient-mixed model', function () {
  FakeGitHub.run();
  githubUtils.createClient();
  apiModelUtils.initComment({
    number: 1, // First issue thread
    body: 'Oh hai'
  });

  describe('creating a new item', function () {
    before(function createComment (done) {
      // TODO: This should not be necessary
      // TODO: Test all variations of save (attrs, key+val)
      // TODO: Verify we test at least one variation of fetch/save (options/no options)
      this.comment.save(done);
    });

    it('creates the item', function () {
      expect(this.comment).to.have.property('id');
    });

    describe('and deleting that item', function () {
      before(function deleteComment (done) {
        this.comment.destroy(done);
      });

      it('deletes the item', function () {
        expect(this.comment.attributes).to.have.property('deleted', true);
      });
    });
  });
});

describe('A BackboneApiClient-mixed collection', function () {
  FakeGitHub.run();
  githubUtils.createClient();
  apiModelUtils.initIssues();

  describe('when fetched', function () {
    before(function loadIssues (done) {
      this.issues.fetch({
        data: {
          user: 'twolfsontest',
          repo: 'Spoon-Knife'
        }
      }, done);
    });

    it('instantiates models', function () {
      expect(this.issues).to.have.length(1);
      expect(this.issues.models[0]).to.an['instanceof'](IssueModel);
      expect(this.issues.models[0].attributes).to.have.property('id');
    });
  });
});
