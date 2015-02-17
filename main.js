#!/usr/bin/env node

var walker = require('walk');
var path = require('path');
var Converters = require('./converters');

process.chdir(path.dirname(__dirname)); // ..

var files = [];
var tasks = [];
require('walk').walk('.', {
  // directory filters
  filters: [
    /node_modules/,
    /CodeMirror/,
    /\.git/,
    /benchmark\.js/,
  ],
}).on('file', function(dir, fstat, next) {
  var file = {
    name: fstat.name,
    dir: dir,
    path: path.join(dir, fstat.name),
    stat: fstat,
  };

  files.push(file);
  tasks.push.apply(tasks, Converters.forFile(file));
  next();
}).on('end', function() {
  tasks.forEach(function(task) {
    task.run({
      files: files
    });
  });
});
