/* jshint globalstrict: true */
'use strict';

var ESCAPES = {'n': '\n', 'f': '\f', 'r': '\r', 't': '\t', 'v': '\v', '\'': '\'', '"': '"'};

var OPERATORS = {
  'null': _.constant(null),
  'true': _.constant(true),
  'false': _.constant(false)
};

var ensureSafeMemberName = function (name) {
  if(name === 'constructor' || name === '__proto__' ||
    name === '__defineGetter__' || name === '__defineSetter__' ||
    name === '__lookupGetter__' || name === '__lookupSetter__') {
    throw 'Attempting to access a disallowed field in Angular expressions!';
  }
};

var simpleGetterFn1 = function (key) {
  ensureSafeMemberName(key);
  return function (scope, locals) {
    if(!scope) {
      return undefined;
    }
    return (locals && locals.hasOwnProperty(key)) ? locals[key] : scope[key];
  };
};

var simpleGetterFn2 = function (key1, key2) {
  ensureSafeMemberName(key1);
  ensureSafeMemberName(key2);
  return function (scope, locals) {
    if(!scope) {
      return undefined;
    }
    scope = (locals && locals.hasOwnProperty(key1)) ? locals[key1] : scope[key1];
    return scope ? scope[key2] : undefined;
  };
};

var generatedGetterFn = function (keys) {
  var code = '';
  _.forEach(keys, function (key, idx) {
    ensureSafeMemberName(key);
    code += 'if (!scope) { return undefined; }\n';
    if(idx === 0) {
      code += 'scope = (locals && locals.hasOwnProperty("' + key + '")) ? locals["' + key + '"] : scope["' + key + '"];\n';
    } else {
      code += 'scope = scope["' + key + '"];\n';
    }
  });
  code += 'return scope;\n';
  /* jshint -W054 */
  return new Function('scope', 'locals', code);
  /* jshint +W054 */
};

var getterFn = _.memoize(function (ident) {
  var pathKeys = ident.split('.');
  if(pathKeys.length === 1) {
    return simpleGetterFn1(pathKeys[0]);
  } else if(pathKeys.length === 2) {
    return simpleGetterFn2(pathKeys[0], pathKeys[1]);
  } else {
    return generatedGetterFn(pathKeys);
  }
});

function Lexer() {

}

Lexer.prototype.lex = function (text) {
  this.text = text;
  this.index = 0;
  this.ch = undefined;
  this.tokens = [];

  while (this.index < this.text.length) {
    this.ch = this.text.charAt(this.index);
    if(this.isNumber(this.ch) ||
      (this.is('.') && this.isNumber(this.peek()))) {
      this.readNumber();
    } else if(this.is('\'"')) {
      this.readString(this.ch);
    } else if(this.is('[],{}:.()')) {
      this.tokens.push({
        text: this.ch,
        json: true
      });
      this.index++;
    } else if(this.isIdent(this.ch)) {
      this.readIdent();
    } else if(this.isWhitespace(this.ch)) {
      this.index++;
    } else {
      throw 'Unexpected next character: ' + this.ch;
    }
  }

  return this.tokens;
};

Lexer.prototype.is = function (chs) {
  return chs.indexOf(this.ch) >= 0;
};

Lexer.prototype.isNumber = function (ch) {
  return '0' <= ch && ch <= '9';
};

Lexer.prototype.isExpOperator = function (ch) {
  return ch === '-' || ch === '+' || this.isNumber(ch);
};

Lexer.prototype.isIdent = function (ch) {
  return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') ||
    ch === '_' || ch === '$';
};

Lexer.prototype.isWhitespace = function (ch) {
  return (ch === ' ' || ch === '\r' || ch === '\t' ||
  ch === '\n' || ch === '\v' || ch === '\u00A0');
};

Lexer.prototype.readNumber = function () {
  var number = '';

  while (this.index < this.text.length) {
    var ch = this.text.charAt(this.index).toLowerCase();
    if(ch === '.' || this.isNumber(ch)) {
      number += ch;
    } else {
      var nextCh = this.peek();
      var prevCh = number.charAt(number.length - 1);
      if(ch === 'e' && this.isExpOperator(nextCh)) {
        number += ch;
      } else if(this.isExpOperator(ch) && prevCh === 'e' &&
        nextCh && this.isNumber(nextCh)) {
        number += ch;
      } else if(this.isExpOperator(ch) && prevCh === 'e' &&
        (!nextCh || !this.isNumber(nextCh))) {
        throw "Invalid exponent";
      } else {
        break;
      }
    }
    this.index++;
  }

  number = 1 * number;
  this.tokens.push({
    text: number,
    fn: _.constant(number),
    json: true
  });
};

Lexer.prototype.readString = function (quote) {
  this.index++;
  var rawString = quote;
  var string = '';
  var escape = false;
  while (this.index < this.text.length) {
    var ch = this.text.charAt(this.index);
    rawString += ch;
    if(escape) {
      if(ch === 'u') {
        var hex = this.text.substring(this.index + 1, this.index + 5);
        if(!hex.match(/[\da-f]{4}/i)) {
          throw 'Invalid unicode escape';
        }
        rawString += hex;
        this.index += 4;
        string += String.fromCharCode(parseInt(hex, 16));
      } else {
        var replacement = ESCAPES[ch];
        if(replacement) {
          string += replacement;
        } else {
          string += ch;
        }
      }
      escape = false;
    } else if(ch === quote) {
      this.index++;
      this.tokens.push({
        text: rawString,
        string: string,
        json: true,
        fn: _.constant(string)
      });
      return;
    } else if(ch === '\\') {
      escape = true;
    } else {
      string += ch;
    }
    this.index++;
  }
  throw 'Unmatched quote';
};


