'use strict';

var express = require('express')
  , config = require('./config-user')
  , q = require('q')
  , $fh = require('fh-mbaas-api')
  , _ = require('lodash')
  ;

var Delegate = function(guid) {
  this.guid = guid;
};

Delegate.prototype.xhr = function (_options) {
  var defaultOptions = {
    guid: this.guid,
    path: '/api/wfm/user',
    method: 'GET',
  };
  var options = _.defaults(_options, defaultOptions);
  var deferred = q.defer();
  $fh.service(options,function(err, data) {
    if (err) {
      deferred.reject(err);
      return;
    }
    deferred.resolve(data);
  });
  return deferred.promise;
}

Delegate.prototype.list = function() {
  return this.xhr({});
};

Delegate.prototype.read = function(id) {
  return this.xhr({
    path: '/api/wfm/user/' + id
  });
};

Delegate.prototype.update = function(user) {
  return this.xhr({
    path: '/api/wfm/user/' + user.id,
    method: 'PUT',
    params: {
      user: user
    }
  });
};

Delegate.prototype.delete = function(user) {
  return this.xhr({
    path: '/api/wfm/user/' + user.id,
    method: 'DELETE',
    params: {
      user: user
    }
  });
};

Delegate.prototype.create = function(user) {
  return this.xhr({
    path: '/api/wfm/user',
    method: 'POST',
    params: {
      user: user
    }
  });
};

// Delegate the
Delegate.prototype.auth = function(params) {
  var deferred = q.defer();
  $fh.service({
    'guid' : this.guid,
    'path': '/api/wfm/user/auth',
    'method': 'POST',
    'params': params
  }, function(err, body, serviceResponse) {
    console.log('statuscode: ', serviceResponse && serviceResponse.statusCode);
    if ( err ) {
      console.log('service call failed - err : ', err);
      deferred.reject(err);
    } else {
      console.log('Got response from service - status body : ', serviceResponse.statusCode, body);
      deferred.resolve(body);
    }
  });
  return deferred.promise;
};

Delegate.prototype.verifysession = function() {
  return this.xhr({
    path: '/api/wfm/user/verifysession',
    method: 'POST'
  });
};

Delegate.prototype.revokesession = function() {
  return this.xhr({
    path: '/api/wfm/user/revokesession',
    method: 'POST'
  });
};

function initRouter(delegate) {
  var router = express.Router();

  router.route('/').get(function(req, res, next) {
    delegate.list().then(function(users) {
      res.json(users);
    }, function(error) {
      next(error);
    });
  });
  router.route('/config/authpolicy').get(function(req, res, next) {
    res.json(config.policyId);
  });
  router.route('/:id').get(function(req, res, next) {
    delegate.read(req.params.id).then(function(user) {
      res.json(user);
    }, function(error) {
      next(error);
    });
  });
  router.route('/:id').put(function(req, res, next) {
    delegate.update(req.body).then(function(user) {
      res.json(user);
    }, function(error) {
      next(error);
    });
  });
  router.route('/').post(function(req, res, next) {
    delegate.create(req.body).then(function(user) {
      res.json(user);
    }, function(error) {
      next(error);
    });
  });
  router.route('/:id').delete(function(req, res, next) {
    console.log('delete')
    delegate.delete(req.body).then(function(user) {
      console.log('delete success');
      res.json(user);
    }, function(error) {
      console.error(error);
      next(error);
    });
  });

  return router;
};

function initAuthpolicyRouter(delegate) {
  var router = express.Router();

  router.route('/auth').post(function(req, res, next) {
    var params = req && req.body && req.body.params;
    delegate.auth(params).then(function(data) {
      res.json(data);
    }, function(error) {
      next(error);
    });
  });

  router.route('/verifysession').post(function(req, res, next) {
    delegate.verifysession().then(function(data) {
      res.json(data);
    }, function(error) {
      next(error);
    });
  }, function(error) {
    next(error);
  });

  router.route('/revokesession').post(function(req, res, next) {
    delegate.revokesession().then(function(data) {
      res.json(data);
    }, function(error) {
      next(error);
    });
  }, function(error) {
    next(error);
  });

  return router;
};

module.exports = function(app, guid) {
  var delegate = new Delegate(guid);
  var router = initRouter(delegate);
  app.use(config.apiPath, router);
  var authpolicyRouter = initAuthpolicyRouter(delegate);
  app.use(config.authpolicyPath, authpolicyRouter);
};
