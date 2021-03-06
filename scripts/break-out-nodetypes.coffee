#!/usr/bin/env coffee

_         = require 'lodash'
fs        = require 'fs'
path      = require 'path'
nodetypes = require '../assets/json/nodetypes.json'

class BreakOut
  constructor: ->
    @nodetypesDir = path.join __dirname, '../assets/json/nodetypes'

  mkdir: (dirpath) =>
    try
      fs.mkdirSync dirpath

  run: =>
    @mkdir @nodetypesDir
    _.each nodetypes, @writeNodeType

  writeNodeType: (nodetype) =>
    [dirname,filename] = nodetype.type.split(':')

    dirpath = path.join @nodetypesDir, dirname
    @mkdir dirpath

    filename = path.join dirpath, "#{filename}.json"
    json     = JSON.stringify nodetype, null, 2

    fs.writeFileSync filename, json

(new BreakOut).run()