Lexer.prototype.readIdent = function () {
  var text = '';
  var start = this.index;
  var lastDotAt;
  while (this.index < this.text.length) {
    var ch = this.text.charAt(this.index);
    if(ch === '.' || this.isIdent(ch) || this.isNumber(ch)) {
      if(ch === '.') {
        lastDotAt = this.index;
      }
      text += ch;
    } else {
      break;
    }
    this.index++;
  }

  var methodName;
  if(lastDotAt) {
    var peekIndex = this.index;
    while (this.isWhitespace(this.text.charAt(peekIndex))) {
      peekIndex++;
    }
    if(this.text.charAt(peekIndex) === '(') {
      methodName = text.substring(lastDotAt - start + 1);
      text = text.substring(0, lastDotAt - start);
    }
  }

  var token = {text: text};
  if(OPERATORS.hasOwnProperty(text)) {
    token.fn = OPERATORS[text];
  } else {
    token.fn = getterFn(text);
  }

  this.tokens.push(token);

  if(methodName) {
    this.tokens.push({
      text: '.',
      json: false
    });
    this.tokens.push({
      text: methodName,
      fn: getterFn(methodName),
      json: false
    });
  }
};


Lexer.prototype.peek = function () {
  return this.index < this.text.length - 1 ?
    this.text.charAt(this.index + 1) :
    false;
};

Lexer.prototype.is = function (chs) {
  return chs.indexOf(this.ch) >= 0;
};


function Parser(lexer) {
  this.lexer = lexer;
}

Parser.prototype.parse = function (text) {
  this.tokens = this.lexer.lex(text);
  return this.primary();
};

Parser.prototype.primary = function () {
  var primary;
  if(this.expect('[')) {
    primary = this.arrayDeclaration();
  } else if(this.expect('{')) {
    primary = this.object();
  } else {
    var token = this.expect();
    primary = token.fn;
    if(token.json) {
      primary.constant = true;
      primary.literal = true;
    }
  }

  var next;
  var context;
  while ((next = this.expect('[', '.', '('))) {
    if(next.text === '[') {
      context = primary;
      primary = this.objectIndex(primary);
    } else if(next.text === '.') {
      context = primary;
      primary = this.fieldAccess(primary);
    } else if(next.text === '(') {
      primary = this.functionCall(primary, context);
      context = undefined;
    }
  }
  return primary;
};

Parser.prototype.arrayDeclaration = function () {
  var elementFns = [];
  if(!this.peek(']')) {
    do {
      if(this.peek(']')) {
        break;
      }
      elementFns.push(this.primary());
    } while (this.expect(','));
  }
  this.consume(']');
  var arrayFn = function () {
    var elements = _.map(elementFns, function (elementFn) {
      return elementFn();
    });
    return elements;
  };
  arrayFn.literal = true;
  arrayFn.constant = true;
  return arrayFn;
};

Parser.prototype.object = function () {
  var keyValues = [];
  if(!this.peek('}')) {
    do {
      var keyToken = this.expect();
      this.consume(':');
      var valueExpression = this.primary();
      keyValues.push({key: keyToken.string || keyToken.text, value: valueExpression});
    } while (this.expect(','));
  }
  this.consume('}');
  var objectFn = function () {
    var object = {};
    _.forEach(keyValues, function (kv) {
      object[kv.key] = kv.value();
    });
    return object;
  };
  objectFn.literal = true;
  objectFn.constant = true;
  return objectFn;
};


Parser.prototype.objectIndex = function (objFn) {
  var indexFn = this.primary();
  this.consume(']');
  return function (scope, locals) {
    var obj = objFn(scope, locals);
    var index = indexFn(scope, locals);
    return obj[index];
  };
};

Parser.prototype.fieldAccess = function (objFn) {
  var getter = this.expect().fn;
  return function (scope, locals) {
    var obj = objFn(scope, locals);
    return getter(obj);
  };
};


Parser.prototype.functionCall = function (fnFn, contextFn) {
  var argFns = [];
  if(!this.peek(')')) {
    do {
      argFns.push(this.primary());
    } while (this.expect(','));
  }
  this.consume(')');
  return function (scope, locals) {
    var context = contextFn ? contextFn(scope, locals) : scope;
    var fn = fnFn(scope, locals);
    var args = _.map(argFns, function (argFn) {
      return argFn(scope, locals);
    });
    return fn.apply(context, args);
  };
};

Parser.prototype.peek = function (e1, e2, e3, e4) {
  if(this.tokens.length > 0) {
    var text = this.tokens[0].text;
    if(text === e1 || text === e2 || text === e3 || text === e4 ||
      (!e1 && !e2 && !e3 && !e4)) {
      return this.tokens[0];
    }
  }
};

Parser.prototype.expect = function (e1, e2, e3, e4) {
  var token = this.peek(e1, e2, e3, e4);
  if(token) {
    return this.tokens.shift();
  }
};

Parser.prototype.consume = function (e) {
  if(!this.expect(e)) {
    throw 'Unexpected. Expecting ' + e;
  }
};


function parse(expr) {
  switch (typeof expr) {
    case 'string':
      var lexer = new Lexer();
      var parser = new Parser(lexer);
      return parser.parse(expr);
    case 'function':
      return expr;
    default:
      return _.noop;
  }
}
