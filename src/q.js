/* jshint globalstrict: true */
'use strict';

function $QProvider() {
  this.$get = ['$rootScope', function ($rootScope) {
    function processQueue(state) {
      var pending = state.pending;
      delete state.pending;
      _.forEach(pending, function(handlers) {
        var deferred = handlers[0];
        var fn = handlers[state.status];
        try {
          if(_.isFunction(fn)) {
            deferred.resolve(fn(state.value));
          } else if (state.status === 1) {
            deferred.resolve(state.value);
          } else {
            deferred.reject(state.value);
          }
        } catch(e) {
          deferred.reject(e);
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
      var result = new Defered();
      this.$$state.pending = this.$$state.pending || [];
      this.$$state.pending.push([result, onFullfilled, onRejected]);
      if(this.$$state.status > 0) {
        scheduleProcessQueue(this.$$state);
      }
      return result.promise;
    };

    Promise.prototype.catch = function(onReject) {
      return this.then(null, onReject);
    };

    Promise.prototype.finally = function(callback) {
      return this.then(function() {
        callback();
      }, function() {
        callback();
      });
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