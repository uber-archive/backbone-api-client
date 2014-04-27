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
    - Any other parameters can be accessed in future options (e.g. [`ChildModel#callApiClient`][])
- cb `Function`, error-first callback, `(err, model, resp, options)`, to receive `fetch` results
    - err `Error|null`, error if any occurred during fetch
        - This include any errors that the API client replied with
    - model `ChildModel`, instance of `ChildModel` that was fetched with
    - resp `Objet`, response that was received from call
    - options `Object`, options used on `apiClient`

[`ChildModel#sync`]: #childmodelsyncmethod-model-options

// TODO: Link up callApiClient

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
    - Any other parameters can be accessed in future options (e.g. [`ChildModel#callApiClient`][])
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
    - Any other parameters can be accessed in future options (e.g. [`ChildModel#callApiClient`][])
- cb `Function`, error-first callback, `(err, model, resp, options)`, to receive `save` results
    - Same properties as [`ChildModel#fetch's cb`][model-fetch]
    - Yes, this is not a typo. It will receive the model as if it still existed.

#### `ChildModel#sync(method, model, options)`
Method to configure request parameters to passing to API client mapper

Original documentation: http://backbonejs.org/#Model-sync

- method `String`, action to perform on a resource
    - There are 5 variations: `create`, `update`, `patch`, `read`, `delete`
    - `patch` can only be found when `options.patch` is specified in `options` on a `.save` call
        - At that point, it will take the place of `update`
- model `ChildModel`, model to act upon
- options `Object`, container for various options to specify
    - data `Objet`, optional object of data to send (overrides `attrs`)
    - attrs `Object`, optional object of data to send (only used for `create`, `update`, or `patch` requests)
    - Any other parameters will be available in [`ChildModel#callApiClient`][]

If there is a `this.adjustApiClientOptions` (via instance or prototype), then it will process the method and options.

#### `ChildModel#adjustApiClientOptions(method, options)`
User-defined method to adjust `options` before moving to `callApiClient`. This was built to add any cache-relevant data before entering a cache-aware method which poses problems during inheritance.

**if you want to use this, it must be defined by future extensions of the class.**

- method `String`, `method` from `sync`
- options `Object`, `options` from `sync`

Expected to return:

- reqOptions `Object|null`, `options` to pass on to `callApiClient`
    - If nothing is returned, the `options` object will be returned
        - This can be used in unison with mutation
    - If you choose to return an object, this will be used as the request `options`

#### `ChildModel#callApiClient(method, options, cb)`
Mapping method from Backbone action to API client invocation.

We provide a simple invoker but you are expected to create your own via `ChildModel#extend` since not all API clients have the same API.

Since solving this problem can be hard, we provide potential solutions in the [Examples section][].

// TODO: Link to examples

- method `String`, action to perform on a resource
    - There are 5 variations: `create`, `update`, `patch`, `read`, `delete`
    - `patch` can only be found when `options.patch` is specified in `options` on a `.save` call
        - At that point, it will take the place of `update`
- options `Object`, options passed in from `fetch`/`save`/etc and modified during `sync`
    - data `Object`, attributes to update for the resource
    - Any other properties will have been passed in the original `fetch`/`save`/etc invocation
- cb `Function`, error-first callback method, `(err, resp)` to send back information for handling
    - err `Error|null`, error if any occurred within API client's request
    - resp `Mixed`, API client's response for the request
        - Any data formatting/preparation should be handled in [`Model#parse`][]

[`Model#parse`]: http://backbonejs.org/#Model-parse

For reference, our stub is set as follows:

**Requires**:

- this.resourceName `String`, API client name for resource (e.g. `repos`, `issues`)

```js
// If this is a create invocation, create it
// Example: this.apiClient.create('tweets', options, cb);
this.apiClient[method](this.resourceName, options, cb);

// Otherwise, modify the specific resource
// Example: this.apiClient.update('tweets', 42, options, cb);
this.apiClient[method](this.resourceName, this.id, options, cb);
```

### `mixinCollection(CollectionKlass)`
`Collection` equivalent of `mixinModel`; extends `CollectionKlass` and adds API client logic.

- CollectionKlass `BackboneCollection`, constructor for a `Collection` to extend upon

Returns:

- ChildCollection `BackboneCollection`, extended `Collection` constructor from `CollectionKlass` with API client updates

#### `ChildCollection#initialize(model, options)`
Method to run during instantiation of new `ChildCollection`

Original documentation: http://backbonejs.org/#Collection-constructor

- models `Model[]|Object[]|null`, array of instantiated models or objects to become models for the collection
- options `Object|null`, options to alter behavior of collection
    - apiClient `Object`, instance of an API client to interact with a given API
        - This is not asserted against but it is required for any remote calls (e.g. `fetch`, `create`)

