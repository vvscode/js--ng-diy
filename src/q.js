/* jshint globalstrict: true */
'use strict';

function $QProvider() {
  this.$get = function() {
    function Defered() {

    }

    function defer() {
      return new Defered();
    }

    return {
      defer: defer
    };

  };
}