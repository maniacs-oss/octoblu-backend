'use strict';
var _        = require('lodash');
var demoFlow = require('../../assets/flows/demo-flow.json');
var User     = require('../models/user');
var when     = require('when');
var textCrypt = require('../lib/textCrypt');

var DemoFlowController = function (options) {
  var self = this;

  var options  = options || {};
  var flowNodeTypeCollection = options.flowNodeTypes || require('../collections/flow-node-type-collection');
  var Template = options.Template || require('../models/template-model');
  var template = new Template();
  var meshbluJSON  = options.meshbluJSON;

  self.create = function (req, res) {
    var user = req.user;
    var cookies = req.cookies || {};
    var flowNodeTypes = new flowNodeTypeCollection(req.uuid, req.token);
    when.all([
      User.addApiAuthorization(user, 'channel:weather', {authtype: 'none'}),
      User.addApiAuthorization(user, 'channel:stock-price', {authtype: 'none'}),
      User.addApiAuthorization(user, 'channel:sms-send', {authtype: 'basic', token_crypt: textCrypt.encrypt(req.uuid), secret_crypt: textCrypt.encrypt(req.token) }),
      User.addApiAuthorization(user, 'channel:email', {authtype: 'basic', token_crypt: textCrypt.encrypt(req.uuid), secret_crypt: textCrypt.encrypt(req.token) })
    ]).then(function(){
      template.importFlow(user.resource.uuid, demoFlow, meshbluJSON, flowNodeTypes).then(function(flow){
        res.send(201, flow);
      }).catch(function(error) {
        res.send(422, error);
      });
    });
  };
}

module.exports = DemoFlowController;