```js
var collection = new ChildCollection(null, {
  // Required for any remote calls (e.g. `fetch`, `create`)
  apiClient: apiClient
});
```

#### `ChildCollection#fetch(options, cb)`
Method to fetch array of resources via API client

Original documentation: http://backbonejs.org/#Collection-fetch

Alternative invocations:

```js
collection.fetch(cb);
```

- options `Object|null`, parameters to pass to [`ChildCollection#sync`][]
    - data `Object`, optional object of data to send instead of `Backbone's` defaults (e.g. `collection.toJSON`)
    - Any other parameters can be accessed in future options (e.g. [`ChildCollection#callApiClient`][])
- cb `Function`, error-first callback, `(err, collection, resp, options)`, to receive `fetch` results
    - err `Error|null`, error if any occurred during fetch
        - This include any errors that the API client replied with
    - collection `ChildCollection`, instance of `ChildCollection` that was fetched with
    - resp `Objet`, response that was received from call
    - options `Object`, options used on `apiClient`

[`ChildCollection#sync`]: #childcolletionsyncmethod-collection-options

#### `ChildCollection#create(attrs, options, cb)`
Method to instantiate a new model for the collection

Following steps (e.g. `sync`) will not occur in the `ChildCollection` pipeline but in the `ChildModel` pipeline.

Original documentation: http://backbonejs.org/#Collection-create

Alternative invocations:

```js
collection.create(attrs, cb);
```

- attrs `Model|Object`, properties to create a new model with
- options `Object|null`, parameters to pass to [`ChildCollection#sync`][]
    - data `Object`, optional object of data to send instead of `Backbone's` defaults (e.g. `collection.toJSON`)
    - Any other parameters can be accessed in future options (e.g. [`ChildCollection#callApiClient`][])
- cb `Function`, error-first callback, `(err, collection, resp, options)`, to receive `fetch` results
    - Same properties as [`ChildCollection#fetch's cb`][collection-fetch]

TODO: Link colleciton-fetch

#### `ChildCollection#sync(method, collection, options)`
Method to generate parameters to pass to API client for invocation

Original documentation: http://backbonejs.org/#Collection-sync

Please refer to [`ChildModel#sync`][] for documentation as they function the same (except replace `model` with `collection`).

TODO: Verify ChildModel#sync is linked

#### `ChildCollection#callApiClient(method, options, cb)`
Mapping method from Backbone action to API client invocation.

We provide a simple invoker but you are expected to create your own via `ChildCollection#extend` since not all API clients have the same API.

Since solving this problem can be hard, we provide potential solutions in the [Examples section][].

// TODO: Link to examples

- method `String`, action to perform on a resource
    - For collections, there is only `read`. The others do not occur
- options `Object`, options passed in from `fetch` and modified during `sync`
    - data `Object`, attributes to update for the resource
    - Any other properties will have been passed in the original `fetch` invocation
- cb `Function`, error-first callback method, `(err, resp)` to send back information for handling
    - err `Error|null`, error if any occurred within API client's request
    - resp `Mixed`, API client's response for the request
        - Any data formatting/preparation should be handled in [`Collection#parse`][]

[`Collection#parse`]: http://backbonejs.org/#Collection-parse

For reference, our stub is set as follows:

**Requires**:

- this.resourceName `String`, API client name for resource (e.g. `repos`, `issues`)

```js
// Load all items in a colleciton
// Example: this.apiClient.read('tweets', options, cb);
this.apiClient[method](this.resourceName, options, cb);
```

## Examples
Since the existing `callApiClient` method does not fill API clients, we are providing sample solutions.

### Method map
If the naming convention for methods is inconsistent across resources, a method map is a great way to smooth that out.

```js
// Interacting with issue comments via the GitHub module
var CommentModel = GithubModel.extend({
  methodMap:
});
```

### Bloated `callApiClient` logic
If you are performng multiple actions in your `callApiClient` (e.g. add `id` in `update`, mark `deleted` attribute on `delete`), you can break that down by invoking methods which are overwritable on a one-off basis.

```
_create
_read
```



// TODO: Decided to relocate this into `callApiClient` with README examples
// TODO: Add examples in README about uses `_create/_update/etc` methods


## Contributing
In lieu of a formal styleguide, take care to maintain the existing coding style. Add unit tests for any new or changed functionality. Lint via [grunt](https://github.com/gruntjs/grunt) and test via `npm test`.

## License
Copyright (c) 2014 Uber Technologies, Inc.

Licensed under the MIT license.
