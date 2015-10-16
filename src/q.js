/* jshint globalstrict: true */
'use strict';

function $QProvider() {
  this.$get = ['$rootScope', function ($rootScope) {
    function processQueue(state) {
      state.pending(state.value);
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
      this.$$state.pending = onFullfilled;
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