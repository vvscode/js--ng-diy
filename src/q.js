/* jshint globalstrict: true */
'use strict';

function $QProvider() {
  this.$get = ['$rootScope', function ($rootScope) {
    function processQueue(state) {
      var pending = state.pending;
      delete state.pending;
      _.forEach(pending, function(onFullfilled) {
        onFullfilled(state.value);
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

    Promise.prototype.then = function (onFullfilled) {
      this.$$state.pending = this.$$state.pending || [];
      this.$$state.pending.push(onFullfilled);
      if(this.$$state.status > 0) {
        scheduleProcessQueue(this.$$state);
      }
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

    function defer() {
      return new Defered();
    }

    return {
      defer: defer
    };

  }];
}