/* jshint globalstrict: true */
/* global parse: false */
'use strict';

describe("parse", function () {

  it("can parse an integer", function () {
    var fn = parse('42');
    expect(fn).toBeDefined();
    expect(fn()).toBe(42);
  });

  it("makes integers both constant and literal", function () {
    var fn = parse('42');
    expect(fn.constant).toBe(true);
    expect(fn.literal).toBe(true);
  });

  it("can parse a floating point number", function () {
    var fn = parse('4.2');
    expect(fn()).toBe(4.2);
  });

  it("can parse a floating point number without an integer part", function () {
    var fn = parse('.42');
    expect(fn()).toBe(0.42);
  });

  it("can parse a number in scientific notation", function () {
    var fn = parse('42e3');
    expect(fn()).toBe(42000);
  });

  it("can parse scientific notation with a float coefficient", function () {
    var fn = parse('.42e2');
    expect(fn()).toBe(42);
  });

  it("can parse scientific notation with negative exponents", function () {
    var fn = parse('4200e-2');
    expect(fn()).toBe(42);
  });

  it("can parse scientific notation with the + sign", function () {
    var fn = parse('.42E+2');
    expect(fn()).toBe(42);
  });

  it("can parse upcase scientific notation", function () {
    var fn = parse('.42E2');
    expect(fn()).toBe(42);
  });

  it("will not parse invalid scientific notation", function () {
    expect(function () {
      parse('42e-');
    }).toThrow();
    expect(function () {
      parse('42e-a');
    }).toThrow();
  });

  it("can parse a string in single quotes", function () {
    var fn = parse("'abc'");
    expect(fn()).toEqual('abc');
  });

  it("can parse a string in double quotes", function () {
    var fn = parse('"abc"');
    expect(fn()).toEqual('abc');
  });

  it("will not parse a string with mismatching quotes", function () {
    expect(function () {
      parse('"abc\'');
    }).toThrow();
  });

  it("marks strings as literal and constant", function () {
    var fn = parse('"abc"');
    expect(fn.literal).toBe(true);
    expect(fn.constant).toBe(true);
  });

  it("will parse a string with character escapes", function () {
    var fn = parse('"\\n\\r\\\\"');
    expect(fn()).toEqual('\n\r\\');
  });

  it("will parse a string with unicode escapes", function () {
    var fn = parse('"\\u00A0"');
    expect(fn()).toEqual('\u00A0');
  });

  it("will not parse a string with invalid unicode escapes", function () {
    expect(function () {
      parse('"\\u00T0"');
    }).toThrow();
  });

  it("will parse null", function () {
    var fn = parse('null');
    expect(fn()).toBe(null);
  });

  it("will parse true", function () {
    var fn = parse('true');
    expect(fn()).toBe(true);
  });

  it("will parse false", function () {
    var fn = parse('false');
    expect(fn()).toBe(false);
  });

  it('ignores whitespace', function () {
    var fn = parse(' \n42 ');
    expect(fn()).toEqual(42);
  });

  it("will parse an empty array", function () {
    var fn = parse('[]');
    expect(fn()).toEqual([]);
  });

  it("will parse a non-empty array", function () {
    var fn = parse('[1, "two", [3]]');
    expect(fn()).toEqual([1, 'two', [3]]);
  });

  it("will parse an array with trailing commas", function () {
    var fn = parse('[1, 2, 3, ]');
    expect(fn()).toEqual([1, 2, 3]);
  });

  it("makes array literals literals and constants", function () {
    var fn = parse('[1, 2, 3]');
    expect(fn.literal).toBe(true);
    expect(fn.constant).toBe(true);
  });

  it("will parse an empty object", function () {
    var fn = parse('{}');
    expect(fn()).toEqual({});
  });

  it("will parse a non-empty object", function () {
    var fn = parse('{a: 1, b: [2, 3], c: {d: 4}}');
    expect(fn()).toEqual({a: 1, b: [2, 3], c: {d: 4}});
  });

  it("will parse an object with string keys", function () {
    var fn = parse('{"a key": 1, \'another-key\': 2}');
    expect(fn()).toEqual({'a key': 1, 'another-key': 2});
  });

  it('returns the function itself when given one', function () {
    var fn = function () {
    };
    expect(parse(fn)).toBe(fn);
  });

  it('still returns a function when given no argument', function () {
    expect(parse()).toEqual(jasmine.any(Function));
  });

  it('looks up an attribute from the scope', function () {
    var fn = parse('aKey');
    expect(fn({aKey: 42})).toBe(42);
    expect(fn({})).toBeUndefined();
    expect(fn()).toBeUndefined();
  });

  it('looks up a 2-part identifier path from the scope', function () {
    var fn = parse('aKey.anotherKey');
    expect(fn({aKey: {anotherKey: 42}})).toBe(42);
    expect(fn({aKey: {}})).toBeUndefined();
    expect(fn({})).toBeUndefined();
  });

  it('looks up a 4-part identifier path from the scope', function () {
    var fn = parse('aKey.secondKey.thirdKey.fourthKey');
    expect(fn({aKey: {secondKey: {thirdKey: {fourthKey: 42}}}})).toBe(42);
    expect(fn({aKey: {secondKey: {thirdKey: {}}}})).toBeUndefined();
    expect(fn({aKey: {}})).toBeUndefined();
    expect(fn()).toBeUndefined();
  });

  it('uses locals instead of scope when there is a matching key', function () {
    var fn = parse('aKey');
    expect(fn({aKey: 42}, {aKey: 43})).toBe(43);
  });

  it('does not use locals instead of scope when there is no matching key', function () {
    var fn = parse('aKey');
    expect(fn({aKey: 42}, {otherKey: 43})).toBe(42);
  });

  it('uses locals instead of scope when there is a matching local 2-part key', function () {
    var fn = parse('aKey.anotherKey');
    expect(fn({aKey: {anotherKey: 42}}, {aKey: {anotherKey: 43}})).toBe(43);
  });

  it('does not use locals instead of scope when there is no matching 2-part key', function () {
    var fn = parse('aKey.anotherKey');
    expect(fn({aKey: {anotherKey: 42}}, {otherKey: {anotherKey: 43}})).toBe(42);
  });

  it('uses locals instead of scope when there is the first local part of a 2-part key', function () {
    var fn = parse('aKey.anotherKey');
    expect(fn({aKey: {anotherKey: 42}}, {aKey: {}})).toBeUndefined();
  });

  it('uses locals instead of scope when there is a matching local 4-part key', function () {
    var fn = parse('aKey.key2.key3.key4');
    expect(fn({aKey: {key2: {key3: {key4: 42}}}}, {aKey: {key2: {key3: {key4: 43}}}})).toBe(43);
  });

  it('uses locals instead of scope when there is the first part in the local key', function () {
    var fn = parse('aKey.key2.key3.key4');
    expect(fn({aKey: {key2: {key3: {key4: 42}}}}, {aKey: {}})).toBeUndefined();
  });

  it('does not use locals instead of scope when there is no matching 4-part key', function () {
    var fn = parse('aKey.key2.key3.key4');
    expect(fn({aKey: {key2: {key3: {key4: 42}}}}, {otherKey: {anotherKey: 43}})).toBe(42);
  });

  it('parses a simple string property access', function () {
    var fn = parse('aKey["anotherKey"]');
    expect(fn({aKey: {anotherKey: 42}})).toBe(42);
  });

  it('parsers a numeric array access', function () {
    var fn = parse('anArray[1]');
    expect(fn({anArray: [1, 2, 3]})).toBe(2);
  });

  it('parsers a property access with another key as property', function () {
    var fn = parse('lock[key]');
    expect(fn({key: 'theKey', lock: {theKey: 42}})).toBe(42);
  });

  it('parses a property access with another property access as property', function () {
    var fn = parse('lock[keys["aKey"]]');
    expect(fn({keys: {aKey: 'theKey'}, lock: {theKey: 42}})).toBe(42);
  });

  it('parses several field accesses back to back', function () {
    var fn = parse('aKey["anotherKey"]["aThirdKey"]');
    expect(fn({aKey: {anotherKey: {aThirdKey: 42}}})).toBe(42);
  });

  it('parses a field access after a property access', function () {
    var fn = parse('aKey["anotherKey"].aThirdKey');
    expect(fn({aKey: {anotherKey: {aThirdKey: 42}}})).toBe(42);
  });

  it('parses a chain of property and field accesses', function () {
    var fn = parse('aKey["anotherKey"].aThirdKey["aFourthKey"]');
    expect(fn({aKey: {anotherKey: {aThirdKey: {aFourthKey: 42}}}})).toBe(42);
  });

  it('parses a function call', function () {
    var fn = parse('aFunction()');
    expect(fn({
      aFunction: function () {
        return 42;
      }
    })).toBe(42);
  });

  it('parses a function call with a single number argument', function () {
    var fn = parse('aFunction(42)');
    expect(fn({
      aFunction: function (n) {
        return n;
      }
    })).toBe(42);
  });

  it('parses a function call with a single identifier argument', function () {
    var fn = parse('aFunction(n)');
    expect(fn({
      n: 42, aFunction: function (arg) {
        return arg;
      }
    })).toBe(42);
  });

  it('parses a function call with a single function call argument', function () {
    var fn = parse('aFunction(argFn())');
    expect(fn({
      argFn: _.constant(42), aFunction: function (arg) {
        return arg;
      }
    })).toBe(42);
  });

  it('parses a function call with a multiple arguments', function () {
    var fn = parse('aFunction(37, n, argFn())');
    expect(fn({
      n: 3,
      argFn: _.constant(2),
      aFunction: function (a1, a2, a3) {
        return a1 + a2 + a3;
      }
    })).toBe(42);
  });

  it('does not allow calling the function constructor', function () {
    expect(function () {
      var fn = parse('aFunction.constructor("return window;")()');
      fn({
        aFunction: function () {
        }
      });
    }).toThrow();
  });

  it('does not allow accessing __proto__', function () {
    expect(function () {
      var fn = parse('obj.__proto__');
      fn({obj: {}});
    }).toThrow();
  });

  it('does not allow calling __defineGetter__', function () {
    expect(function () {
      var fn = parse('obj.__defineGetter__("evil", fn)');
      fn({
        obj: {}, fn: function () {
        }
      });
    }).toThrow();
  });

  it('does not allow calling __defineSetter__', function () {
    expect(function () {
      var fn = parse('obj.__defineSetter__("evil", fn)');
      fn({
        obj: {}, fn: function () {
        }
      });
    }).toThrow();
  });

  it('does not allow calling __lookupGetter__', function () {
    expect(function () {
      var fn = parse('obj.__lookupGetter__("evil")');
      fn({obj: {}});
    }).toThrow();
  });

  it('does not allow calling __lookupSetter__', function () {
    expect(function () {
      var fn = parse('obj.__lookupSetter__("evil")');
      fn({obj: {}});
    }).toThrow();
  });

  it('calls functions accessed as properties with the correct this context', function () {
    var scope = {
      anObject: {
        aMember: 42,
        aFunction: function () {
          return this.aMember;
        }
      }
    };
    var fn = parse('anObject["aFunction"]()');
    expect(fn(scope)).toBe(42);
  });

  it('calls functions accessed as fields with the correct this context', function () {
    var scope = {
      anObject: {
        aMember: 42,
        aFunction: function () {
          return this.aMember;
        }
      }
    };
    var fn = parse('anObject.aFunction()');
    expect(fn(scope)).toBe(42);
  });

  it('calls functions accessed as fields with whitespace before function call', function () {
    var scope = {
      anObject: {
        aMember: 42,
        aFunction: function () {
          return this.aMember;
        }
      }
    };
    var fn = parse('anObject.aFunction  ()');
    expect(fn(scope)).toBe(42);
  });

  it('clears the this context on function calls', function () {
    var scope = {
      anObject: {
        aMember: 42,
        aFunction: function () {
          return function () {
            return this.aMember;
          };
        }
      }
    };
    var fn = parse('anObject.aFunction()()');
    expect(fn(scope)).toBeUndefined();
  });


});
