var path = require('path');
var jade = require('jade');
var less = require('less');
var fs = require('fs');
var EventEmitter = require('events').EventEmitter;
var util = require('util');

var write = fs.writeFile;
/*var write = function(dst, data, callback) {
  console.log('WRITE', dst, data.length, 'chars');
  callback();
};*/

var files = [];

// src is a file struct, dst is a string
var Converter = function(src, dst) {
  EventEmitter.call(this);
  this.src = src;
  this.dst = dst;
};

util.inherits(Converter, EventEmitter);

// A basic converter takes one type of extension and does something
// to transform it into one target with a different extension.
Converter.basic = function(fromExt, toExt, displayName) {
  var ctor = function(src, dst) {
    Converter.call(this, src, dst);
  };
  util.inherits(ctor, Converter);
  ctor.convert = Converter.convertForExtensions(fromExt, toExt);
  ctor.prototype.displayName = displayName || fromExt.replace(/^\./, '');
  return ctor;
};

Converter.convertForExtensions = function(from, to) {
  return function(src) {
    if (src.path.substr(src.path.length - from.length) === from) {
      var dst = src.path.substr(0, src.path.length - from.length) + to;
      return new this(src, dst);
    }
  };
};

Converter.prototype.toString = function() {
  return [this.displayName, ':', this.src.path, '->', this.dst].join('');
};

Converter.prototype.emit = function(event, error) {
  console.log(this.toString(), '->', event);
  /*for (var i = 0; i != arguments.length; ++i) {
    console.log('  *', arguments[i].toString().substr(0, 80));
  }*/
  if (event == 'error') {
    console.error(this.toString(), error);
  }
  EventEmitter.prototype.emit.apply(this, Array.prototype.slice.call(arguments));
};

var Jade = Converter.basic('.jade', '.html');

Jade.prototype.run = function(build) {
  var task = this; 
  task.emit('begin');
  var compiled = jade.renderFile(this.src.path, {
    pretty: true,
    require: require,
    build: build,
    __filename: this.src.path,
    __dirname: this.src.dir,
  });
  task.emit('data', compiled);
  write(this.dst, compiled, function(err) {
    if (err) {
      task.emit('error', err);
      return;
    }
    task.emit('end', compiled);
  });
  return task;
};

var Less = Converter.basic('.less', '.css');

Less.prototype.run = function() {
  var task = this;
  task.emit('begin');
  fs.readFile(this.src.path, function(err, source) {
    less.render(source.toString(), {
      filename: task.src.path,
      compress: false,
    }, function(err, compiled) {
      if (err) {
        task.emit('error', err);
        return;
      }
      var css = compiled.css;          
      task.emit('data', css);
      write(task.dst, compiled.css, function(err) {
        if (err) {
          task.emit('error', err);
          return;
        }
        task.emit('end', css);
      });
    });
  });
  return task;
};

Converters = {};
Converters.all = [Jade, Less];
Converters.forFile = function(file) {
  var tasks = [];
  for (var i = 0; i != Converters.all.length; ++i) {
    var task = Converters.all[i].convert(file);
    if (task) {
      tasks.push(task);
    }
  }
  return tasks;
};

module.exports = Converters;