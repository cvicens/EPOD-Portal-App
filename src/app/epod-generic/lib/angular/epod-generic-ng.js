'use strict';

var ngModule = angular.module('wfm.epod-generic', ['wfm.core.mediator',
                                                   require('fh-wfm-signature'),
                                                   require('fh-wfm-workorder'),
                                                   require('fh-wfm-user')])

require('../../dist');

function getFormattedTime(date) {
  return ('0' + date.getHours()).slice(-2) + ':' + ('0' + (date.getMinutes()+1)).slice(-2);
}

ngModule.directive('epodGeneric', function($templateCache, mediator, userClient) {
  return {
    restrict: 'E'
  , template: $templateCache.get('wfm-template/epod-generic.tpl.html')
  , scope: {
      epodGeneric: "=value"
    }
  , controller: function($scope) {
      var self = this;

      userClient.getProfile().then (function (profileData){
        $scope.profileData = profileData;
      });
    }
  , controllerAs: 'ctrl'
  };
});

ngModule.directive('epodGenericForm', function($templateCache, mediator, userClient, $timeout) {
  return {
    restrict: 'E'
  , template: $templateCache.get('wfm-template/epod-generic-form.tpl.html')
  , scope: {
      //profileData: userClient.getProfile(),
      action: "@action"
    }
  , link: function(scope, element, attributes){
      var self = this;
      console.log('WATCHOUT!!! ', attributes.action);
    }
  , controller: function($q, $scope, $timeout, $mdDialog, workorderSync) {
      var self = this;
      $scope.epodGenericStep = 0;
      $scope.isActionButtonDisabled = false;
      $scope.isContinueButtonDisabled = true;
      $scope.isSignatureStep = false;
      $scope.count = 0;
      $scope.selectedIndex = 0;

      $scope.$watch('selectedIndex', function(current, old) {
        console.log('current', current, "old", old);
      });

      userClient.getProfile().then (function (profileData){
        $scope.profileData = profileData;
      });

      workorderSync.createManager().then (function (manager){
        self.workorderManager = manager;
      });

      self.workorder = $scope.$parent.workorder; // TODO, user the workorderManager

      self.model = { // TODO this data shoud come from a call to the MBaaS
        action: $scope.action,
        //driver: self.workorder.driverName,
        vehicle: self.workorder.vehicle,
        vehiclePIN: '123456',
        volumeUnit: 'm3',
        timeOnSite: '', // Arrival time from customer
        dischargeStartTime: '',
        dischargeEndTime: '',
        timeOffSite: '', // Departure time from customer
        addedWater: 0,
        returnedMaterial: 0,
        waitingTime: 0
      };

      if ($scope.action === 'START DISCHARGE' ||
          $scope.action === 'FINISH DISCHARGE') {
          $scope.selectedIndex = 1;
      } else if ($scope.action === 'CONFIRM ADDITIONS') {
          $scope.selectedIndex = 3;
      } else if ($scope.action === 'SUMMARY') {
        var n = new Date();
        self.model.timeOffSite = getFormattedTime(n);
        $scope.selectedIndex = 4;
      }

      self.onAction = function(ev) {
        console.log('action', $scope.action);
        var n = new Date();
        switch ($scope.action) {
          case 'ARRIVAL':
            self.model.timeOnSite = getFormattedTime(n);
            self.workorder.timeOnSite = self.model.timeOnSite;
            break;
          case 'START DISCHARGE':
            self.model.dischargeStartTime = getFormattedTime(n);
            self.workorder.dischargeStartTime = self.model.dischargeStartTime;
            break;
          case 'FINISH DISCHARGE':

            self.model.dischargeEndTime = getFormattedTime(n);
            self.workorder.dischargeEndTime = self.model.dischargeEndTime;
            break;
          case 'CONFIRM ADDITIONS':
              // TODO
              if (self.model.addedWater > 0) {
                $scope.showConfirm(ev);
              }
              $scope.selectedTab = 3;
              break;
          case 'SUMMARY':
              $scope.isSignatureStep = true;
              self.workorder.timeOffSite = self.model.timeOffSite;
              break;
          default:

        }

        //self.workorderManager.update(self.workorder);
        //mediator.publish('wfm:workorder:updated', self.workorder);

        // Action can be triggered only once
        $scope.isActionButtonDisabled = true;
        $scope.isContinueButtonDisabled = false;
      };

      self.answerComplete = function(event, answer) {
        self.model.complete = answer;
        $scope.epodGenericStep++;
        event.preventDefault();
        event.stopPropagation();
      };
      self.back = function(event) {
        mediator.publish('wfm:workflow:step:back');
        event.preventDefault();
        event.stopPropagation();
      };

      // OLD
      self.continue = function(event) {
        //$scope.epodGenericStep++;
        event.preventDefault();
        event.stopPropagation();
      };

      self.done = function(event) {
        //debugger;
        if ('CONFIRM ADDITIONS' === $scope.action) {
          self.workorder.addedWater = self.model.addedWater;
          self.workorder.returnedMaterial = self.model.returnedMaterial;
          self.workorder.waitingTime = self.model.waitingTime;
        } else {
          self.workorder.onBehalf = self.model.onBehalf;
        }
        // Publish model, update workorder
        mediator.publish('wfm:workflow:step:done', self.model);
        self.workorderManager.update(self.workorder);

        event.preventDefault();
        event.stopPropagation();
      };

      $scope.showConfirm = function(ev) {
        // Appending dialog to document.body to cover sidenav in docs app
        var confirm = $mdDialog.confirm()
              .title('WARNING')
              .textContent('Water added at Customer request?')
              .ariaLabel('EPOD')
              .targetEvent(ev)
              .ok('YES')
              .cancel('NO');

        $mdDialog.show(confirm).then(function() {
          $scope.additionsStatus = 'Water added at customer request';
        }, function() {
          $scope.additionsStatus = 'Water not added, please change value to zero';
        });
      };

      $scope.afterShowAnimation = function(scope, element, options) {
        console.log('in afterShowAnimation');
      }

      $scope.closeDialog = function() {
        // Easily hides most recent dialog shown...
        // no specific instance reference is needed.
        $mdDialog.hide();
      };

      $scope.showDisclaimer = function(ev) {
        $mdDialog.show({
          targetEvent: $event,
          template:
            '<md-dialog>' +
            '  <md-dialog-content>Hello {{profileData.name}}!</md-dialog-content>' +
            '  <md-dialog-actions>' +
            '    <md-button ng-click="closeDialog()" class="md-primary">' +
            '      Close Greeting' +
            '    </md-button>' +
            '  </md-dialog-actions>' +
            '</md-dialog>',
          controller: self,
          onComplete: $scope.afterShowAnimation,
          locals: { employee: $scope.userName }
        });
      };

      self.acceptDisclaimer = function() {
        $scope.count++;
      };

      //$scope.getFormattedTime = function (date) {
      //  return ('0' + date.getHours()).slice(-2) + ':' + ('0' + (date.getMinutes()+1)).slice(-2);
      //}
    }
  , controllerAs: 'ctrl'
  };
})
;

module.exports = 'wfm.epod-generic';
