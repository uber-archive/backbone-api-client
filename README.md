# backbone-api-client [![Build status](https://travis-ci.org/uber/backbone-api-client.png?branch=master)](https://travis-ci.org/uber/backbone-api-client)

Backbone mixin built for interacting with API clients

This was built for usage within [node.js][] and to be flexible to be reused across API clients (e.g. [Twitter][], [GitHub][]).

[node.js]: nodejs.org/
[Twitter]: http://npmjs.org/twit
[GitHub]: http://npmjs.org/github

## Getting Started
Install the module with: `npm install backbone-api-client`

In this example, we will be working with https://www.npmjs.org/package/github

```js
// Mixin `backbone-api-client` onto a model class
// DEV: This does `extend's` the class and does not mutate the original
var _ = require('underscore');
var Backbone = require('backbone');
var Github = require('github');
var BackboneApiClient = require('backbone-api-client');
var GithubModel = BackboneApiClient.mixinModel(Backbone.Model).extend({
  // DEV: Since each API client is different, this is where we map
  // backbone information into API client information
  callApiClient: function (methodKey, options, cb) {
    // Prepare headers with data
    var params = _.clone(options.data) || {};
    if (options.headers) {
      params.headers = options.headers;
    }

    // Find the corresponding resource method and call it
    var method = this.methodMap[methodKey];
    var that = this;
    return this.apiClient[this.resourceName][method](params, cb);
  }
});

// Create a repo class
var RepoModel = GithubModel.extend({
  resourceName: 'repos',
  // There are 5 different methods `create`, `update`, `patch`, `read`, `delete`
  // More info can be found in Documentation
  methodMap: {
    read: 'get'
  }
});

// Fetch information for a repo with an API client
var apiClient = new Github({
  version: '3.0.0'
});
apiClient.authenticate({
  type: 'basic',
  username: process.env.GITHUB_USERNAME,
  password: process.env.GITHUB_PASSWORD
});
var repo = new RepoModel(null, {
  apiClient: apiClient
});
repo.fetch({
  data: {
    user: 'uber',
    repo: 'backbone-api-client'
  }
}, function (err, repo, options) {
  console.log(repo.attributes);
  // Logs: {id: 19190227, name: 'backbone-api-client', ...}
});
```

## Documentation
`backbone-api-client` exposes 2 methods, `mixinModel` and `mixinCollection`, via its `module.exports`.

### `mixinModel(ModelKlass)`
Extends `ModelKlass`, via `ModelKlass.extend`, and adds API client logic. Additionally, all `sync`-related methods (e.g. `save`, `fetch`) now operate on an error-first `callback` over `success`/`error` options.

This choice was made due to being designed for the server. In [node.js][], we never want to forget errors and leave requests hanging. By using error-first, we are constantly reminded to handle these errors.

- ModelKlass `BackboneModel`, constructor either is or is a descendant of the `Backbone.Model` constructor

Returns:

- ChildModel `BackboneModel`, `Model` extended from `ModelKlass`

#### `ChildModel#initialize(attrs, options)`
Method run when a `ChildModel` is being instantiated

Original documentation: http://backbonejs.org/#Model-constructor

- attrs `Object|null`, attributes passed in to `new ChildModel(attrs, options)` call
- options `Object|null`, parameters to adjust model behavior
    - apiClient `Object`, instance of an API client to interact with a given API
        - This is not asserted against but it is required for any remote calls (e.g. `save`, `fetch`)

```js
var model = new ChildModel(null, {
  // Required for any remote calls (e.g. `save`, `fetch`)
  apiClient: apiClient
});
```

#### `ChildModel#fetch(options, cb)`
Method to retrieve item/updates via API client

Original documentation: http://backbonejs.org/#Model-fetch

Alternative invocations:

```js
model.fetch(cb);
```

- options `Object|null`, parameters to pass to [`ChildModel#sync`][]
    - data `Object`, optional object of data to send instead of `Backbone's` defaults (e.g. `model.toJSON`)
- cb `Function`, error-first callback, `(err, model, resp, options)`, to receive `fetch` results
    - err `Error|null`, error if any occurred during fetch
        - This include any errors that the API client replied with
    - model `ChildModel`, instance of `ChildModel` that was fetched with
    - resp `Objet`, response that was received from call
    - options `Object`, options used on `apiClient`

[`ChildModel#sync`]: #childmodelsyncmethod-model-options

#### `ChildModel#save(attrs, options, cb)`
Method to create/update resource via API client

Original documentation: http://backbonejs.org/#Model-save

Alternative invocations:

```js
model.save(attrs, cb);
model.save(cb);
```

- attrs `Object|null`, attributes to update on the model
- options `Object|null`, parameters to pass to [`ChildModel#sync`][]
    - data `Object`, optional object of data to send instead of `Backbone's` defaults (e.g. `attrs`)
- cb `Function`, error-first callback, `(err, model, resp, options)`, to receive `save` results
    - Same properties as [`ChildModel#fetch's cb`][model-fetch]

[model-fetch]: #childmodelfetchoptions-cb

#### `ChildModel#destroy(options, cb)`
Method to destroy resource via API client

Original documentation: http://backbonejs.org/#Model-destroy

Alternative invocations:

```js
model.destroy(cb);
```

- options `Object|null`, parameters to pass to [`ChildModel#sync`][]
    - data `Object`, optional object of data to send instead of `Backbone's` defaults (e.g. `model.toJSON`)
- cb `Function`, error-first callback, `(err, model, resp, options)`, to receive `save` results
    - Same properties as [`ChildModel#fetch's cb`][model-fetch]
    - Yes, this is not a typo. It will receive the model as if it still existed.

#### sync
  - attrs `Object`, optional object of data to send (only used for `create`, `update`, or `patch` requests)


## Examples
_(Coming soon)_

// TODO: Decided to relocate this into `callApiClient` with README examples
// TODO: Add examples in README about uses `_create/_update/etc` methods


## Contributing
In lieu of a formal styleguide, take care to maintain the existing coding style. Add unit tests for any new or changed functionality. Lint via [grunt](https://github.com/gruntjs/grunt) and test via `npm test`.

## License
Copyright (c) 2014 Uber Technologies, Inc.

Licensed under the MIT license.
