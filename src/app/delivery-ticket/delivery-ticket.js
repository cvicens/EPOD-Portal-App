'use strict';

var _ = require('lodash');
require('angular-messages');

var getStatusIcon = function(status) {
  var statusIcon;
  switch(status) {
    case 'In Progress':
      statusIcon = 'autorenew';
      break;
    case 'Complete':
      statusIcon = 'assignment_turned_in';
      break;
    case 'Aborted':
      statusIcon = 'assignment_late';
      break;
    case 'On Hold':
      statusIcon = 'pause';
      break;
    case 'Unassigned':
      statusIcon = 'assignment_ind';
      break;
    case 'New':
      statusIcon = 'new_releases';
      break;
    default:
      statusIcon = 'radio_button_unchecked';
  }
  return statusIcon;
}

angular.module('app.delivery-ticket', [
  'ui.router'
, 'wfm.core.mediator'
, 'ngMessages'
])

.config(function($stateProvider) {
  $stateProvider
    .state('app.delivery-ticket', {
      url: '/delivery-ticket/list',
      resolve: {
        //workorders: function(epodWorkorderManager) {
        //debugger;
        //  return epodWorkorderManager.list();
        //},
        workorderManager: function(workorderSync) {
          return workorderSync.managerPromise;
        },
        workorders: function(workorderManager) {
          return workorderManager.list();
        },
        workflows: function(workflowManager) {
          return workflowManager.list();
        },
        resultManager: function(resultSync) {
          return resultSync.managerPromise;
        },
        resultMap: function(resultManager) {
          return resultManager.list()
          .then(function(results) {
            var map = {};
            results.forEach(function(result) {
              map[result.workorderId] = result;
            });
            return map;
          })
        }
      },
      data: {
        columns: 2 /// Super important! => app template defines 3 cols... but if data.columns < 3 it hides column2
      },
      views: {
        //column2: {
        //templateUrl: 'app/delivery-ticket/delivery-ticket-list.tpl.html',
        //  controller: 'DeliveryTicketListController as deliveryTicketListController',
        //},
        'content@app': {
          //templateUrl: 'app/delivery-ticket/empty.tpl.html',
          templateUrl: 'app/delivery-ticket/delivery-ticket-list.tpl.html',
          controller: 'DeliveryTicketListController as deliveryTicketListController'
        }
      }
    })
    .state('app.delivery-ticket.detail', {
      url: '/delivery-ticket/:deliveryTicketId',
      views: {
        'content@app': {
          templateUrl: 'app/delivery-ticket/delivery-ticket-detail.tpl.html',
          controller: 'DeliveryTicketDetailController as ctrl',
          resolve: {
            workorder: function($stateParams, appformClient, workorderManager) {
              return workorderManager.read($stateParams.workorderId)
            },
            workers: function(userClient) {
              return userClient.list();
            },
            result: function(workorder, resultMap) {
              return resultMap[workorder.id];
            }
          }
        }
      }
    })
    .state('app.delivery-ticket.edit', {
      url: '/delivery-ticket/:deliveryTicketId/edit',
      views: {
        'content@app': {
          templateUrl: 'app/delivery-ticket/delivery-ticket-edit.tpl.html',
          controller: 'DeliveryTicketFormController as ctrl',
          resolve: {
            workorder: function($stateParams, workorderManager) {
              return workorderManager.read($stateParams.workorderId);
            },
            workers: function(userClient) {
              return userClient.list();
            },
            result: function(workorder, resultMap) {
              return resultMap[workorder.id];
            }
          }
        }
      }
    });
})

.run(function($state, mediator) {
  mediator.subscribe('wfm:workorder:selected', function(workorder) {
    console.log('wfm:workorder:selected');
    $state.go(
      'app.delivery-ticket.detail',
      { workorderId: workorder.id || workorder._localuid },
      { reload: true }
    );
  });
  mediator.subscribe('wfm:workorder:list', function(workflow) {
    console.log('wfm:workorder:list');
    $state.go('app.delivery-ticket', null, {reload: true});
  });
  mediator.subscribe('wfm:workorder:updated', function(workorder) {
    console.log('update', workorder);
  });

  mediator.subscribe('done:wfm:workorder:updated', function(workorder) {
    console.log('done update', workorder);
  });
})

