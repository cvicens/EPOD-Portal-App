'use strict';

var ngModule = angular.module('wfm.vehicle-assessment', ['wfm.core.mediator', require('fh-wfm-signature')])

require('../../dist');

ngModule.directive('vehicleAssessment', function($templateCache, mediator, userClient) {
  return {
    restrict: 'E'
  , template: $templateCache.get('wfm-template/vehicle-assessment.tpl.html')
  , scope: {
      vehicleAssessment: "=value"
      //,profileData: userClient.getProfile()
    }
  , controller: function($scope) {
      var self = this;
    }
  , controllerAs: 'ctrl'
  };
})

ngModule.directive('vehicleAssessmentForm', function($templateCache, mediator, userClient) {
  return {
    restrict: 'E'
  , template: $templateCache.get('wfm-template/vehicle-assessment-form.tpl.html')
  , scope: {
      //profileData: userClient.getProfile()
    }
  , controller: function($scope, userClient) {
      var self = this;
      $scope.vehicleAssessmentStep = 0;
      self.profileData = userClient.getProfile();
      console.log('self.profileData', self.profileData);
      self.workorder = $scope.$parent.workorder;
      self.model = {
        driver: 'Shaun Mepstead',
        vehicle: '4615',
        vehiclePIN: '123456',
        certified: false
      };
      self.answerComplete = function(event, answer) {
        self.model.complete = answer;
        $scope.vehicleAssessmentStep++;
        event.preventDefault();
        event.stopPropagation();
      };
      self.back = function(event) {
        mediator.publish('wfm:workflow:step:back');
        event.preventDefault();
        event.stopPropagation();
      }
      self.done = function(event) {
        mediator.publish('wfm:workflow:step:done', self.model);
        event.preventDefault();
        event.stopPropagation();
      };
    }
  , controllerAs: 'ctrl'
  };
})
;

module.exports = 'wfm.vehicle-assessment';
