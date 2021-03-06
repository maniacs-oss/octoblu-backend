'use strict';

var octobluDB = require('../lib/database');
var _         = require('lodash');
var when      = require('when');
var Q         = require('q');
var uuid      = require('node-uuid');
var rest      = require('rest');
var mime      = require('rest/interceptor/mime');
var errorCode = require('rest/interceptor/errorCode');
var Group     = require('./group-model');
var client    = rest.wrap(mime).wrap(errorCode);

function ResourcePermissionModel() {
  var collection = octobluDB.getCollection('resourcepermissions');

  var methods = {
    compilePermissions : function (ownerUUID, resourceUUID) {
        var self = this;
    },

    findPermissionsOnResource : function (options) {
        var self = this;

        var group = new Group();

        return group.findGroupsContainingResource(options.resourceUUID)
            .then(function (groups) {
                var resourceUUIDs = _.pluck(_.pluck(groups, 'resource'), 'uuid');
                resourceUUIDs.push(options.resourceUUID);

                return self.findByResource({
                    ownerUUID: options.ownerUUID,
                    resourceUUID: resourceUUIDs,
                    permissionDirection: options.permissionDirection
                });
            });
    },

    findFlattenedPermissionsOnResource : function (options) {
        var self = this;
        var groups,
            otherDirection = options.permissionDirection === 'source' ? 'target' : 'source',
            resourceUUIDs = options.resourceUUID instanceof Array ?
                options.resourceUUID : [options.resourceUUID],

            flatPermissions;

        var group = new Group()

        return group.findGroupsContainingResource(resourceUUIDs)
            .then(function (dbGroups) {
                groups = dbGroups;
                var groupUUIDs = _.pluck(_.pluck(groups, 'resource'), 'uuid');
                resourceUUIDs = resourceUUIDs.concat(groupUUIDs);
                return self.findByResource({
                    ownerUUID: options.ownerUUID,
                    resourceUUID: resourceUUIDs,
                    permissionDirection: options.permissionDirection
                });
            })
            .then(function (permissions) {
                var groupPermissions = _.filter(permissions, function (permission) {
                    return permission[otherDirection].type === 'group';
                });
                flatPermissions = _.xor(permissions, groupPermissions);

                return when.all(_.map(groupPermissions, function (permission) {
                    return group.findByUuidWithoutRegardToOwner(permission[otherDirection].uuid)
                        .then(function (group) {
                            if (group) {
                                return {
                                    permission: permission,
                                    group: group
                                };
                            }
                        });
                }));
            })
            .then(function (groupPermissionArray) {
                return _.chain(groupPermissionArray)
                    .map(function (groupPermission) {
                        return _.map(groupPermission.group.members, function (member) {
                            var flatPermission = _.clone(groupPermission.permission);
                            flatPermission[otherDirection] = member;
                            return flatPermission;
                        })
                    })
                    .flatten()
                    .union(flatPermissions)
                    .value();
            });
    },

    findCompiledPermissionsOnResource : function (options) {
        var self = this;
        var otherDirection = (options.permissionDirection === 'source' ? 'target' : 'source');

        return self.findFlattenedPermissionsOnResource(options)
            .then(function (flatPermissions) {
                flatPermissions = _.chain(flatPermissions);

                return flatPermissions
                    .groupBy(function (permission) {
                        return permission[otherDirection].uuid;
                    })
                    .pairs()
                    .map(function (pair) {
                        var permissions = pair[1];
                        var compiled = _.reduce(permissions, function (compiledPermission, permission) {
                            if (!compiledPermission) {
                                return permission;
                            }

                            if (!(compiledPermission.name instanceof Array)) {
                                compiledPermission.name = [compiledPermission.name];
                            }

                            if (permission.name)
                                compiledPermission.name.push(permission.name);
                            _.each(_.keys(permission.permissions), function (permissionName) {
                                compiledPermission.permissions[permissionName] =
                                    compiledPermission.permissions[permissionName] || permission.permissions[permissionName];
                            });

                            return compiledPermission;
                        }, _.cloneDeep(permissions.pop()));
                        return compiled;
                    }).value();
            });
    },

    findByResource : function (options) {
        var self = this;
        var query = {},
            resourceQuery = options.resourceUUID;
        if (options.resourceUUID instanceof Array) {
            resourceQuery = {$in: options.resourceUUID};
        }

        query[options.permissionDirection + '.uuid'] = resourceQuery;

        if (options.ownerUUID) {
            query['resource.owner.uuid'] = options.ownerUUID;
        }

        return self.find(query);
    },

    updateSkynetPermissions : function (options) {
        var self = this;
        var ownerResource = options.ownerResource,
            resources = options.resources,
            skynetUrl = options.skynetUrl,
            deviceProperties;

        return Q.all(
            _.compact(_.map(resources, function (resource) {
                if (resource.type !== 'user') {
                    return self.findCompiledPermissionsOnResource({
                        ownerUUID: ownerResource.uuid,
                        resourceUUID: resource.uuid,
                        permissionDirection: 'target'
                    })
                        .then(function (compiledPermissions) {
                            return self.formatSkynetPermissions(compiledPermissions);
                        })
                        .then(function (permissions) {
                            deviceProperties = {
                                discoverWhitelist: permissions.discoverWhitelist,
                                configureWhitelist: permissions.configureWhitelist,
                                sendWhitelist: permissions.sendWhitelist,
                                receiveWhitelist: permissions.receiveWhitelist
                            };

                            return client({
                                method: 'PUT',
                                path: skynetUrl + '/devices/' + resource.uuid,
                                entity: deviceProperties,
                                headers: {
                                    skynet_auth_uuid: ownerResource.uuid,
                                    skynet_auth_token: ownerResource.token,
                                    'Content-Type': 'application/json'
                                }
                            });
                        });
                }
            })))
            .then(function () {
                return deviceProperties;
            });
    },

    formatSkynetPermissions : function (permissions) {
        var self = this;

        var discoverWhitelist = _.filter(permissions, function (permission) {
            return permission.permissions.discover;
        });
        var configureWhitelist = _.filter(permissions, function (permission) {
            return permission.permissions.configure;
        });
        var sendWhitelist = _.filter(permissions, function (permission) {
            return permission.permissions.message_send;
        });
        var receiveWhitelist = _.filter(permissions, function (permission) {
            return permission.permissions.message_receive;
        });

        return {
            discoverWhitelist: _.pluck(_.pluck(discoverWhitelist, 'source'), 'uuid'),
            configureWhitelist: _.pluck(_.pluck(configureWhitelist, 'source'), 'uuid'),
            sendWhitelist: _.pluck(_.pluck(sendWhitelist, 'source'), 'uuid'),
            receiveWhitelist: _.pluck(_.pluck(receiveWhitelist, 'source'), 'uuid')
        };
    }
  };

  return _.extend({}, collection, methods);
};

module.exports = new ResourcePermissionModel();

