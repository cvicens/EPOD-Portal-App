'use strict';

module.exports = 'app.auth';

angular.module('app.auth', [
  'ui.router',
, 'wfm.core.mediator'
])

.config(function($stateProvider) {
  $stateProvider
    .state('app.login', {
      url: '/login',
      data: {
        columns: 2
      },
      views: {
        'content@app': {
          templateUrl: 'app/auth/login.tpl.html',
          controller: 'LoginCtrl as ctrl',
          resolve: {
            hasSession: function(userClient) {
              return userClient.hasSession();
            }
          }
        }
      }
    })
    .state('app.password-reset', {
      url: '/password-reset',
      data: {
        columns: 2
      },
      views: {
        'content@app': {
          templateUrl: 'app/auth/password-reset.tpl.html',
          controller: 'PasswordResetCtrl as ctrl',
          resolve: {
            hasSession: function(userClient) {
              return userClient.hasSession();
            }
          }
        }
      }
    })
    .state('app.profile', {
      url: '/profile',
      views: {
        'content@app': {
          templateUrl: 'app/auth/profile.tpl.html',
          controller: 'ProfileCtrl as ctrl',
        }
      }
    })
})

.controller('LoginCtrl', function($state, $rootScope, userClient, hasSession, Constants) {
  var self = this;

  self.companyName = Constants.COMPANY_NAME;

  self.hasSession = hasSession;

  self.login = function(valid) {
    if (valid) {
      userClient.auth(self.username, self.password)
      .then(function() {
        self.loginMessages.success = true;
      }, function(err) {
        console.log(err);
        self.loginMessages.error = true;
      });
    }
  }

  self.loginMessages = {success: false, error: false};

  self.login = function(valid) {
    if (!valid) {
      return
    }
    userClient.auth(self.username, self.password)
    .then(function() {
      self.loginMessages.success = true;
      return userClient.hasSession();
    })
    .then(function(hasSession) {
      self.hasSession = hasSession;
      if ($rootScope.toState) {
        $state.go($rootScope.toState, $rootScope.toParams);
        delete $rootScope.toState;
        delete $rootScope.toParams;
      } else {
        //$state.go('app.workorder'); //<-- original
        $state.go(Constants.HOME_PAGE);
      }
    }, function(err) {
      self.loginMessages.error = true;
      console.error(err);
    });
  }

  self.logout = function() {
    userClient.clearSession()
    .then(userClient.hasSession)
    .then(function(hasSession) {
      self.hasSession = hasSession;
    }, function(err) {
      console.err(err);
    });
  }

  self.passwordReset = function() {
    $state.go('app.password-reset');
  }
})

.controller('ProfileCtrl', function() {
})

.controller('PasswordResetCtrl', function($state, $rootScope, userClient, hasSession, Constants) {
  self.companyName = Constants.COMPANY_NAME;

})
;
