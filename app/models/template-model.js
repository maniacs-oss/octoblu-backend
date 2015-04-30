'use strict';
var _          = require('lodash');
var when       = require('when');
var uuid       = require('node-uuid');
var debug      = require('debug')

function TemplateModel(dependencies) {
  dependencies = dependencies || {};
  var octobluDB  = dependencies.Database || require('../lib/database');
  var Flow       = dependencies.Flow || require('./flow');
  var collection = octobluDB.getCollection('templates');

  var methods = {
    createByUserUUID : function(userUUID, data) {
      var self = this;
      var template = _.extend({
        uuid: uuid.v1(),
        created: new Date(),
        resource: {
          nodeType: 'template',
          owner: {
            uuid: userUUID,
            nodeType: 'user'
          }
        }
      }, data);

      return Flow.findOne({flowId: data.flowId}).then(function(flow) {
        template.flow = self.cleanFlow(flow);
        return self.insert(template).then(function(){
          return template;
        });
      });
    },

    importTemplate : function(userUUID, templateId, meshblu) {
      var self = this;
      return self.findOne({uuid: templateId}).then(function(template) {
        var newFlow = _.clone(template.flow);
        newFlow.name = template.name;
        _.each(newFlow.nodes, function(node){
          self.cleanId(node, newFlow.links);
        });

        return Flow.createByUserUUID(userUUID, newFlow, meshblu);
      });
    },

    importFlow : function(userUUID, flow, meshblu) {
      var self = this;
      var newFlow = self.cleanFlow(flow);
      _.each(newFlow.nodes, function(node){
        self.cleanId(node, newFlow.links);
      });

      return Flow.createByUserUUID(userUUID, newFlow, meshblu);
    },

    cleanFlow : function(flow) {
      var self = this;
      var newFlow = _.cloneDeep(flow);

      delete newFlow._id;
      delete newFlow.flowId;
      delete newFlow.resource;
      delete newFlow.token;

      newFlow.nodes = _.map(newFlow.nodes, self.cleanNode);

      return newFlow;
    },

    cleanNode : function(node) {
      if( node.type.indexOf('operation') === 0) {
        return node;
      }

      var self = this;
      var stuffToKeep = ['type', 'category', 'name', 'channelid'];
      _.each(_.keys(node.defaults), function(key){
        if (_.contains(stuffToKeep, key)){
          return ;
        }
        delete node.defaults[key];
        delete node[key];
      });
      return node;
    },

    cleanId : function(node, links){
      var oldId = node.id;
      var newId = uuid.v1();
      var toLinks = _.filter(links, {to: oldId});
      var fromLinks = _.filter(links, {from: oldId});

      node.id = newId;

      _.each(toLinks, function(toLink){
        toLink.to = newId;
      });

      _.each(fromLinks, function(fromLink){
        fromLink.from = newId;
      });
    },

    withFlowId : function(flowId) {
      var self = this;
      var query = {
        flowId: flowId
      };
      return self.find(query);
    },

    withUserUUID : function(uuid) {
      var self = this;
      var query = {
        'resource.owner.uuid' : uuid
      };
      return self.find(query);
    },

    findByPublic: function(tags) {
      debug("Finding template with tags ", tags);
      tags = tags || [];
      if( ! _.isArray(tags)){
        tags = [tags]
      }
      return this.find({public: true, tags: { $all: tags }});
    }
  };

  return _.extend({}, collection, methods);
}

module.exports = TemplateModel
