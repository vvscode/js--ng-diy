/* jshint globalstrict: true */
/* global publishExternalAPI: false, createInjector: false */
'use strict';

describe('$q', function () {
  var $q, $rootScope;

  beforeEach(function () {
    publishExternalAPI();
    var injector = createInjector(['ng']);
    $q = createInjector(['ng']).get('$q');
    $rootScope = injector.get('$rootScope');
  });

  it('can create a Deferred', function () {
    var d = $q.defer();
    expect(d).toBeDefined();
  });

  it('has a promise for each Deferred', function () {
    var d = $q.defer();
    expect(d.promise).toBeDefined();
  });

  it('can resolve a promise', function (done) {
    var deferred = $q.defer();
    var promise = deferred.promise;
    var promiseSpy = jasmine.createSpy();
    promise.then(promiseSpy);

    deferred.resolve('a-ok');
    setTimeout(function () {
      expect(promiseSpy).toHaveBeenCalledWith('a-ok');
      done();
    }, 50);
  });

  it('works when resolved before promise listener', function (done) {
    var d = $q.defer();
    d.resolve(42);

    var promiseSpy = jasmine.createSpy();
    d.promise.then(promiseSpy);
    setTimeout(function () {
      expect(promiseSpy).toHaveBeenCalledWith(42);
      done();
    }, 50);
  });

  it('does not resolve promise immediately', function () {
    var d = $q.defer();
    var promiseSpy = jasmine.createSpy();
    d.promise.then(promiseSpy);
    d.resolve(42);
    expect(promiseSpy).not.toHaveBeenCalled();
  });

  it('resolves promise at next digest', function () {
    var d = $q.defer();
    var promiseSpy = jasmine.createSpy();
    d.promise.then(promiseSpy);
    d.resolve(42);
    $rootScope.$apply();
    setTimeout(function () {
      expect(promiseSpy).toHaveBeenCalledWith(42);
    }, 50);
  });

  it('may only by resolved once', function () {
    var d = $q.defer();
    var promiseSpy = jasmine.createSpy();
    d.promise.then(promiseSpy);
    d.resolve(42);
    d.resolve(43);
    $rootScope.$apply();
    setTimeout(function () {
      expect(promiseSpy.calls.count()).toEqual(1);
      expect(promiseSpy).toHaveBeenCalledWith(42);
    });
  });

  it('may only ever be resolved once', function () {
    var d = $q.defer();
    var promiseSpy = jasmine.createSpy();
    d.promise.then(promiseSpy);
    d.resolve(42);
    $rootScope.$apply();
    setTimeout(function () {
      expect(promiseSpy).toHaveBeenCalledWith(42);
      d.resolve(43);
      $rootScope.$apply();
      setTimeout(function () {
        expect(promiseSpy.calls.count()).toEqual(1);
      }, 50);
    }, 50);
  });

  it('resolves a listener added after resolution', function () {
    var d = $q.defer();
    d.resolve(42);
    $rootScope.$apply();
    var promiseSpy = jasmine.createSpy();
    d.promise.then(promiseSpy);
    $rootScope.$apply();
    setTimeout(function () {
      expect(promiseSpy).toHaveBeenCalledWith(42);
    }, 50);
  });

  it('may have multiple callbacks', function () {
    var d = $q.defer();
    var firstSpy = jasmine.createSpy();
    var secondSpy = jasmine.createSpy();
    d.promise.then(firstSpy);
    d.promise.then(secondSpy);
    d.resolve(42);
    $rootScope.$apply();
    setTimeout(function () {
      expect(firstSpy).toHaveBeenCalledWith(42);
      expect(secondSpy).toHaveBeenCalledWith(42);
    }, 50);
  });

  it('invoke callbacks once', function () {
    var d = $q.defer();
    var firstSpy = jasmine.createSpy();
    var secondSpy = jasmine.createSpy();
    d.promise.then(firstSpy);
    d.resolve(42);
    $rootScope.$apply();
    setTimeout(function () {
      expect(firstSpy.calls.count()).toBe(1);
      expect(secondSpy.calls.count()).toBe(0);

      d.promise.then(secondSpy);
      expect(firstSpy.calls.count()).toBe(1);
      expect(secondSpy.calls.count()).toBe(0);

      $rootScope.$apply();
      setTimeout(function () {
        expect(firstSpy.calls.count()).toBe(1);
        expect(secondSpy.calls.count()).toBe(1);
      }, 50);

    }, 50);
  });

  it('can reject a deferred', function () {
    var d = $q.defer();
    var fullFillSpy = jasmine.createSpy();
    var rejectSpy = jasmine.createSpy();
    d.promise.then(fullFillSpy, rejectSpy);
    d.reject('fail');
    $rootScope.$apply();

    setTimeout(function () {
      expect(fullFillSpy).not.toHaveBeenCalled();
      expect(rejectSpy).toHaveBeenCalledWith('fail');
    }, 50);
  });

  it('can reject just once', function () {
    var d = $q.defer();
    var rejectSpy = jasmine.createSpy();
    d.promise.then(null, rejectSpy);
    d.reject('fail');
    $rootScope.$apply();
    setTimeout(function () {
      expect(rejectSpy.calls.count()).toBe(1);
    }, 50);
    d.reject('fail again');
    $rootScope.$apply();
    setTimeout(function () {
      expect(rejectSpy.calls.count()).toBe(1);
    }, 50);
  });

  it('cannot fullfill a promise once rejected', function () {
    var d = $q.defer();
    var rejectSpy = jasmine.createSpy();
    var fullfillSpy = jasmine.createSpy();
    d.promise.then(fullfillSpy, rejectSpy);

    d.reject('fail');
    $rootScope.$apply();
    d.resolve('success');
    $rootScope.$apply();

    setTimeout(function () {
      expect(fullfillSpy).not.toHaveBeenCalled();
    }, 50);
  });

  it('does not require a failure handler each time', function () {
    var d = $q.defer();
    var fullfilledSpy = jasmine.createSpy();
    var rejectedSpy = jasmine.createSpy();
    d.promise.then(fullfilledSpy);
    d.promise.then(null, rejectedSpy);
    d.reject('fail');
    $rootScope.$apply();
    setTimeout(function () {
      expect(rejectedSpy).toHaveBeenCalledWith('fail');
    }, 50);
  });

  it('does not require a failure handler each time', function () {
    var d = $q.defer();
    var fullfilledSpy = jasmine.createSpy();
    var rejectedSpy = jasmine.createSpy();
    d.promise.then(fullfilledSpy);
    d.promise.then(null, rejectedSpy);
    d.resolve('ok');
    $rootScope.$apply();
    setTimeout(function () {
      expect(fullfilledSpy).toHaveBeenCalledWith('ok');
    }, 50);
  });

  it('can register rejection handler with catch', function () {
    var d = $q.defer();
    var rejectSpy = jasmine.createSpy();
    d.promise.catch(rejectSpy);
    d.reject('fail');
    $rootScope.$apply();
    setTimeout(function () {
      expect(rejectSpy).toHaveBeenCalled();
    }, 50);
  });

  it('invokes a finally handler when fullfilled', function () {
    var d = $q.defer();
    var finallySpy = jasmine.createSpy();
    d.promise.finally(finallySpy);
    d.resolve(42);
    $rootScope.$apply();
    setTimeout(function () {
      expect(finallySpy).toHaveBeenCalledWith();
    }, 50);
  });

  it('invokes a finally handler when rejected', function () {
    var d = $q.defer();
    var finallySpy = jasmine.createSpy();
    d.promise.finally(finallySpy);
    d.reject('fail');
    $rootScope.$apply();
    setTimeout(function () {
      expect(finallySpy).toHaveBeenCalledWith();
    }, 50);
  });

  it('allows chaining handlers', function () {
    var d = $q.defer();
    var fullfilledSpy = jasmine.createSpy();
    d.promise.then(function (result) {
      return result + 1;
    }).then(function (result) {
      return result * 2
    }).then(fullfilledSpy);

    d.resolve(20);
    $rootScope.$apply();
    setTimeout(function () {
      expect(fullfilledSpy).toHaveBeenCalledWith(42);
    }, 50);
  });

  it('does not modify original resolution in chains', function () {
    var d = $q.defer();
    var fullfilledSpy = jasmine.createSpy();

    d.promise.then(function (result) {
      return result + 1;
    }).then(function (result) {
      return result * 2;
    });
    d.promise.then(fullfilledSpy);
    d.resolve(20);
    $rootScope.$apply();
    setTimeout(function () {
      expect(fullfilledSpy).toHaveBeenCalledWith(20);
    });
  }, 50);

  it('catches rejection on chained handler', function () {
    var d = $q.defer();
    var rejectedSpy = jasmine.createSpy();
    d.promise.then(_.noop).catch(rejectedSpy);
    d.reject('fail');
    $rootScope.$apply();
    setTimeout(function () {
      expect(rejectedSpy).toHaveBeenCalledWith('fail');
    }, 50);
  });

  it('fullfills on chained handler', function () {
    var d = $q.defer();
    var fullfilledSpy = jasmine.createSpy();
    d.promise.catch(_.noop).then(fullfilledSpy);
    d.resolve(42);
    $rootScope.$apply();
    setTimeout(function () {
      expect(fullfilledSpy).toHaveBeenCalledWith(42);
    }, 50);
  });

  it('treats catch return value as resolution', function () {
    var d = $q.defer();
    var fullfilledSpy = jasmine.createSpy();
    d
      .promise
      .catch(function () {
        return 42;
      })
      .then(fullfilledSpy);

    d.reject('fail');
    $rootScope.$apply();

    setTimeout(function () {
      expect(fullfilledSpy).toHaveBeenCalledWith(42);
    }, 50);
  });

  it('rejects chained promise when handler throws', function () {
    var d = $q.defer();
    var rejectedSpy = jasmine.createSpy();
    d
      .promise
      .then(function () {
        throw 'fail';
      })
      .catch(rejectedSpy);
    d.resolve(42);
    $rootScope.$apply();
    setTimeout(function () {
      expect(rejectedSpy).toHaveBeenCalledWith('fail');
    }, 50);
  });

  it('does not reject current promise when handler throws', function () {
    var d = $q.defer();
    var rejectedSpy = jasmine.createSpy();
    d.promise.then(function () {
      throw 'fail'
    });
    d.promise.catch(rejectedSpy);
    d.resolve(42);
    $rootScope.$apply();
    setTimeout(function () {
      expect(rejectedSpy).not.toHaveBeenCalled();
    }, 50);
  });

  it('waits on promise returned from handler', function () {
    var d = $q.defer();
    var fullfilledSpy = jasmine.createSpy();
    d.promise.then(function (v) {
      var d2 = $q.defer();
      d2.resolve(v + 1);
      return d2.promise;
    }).then(function (v) {
      return v * 2;
    }).then(fullfilledSpy);

    d.resolve(20);
    $rootScope.$apply();
    setTimeout(function () {
      $rootScope.$apply();
      setTimeout(function () {
        expect(fullfilledSpy).toHaveBeenCalledWith(42);
      }, 50);
    }, 50);
  });

  it('waits on promise given to resolve', function () {
    var d = $q.defer();
    var d2 = $q.defer();
    var fullfilledSpy = jasmine.createSpy();

    d.promise.then(fullfilledSpy);
    d2.resolve(42);
    d.resolve(d2.promise);
    $rootScope.$apply();

    setTimeout(function () {
      expect(fullfilledSpy).toHaveBeenCalledWith(42);
    }, 50);
  });

  it('rejects when promise returned from handler rejects', function () {
    var d = $q.defer();
    var rejectedSpy = jasmine.createSpy();
    d.promise.then(function () {
      var d2 = $q.defer();
      d2.reject('fail');
      return d2.promise;
    }).catch(rejectedSpy);

    d.resolve('ok');
    $rootScope.$apply();
    setTimeout(function () {
      expect(rejectedSpy).toHaveBeenCalledWith('fail');
    }, 50);
  });
});