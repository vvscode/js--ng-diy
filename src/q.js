/* jshint globalstrict: true */
'use strict';

function $QProvider() {
  this.$get = ['$rootScope', function ($rootScope) {
    function processQueue(state) {
      var pending = state.pending;
      delete state.pending;
      _.forEach(pending, function(handlers) {
        var fn = handlers[state.status];
        if(_.isFunction(fn)) {
          fn(state.value);
        }
      });
    }

    function scheduleProcessQueue(state) {
      $rootScope.$evalAsync(function () {
        processQueue(state);
      });
    }

    function Promise() {
      this.$$state = {};
    }

    Promise.prototype.then = function (onFullfilled, onRejected) {
      this.$$state.pending = this.$$state.pending || [];
      this.$$state.pending.push([null, onFullfilled, onRejected]);
      if(this.$$state.status > 0) {
        scheduleProcessQueue(this.$$state);
      }
    };

    Promise.prototype.catch = function(onReject) {
      return this.then(null, onReject);
    };

    function Defered() {
      this.promise = new Promise();
    }

    Defered.prototype.resolve = function (v) {
      if(this.promise.$$state.status) {
        return;
      }
      this.promise.$$state.value = v;
      this.promise.$$state.status = 1;
      scheduleProcessQueue(this.promise.$$state);
    };

    Defered.prototype.reject = function(reason) {
      if(this.promise.$$state.status) {
        return;
      }

      this.promise.$$state.value = reason;
      this.promise.$$state.status = 2;
      scheduleProcessQueue(this.promise.$$state);
    };

    function defer() {
      return new Defered();
    }

    return {
      defer: defer
    };

  }];
}