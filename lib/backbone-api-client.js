// TODO: Use UMD magic for `underscore`
// https://github.com/jashkenas/backbone/blob/1.1.2/backbone.js#L8-L28

var _ = require('underscore');

exports.Model = function BackboneApiClientModel (klass) {
  return _.extend(klass, {
  // TODO: This is only model. Copy over Collection equivalent as well
    initialize: function (attrs, options) {
      // Save our apiClient for later
      options = options || {};
      this.apiClient = options.apiClient;
      // TODO: Call `klass.initialize`
    },

    // Define explicit methods for one-off overiding in an API client
    // DEV: Ordered to match `methodMap` https://github.com/jashkenas/backbone/blob/1.1.2/backbone.js#L1197-L1204
    _create: function (options, cb) {
      if (this.resourceName === undefined) {
        throw new Error('`BackboneApiClient#_create` requires `this.resourceName` to be defined in order to pass to `this.apiClient`');
      }
      this.apiClient.create(this.resourceName, options, cb);
    },
    _update: function (options, cb) {
      if (this.resourceName === undefined) {
        throw new Error('`BackboneApiClient#_update` requires `this.resourceName` to be defined in order to pass to `this.apiClient`');
      }
      this.apiClient.update(this.resourceName, this.id, options, cb);
    },
    _patch: function (options, cb) {
      if (this.resourceName === undefined) {
        throw new Error('`BackboneApiClient#_patch` requires `this.resourceName` to be defined in order to pass to `this.apiClient`');
      }
      this.apiClient.patch(this.resourceName, this.id, options, cb);
    },
    _delete: function (options, cb) {
      if (this.resourceName === undefined) {
        throw new Error('`BackboneApiClient#_delete` requires `this.resourceName` to be defined in order to pass to `this.apiClient`');
      }
      this.apiClient['delete'](this.resourceName, this.id, options, cb);
    },
    _read: function (options, cb) {
      if (this.resourceName === undefined) {
        throw new Error('`BackboneApiClient#_read` requires `this.resourceName` to be defined in order to pass to `this.apiClient`');
      }
      this.apiClient.read(this.resourceName, this.id, options, cb);
    },

    // Helper for binding callbacks to options
    _bindCallback: function (options, cb) {
      options.success = function (model, resp, options) {
        cb(null, model, resp, options);
      };
      options.nodeError = cb;
      return options;
    },

    // Wrap async methods to take callback as last parameter
    // DEV: We choose to use `api-client's (options, cb)` signature over Backbone's `.sync(options)` for easier maintenance
    // DEV: We revisited this thanks to `backbone-callbacks` but it was too old to use
    // https://github.com/lorenwest/backbone-callbacks/blob/445d5e312f96eb0ecc8d83664c10a2e3b8672ace/backbone-callbacks.js
    // Original backbone code: https://github.com/jashkenas/backbone/blob/1.1.2/backbone.js#L426-L528
    fetch: function (options, cb) {
      this._bindCallback(options, cb);
      return Backbone.Model.prototype.fetch.call(this, options);
    },
    save: function (key, val, options, cb) {
      // DEV: Logic taken from original https://github.com/jashkenas/backbone/blob/1.1.2/backbone.js#L443-L455
      /* attrs, [options], cb */
      if (key == null || typeof key === 'object') {
        var attrs = key;
        cb = options;
        options = val;

        // Fallback options
        if (typeof options === 'function') {
          cb = options;
          options = {};
        }
        this._bindCallback(options, cb);
        return Backbone.Model.prototype.save.call(this, attrs, options);
      /* key, val, [options], cb */
      } else {
        // Fallback `options`
        if (typeof options === 'function') {
          cb = options;
          options = {};
        }
        this._bindCallback(options, cb);
        return Backbone.Model.prototype.save.call(this, key, val, options);
      }
    },
    destroy: function (options, cb) {
      this._bindCallback(options, cb);
      return Backbone.Model.prototype.destroy.call(this, options);
    },
    // Define sync that interacts nicely with `apiClient` (by invoking _create/_read/etc methods)
    // AND sync that calls back with original error to `nodeError`
    sync: function (method, model, options) {
      // Original Backbone https://github.com/jashkenas/backbone/blob/1.1.2/backbone.js#L1114-L1204
      // Bind data for the request
      var params = {};
      if (options.data == null && model && (method === 'create' || method === 'update' || method === 'patch')) {
        params.data = options.attrs || model.toJSON(options);
      }

      // Invoke our apiClient methods (e.g. `_create/_read`)
      var request = options.request = this['_' + method](_.extend(params, options), function handleResult (err, resp) {
        if (err) {
          // DEV: We invoke our error so we can handle it appropriately. Backbone's sends back `model`, `resp`, `options`
          options.nodeError(err);
        } else {
          options.success(resp);
        }
      });
      model.trigger('request', model, request, options);
      return request;
    }
  });
};
