// TODO: Use UMD magic for `underscore`
// https://github.com/jashkenas/backbone/blob/1.1.2/backbone.js#L8-L28
var _ = require('underscore');

// Helper for binding callbacks to options
exports._bindCallback = function (options, cb) {
  // Fallback options
  if (typeof options === 'function') {
    cb = options;
    options = {};
  }

  // Set up node bindings on options
  options.success = function (model, resp, options) {
    cb(null, model, resp, options);
  };
  options.nodeError = cb;
  return options;
};

// Define sync that interacts nicely with `apiClient` (by invoking _create/_read/etc methods)
// AND sync that calls back with original error to `nodeError`
// DEV: This *must* be bound to a Model or Collection class, it needs to attach to an instance so we can retain context of the request source
exports.sync = function (method, model, options) {
  // Original Backbone https://github.com/jashkenas/backbone/blob/1.1.2/backbone.js#L1114-L1204
  // Bind data for the request
  var params = {};
  if (options.data == null && model && (method === 'create' || method === 'update' || method === 'patch')) {
    params.data = options.attrs || model.toJSON(options);
  }

  // Generate request parameters
  var reqOptions = _.extend(params, options);

  // If there is a method to adjust our request before handing it off, run it
  // DEV: We require this to allow for adding any cache-relevant data before handing off fo `callApiClient` (where caching logic could exist)
  if (this.adjustApiClientOptions) {
    reqOptions = this.adjustApiClientOptions(method, reqOptions) || reqOptions;
  }

  // Invoke our apiClient methods (e.g. `_create/_read`)
  var request = options.request = this.callApiClient(method, reqOptions, function handleResult (err, resp) {
    if (err) {
      // DEV: We invoke our error so we can handle it appropriately. Backbone's sends back `model`, `resp`, `options`
      options.nodeError(err);
    } else {
      options.success(resp);
    }
  });
  model.trigger('request', model, request, options);
  return request;
};

// Define Model mixin
exports.mixinModel = function BackboneApiClientModel (ModelKlass) {
  return ModelKlass.extend({
    initialize: function (attrs, options) {
      // Save our apiClient for later
      // DEV: We do not require it because we don't always need to call external methods
      options = options || {};
      this.apiClient = options.apiClient;
      return ModelKlass.prototype.initialize.call(this, attrs, options);
    },

    // Provide interface to set up how we talk to our API client
    // DEV: This method should only be overwritten and not inherited from. It wouldn't make sense otherwise =_=
    callApiClient: function (method, options, cb) {
      // Assert we have a `resourceName` to refer to
      if (this.resourceName === undefined) {
        throw new Error('`BackboneApiClient.Model#callApiClient` requires `this.resourceName` to be defined in order to pass to `this.apiClient`');
      }

      // DEV: Possible method names are `create, `update`, `patch`, `delete`, and `read`
      // DEV: https://github.com/jashkenas/backbone/blob/1.1.2/backbone.js#L1197-L1204
      // DEV: `patch` only exists if someone specifies `options.patch` in `.save` https://github.com/jashkenas/backbone/blob/1.1.2/backbone.js#L491
      // If the method is `create`, call the client's `create` method without an id
      if (method === 'create') {
        return this.apiClient[method](this.resourceName, options, cb);
      // Otherwise, call the method with an id
      } else {
        return this.apiClient.update(this.resourceName, this.id, options, cb);
      }
    },

    // TODO: Decided to relocate this into `callApiClient` with README examples
    // TODO: Add examples in README about uses `_create/_update/etc` methods
    // TODO: Although, this might actually need to exist for cache logic

    // Wrap async methods to take callback as last parameter
    // DEV: We choose to use `api-client's (options, cb)` signature over Backbone's `.sync(options)` for easier maintenance
    // DEV: We revisited this thanks to `backbone-callbacks` but it was too old to use
    // https://github.com/lorenwest/backbone-callbacks/blob/445d5e312f96eb0ecc8d83664c10a2e3b8672ace/backbone-callbacks.js
    // Original backbone code: https://github.com/jashkenas/backbone/blob/1.1.2/backbone.js#L426-L528
    _bindCallback: exports._bindCallback,
    fetch: function (options, cb) {
      // Bind the callback into options and invoke the normal constructor
      options = this._bindCallback(options, cb);
      return ModelKlass.prototype.fetch.call(this, options);
    },
    save: function (key, val, options, cb) {
      // DEV: Logic taken from original https://github.com/jashkenas/backbone/blob/1.1.2/backbone.js#L443-L455
      /* attrs, [options], cb */
      if (key == null || typeof key === 'object') {
        var attrs = key;
        cb = options;
        options = val;

        // Fallback options
        // TODO: Is this still necessary?
        if (typeof options === 'function') {
          cb = options;
          options = {};
        }
        options = this._bindCallback(options, cb);
        return ModelKlass.prototype.save.call(this, attrs, options);
      /* key, val, [options], cb */
      } else {
        // Fallback `options`
        // TODO: Is this still necessary?
        if (typeof options === 'function') {
          cb = options;
          options = {};
        }
        options = this._bindCallback(options, cb);
        return ModelKlass.prototype.save.call(this, key, val, options);
      }
    },
    destroy: function (options, cb) {
      options = this._bindCallback(options, cb);
      return ModelKlass.prototype.destroy.call(this, options);
    },

    // Expose `sync` on the `this` context for the model
    sync: exports.sync
  });
};

// Define Collection mixin
exports.mixinCollection = function (CollectionKlass) {
  return CollectionKlass.extend({
    initialize: function (attrs, options) {
      // Save our apiClient for later
      options = options || {};
      this.apiClient = options.apiClient;
      return CollectionKlass.prototype.initialize.call(this, attrs, options);
    },

    // DEV: We do not need create, update, patch, or delete since they are only used by models
    callApiClient: function (method, options, cb) {
      if (this.resourceName === undefined) {
        throw new Error('`BackboneApiClient.Collection#callApiClient` requires `this.resourceName` to be defined in order to pass to `this.apiClient`');
      }
      return this.apiClient[method](this.resourceName, options, cb);
    },

    // Wrap async methods to take callback as last parameter
    // DEV: We choose to use `api-client's (options, cb)` signature over Backbone's `.sync(options)` for easier maintenance
    // DEV: We revisited this thanks to `backbone-callbacks` but it was too old to use
    // https://github.com/lorenwest/backbone-callbacks/blob/445d5e312f96eb0ecc8d83664c10a2e3b8672ace/backbone-callbacks.js
    // Original backbone code: https://github.com/jashkenas/backbone/blob/1.1.2/backbone.js#L855-L888
    _bindCallback: exports._bindCallback,
    fetch: function (options, cb) {
      options = this._bindCallback(options, cb);
      return CollectionKlass.prototype.fetch.call(this, options);
    },
    create: function (model, options, cb) {
      options = this._bindCallback(options, cb);
      return CollectionKlass.prototype.create.call(this, model, options);
    },
    sync: exports.sync
  });
};
