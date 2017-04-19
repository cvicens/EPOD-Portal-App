'use strict';

var _ = require('lodash');
require('angular-messages');

module.exports = 'app.user';

angular.module('app.user', [
  'ui.router'
, 'wfm.core.mediator'
, require('fh-wfm-user')
])

.config(function($stateProvider) {
  $stateProvider
    .state('app.user', {
      url: '/user',
      resolve: {
        profileData: function(userClient) {
          return userClient.getProfile();
        }
      },
      data: {
        columns: 2 /// Super important! => app template defines 3 cols... but if data.columns < 3 it hides column2
      },
      views: {
        'content@app': {
          templateUrl: 'app/user/user-detail.tpl.html',
          controller: 'UserDetailController as ctrl'
        }
      }
    });
})

.controller('UserDetailController', function ($scope, $state, $stateParams, $mdDialog, mediator, profileData, Constants) {
  var self = this;
  $scope.profileData = profileData;
  $scope.appVersion = Constants.APP_VERSION;

  console.dir(self);
});