.controller('DeliveryTicketListController', function ($scope, $mdDialog, mediator, workorderManager, workorders, resultMap) {
  var self = this;
  $scope.query = '';

  self.workorders = workorders;
  self.workorderManager = workorderManager;

  self.resultMap = resultMap;
  //$scope.$parent.selected = {id: null};

  // Ugly but I don't want to add the module to avoid the error => Unknown provider: workorderManagerProvider <- workorderManager <- DeliveryTicketListController
  $scope.workorders = self.workorders;
  for (var i = 0; i < $scope.workorders.length; i++) {
    console.log($scope.workorders[i].title, $scope.workorders[i].status);
  }

  $scope.numOfOrders = $scope.workorders.length;

  console.dir($scope);

  $scope.getStatusIcon = getStatusIcon;

  $scope.refresh = function () {
    //mediator.publish('wfm:workorder:list');
    self.workorderManager.list().then(function (workorders) {
      console.dir(workorders);
      self.workorders = workorders.filter(function(workorder) {
        return workorder.subtype == 'EPOD';
      });
      mediator.publish('wfm:workorder:list');
      for (var i = 0; i < $scope.workorders.length; i++) {
        console.log($scope.workorders[i].title, $scope.workorders[i].status);
      }
    });
  }

  $scope.getCardStyle = function (workorder) {
    var style = {};

    if (workorder.aborted) {
      style["background-color"] = '#FF818C';
    } else if (workorder.addedWater > 0 || workorder.waitingTime > 30) {
      style["background-color"] = '#FFC65C';
    }

    return style;
  }

  $scope.search = function ($event) {
    console.log('query:', $scope.query);
    $scope.workorders = self.workorders.filter (function (workorder) {
      var regexQuery = new RegExp($scope.query, "i");
      var regexWorks = new RegExp($scope.works, "i");
      return workorder.works.match (regexWorks) &&
             (workorder.customerName.match(regexQuery) ||
              workorder.title.match(regexQuery) ||
              workorder.vehicle.match(regexQuery));
    });
  }

  $scope.setChargesInvoicedOn = function (workorder) {
    //debugger;
    workorder.chargesInvoiced = true;
    self.workorderManager.update(workorder);
    //mediator.publish('wfm:workorder:updated', workorder);
  }

  function DialogController($scope, $mdDialog) {
    $scope.hide = function() {
      $mdDialog.hide();
    };

    $scope.cancel = function() {
      $mdDialog.cancel();
    };

    $scope.answer = function(answer) {
      $mdDialog.hide(answer);
    };
  }

  // Shows details about the selected workorder
  $scope.showDetail = function(ev, workorderIndex) {
    console.log('at showDetail for index', workorderIndex);
    $scope.workorderIndex = workorderIndex;
    //$scope.workers[workorderIndex].stepResults
    var workorder = $scope.workorders[workorderIndex];
    var customerSignature = null;
    var results = self.resultMap[workorder.id];
    if (typeof results !== 'undefined' &&
        typeof results.stepResults !== 'undefined' &&
        typeof results.stepResults['epod-generic-summary'] !== 'undefined' &&
        typeof results.stepResults['epod-generic-summary'].submission !== 'undefined' &&
        typeof results.stepResults['epod-generic-summary'].submission.signature !== 'undefined') {
      customerSignature = results.stepResults['epod-generic-summary'].submission.signature;
    }
    $scope.result = {
      completedAction: workorder.completedAction,
      driver: workorder.driver,
      vehicle: workorder.vehicle,
      originName: workorder.originName,
      originPhone: workorder.originPhone,
      customerName: workorder.customerName,
      account: workorder.account,
      po: workorder.po,
      contract: workorder.contract,
      callOff: workorder.callOff,
      product: workorder.product,
      ce: 'N/A', //workorder.ce
      timeLeftPlant: workorder.ticketTime,
      timeOnSite: workorder.timeOnSite,
      timeOffSite: workorder.timeOffSite,
      addedWater: workorder.addedWater,
      returnedMaterial: workorder.returnedMaterial,
      ticketDate: workorder.ticketDate,
      ticketTime: workorder.ticketTime,
      waitingTime: workorder.waitingTime,
      ticketNumber: workorder.ticketNumber,
      addressDetail: workorder.addressDetail,
      addressStreet: workorder.addressStreet,
      addressCity: workorder.addressCity,
      addressPostalCode: workorder.addressPostalCode,
      specialInstructions: workorder.instructions,
      customerSignature: customerSignature,
      aborted: workorder.aborted,
      abortedReason: workorder.abortedReason,
    };
    console.dir($scope.result);
    $mdDialog.show({
      controller: DialogController,
      templateUrl: 'app/delivery-ticket/delivery-ticket-detail-dialog.tpl.html',
      parent: angular.element(document.body),
      targetEvent: ev,
      clickOutsideToClose:true,
      scope: $scope,        // use parent scope in template
      preserveScope: true,  // do not forget this if use parent scope
    })
    .then(function(answer) {
      console.log('answer', answer);
      $scope.status = 'You said the information was "' + answer + '".';
    }, function(err) {
      console.log('err', err);
      $scope.status = 'You cancelled the dialog.';
    });
  };
})

.controller('DeliveryTicketDetailController', function ($scope, $state, $mdDialog, mediator, workorderManager, workflowManager, workflows, workorder, result, workers) {
  var self = this;
  $scope.selected.id = workorder.id;

  self.workorder = workorder;
  var workflow = workflows.filter(function(workflow) {
    return String(workflow.id) === String(workorder.workflowId);
  });
  if (workflow.length) {
    self.workflow = workflow[0];
  }
  self.result = result;
  var assignee = workers.filter(function(worker) {
    return String(worker.id) === String(workorder.assignee);
  })
  if (assignee.length) {
    self.assignee = assignee[0];
  }

  var nextStepIndex = workflowManager.nextStepIndex(self.workflow.steps, self.result);
  var numSteps = self.workflow.steps.length;
  self.progress = (100 * (nextStepIndex + 1) / numSteps).toPrecision(3);
  console.log(nextStepIndex, numSteps, self.progress);

  self.beginWorkflow = function(event, workorder) {
    mediator.publish('wfm:workflow:begin', workorder.id);
    event.preventDefault();
  };

  self.delete = function(event, workorder) {
    event.preventDefault();
    var confirm = $mdDialog.confirm()
          .title('Would you like to delete delivery ticket #' + workorder.id+'?')
          .textContent(workorder.title)
          .ariaLabel('Delete Delivery Ticket')
          .targetEvent(event)
          .ok('Proceed')
          .cancel('Cancel');
    $mdDialog.show(confirm).then(function() {
      return workorderManager.delete(workorder)
      .then(function() {
        $state.go('app.delivery-ticket', null, {reload: true});
      }, function(err) {
        throw err;
      })
    });
  }
})
;

module.exports = 'app.delivery-ticket';
