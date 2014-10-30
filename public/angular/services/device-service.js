'use strict';
angular.module('octobluApp')
    .service('deviceService', function ($q, $rootScope, skynetService, PermissionsService, reservedProperties) {
        var myDevices, skynetPromise, subscribeToDevice;

        myDevices = [];
        skynetPromise = skynetService.getSkynetConnection();

        function addDevice(device) {
            myDevices.push(device);
            skynetPromise.then(function (skynetConnection) {
                skynetConnection.unsubscribe({uuid: device.uuid, token: device.token});
                skynetConnection.subscribe({uuid: device.uuid, token: device.token});
            });
        }

        skynetPromise.then(function (skynetConnection) {
            skynetConnection.on('message', function (message) {
                $rootScope.$broadcast('skynet:message:' + message.fromUuid, message);
                if (message.payload && _.has(message.payload, 'online')) {
                    var device = _.findWhere(myDevices, {uuid: message.fromUuid});
                    if (device) {
                        device.online = message.payload.online;
                    }
                }
                $rootScope.$apply();
            });

            skynetConnection.on('config', service.addOrUpdateDevice);
        });


        subscribeToDevice = function(device){
            if(device.category === 'channel') {
                return;
            }

            skynetPromise.then(function (skynetConnection) {
                skynetConnection.unsubscribe({uuid: device.uuid, token: device.token});
                skynetConnection.subscribe({uuid: device.uuid, token: device.token});
            });
        };

        var service = window.ds = {
            addOrUpdateDevice: function(device){
                subscribeToDevice(device);
                var existingDevice = _.findWhere(myDevices, {uuid: device.uuid});
                if(existingDevice) {
                    _.extend(existingDevice, device);
                    return;
                }
                myDevices.push(device);
            },
            getDevices: function (force) {
                return skynetPromise.then(function(skynetConnection){
                    if (myDevices.length && !force) {
                        return myDevices;
                    }
                    var defer = $q.defer();
                    skynetConnection.mydevices({}, function (result) {
                        myDevices.length = 0;
                        _.each(result.devices, addDevice);
                        defer.resolve(myDevices);
                    });
                    return defer.promise;
                }).then(function(devices){
                    return _.map(devices, service.addLogoUrl);
                });
            },

            getSharedDevices: function (force) {
                return PermissionsService.getSharedResources('device').then(function(devices){
                       return _.map(devices, function(device){
                            return device.target;
                       });
                });
            },
            getDeviceByUUID: function(uuid){
                return service.getDevices().then(function(devices){
                    return _.findWhere(devices, {uuid: uuid});
                });
            },

            getDeviceByUUIDAndToken: function(uuid, token){
                var deferred = $q.defer();

                skynetPromise.then(function(skynetConnection){
                    skynetConnection.devices({uuid:uuid, token:token}, function(data){
                        deferred.resolve(_.first(data.devices));
                    }, deferred.reject);
                });

                return deferred.promise;
            },

            refreshDevices: function(){
                return service.getDevices(true).then(function(){
                    return undefined;
                });
            },

            getGateways: function(){
                return service.getDevices().then(function(devices){
                    return _.where(devices, {type: 'gateway'});
                });
            },

            getOnlineGateblus: function(){
                return service.getDevices().then(function(devices){
                    return _.where(devices, {type: 'device:gateblu', online: true});
                });
            },

            registerDevice: function (options) {
                var device = _.omit(options, reservedProperties),
                    defer = $q.defer();

                skynetPromise.then(function (skynetConnection) {
                    device.owner = skynetConnection.options.uuid;

                    skynetConnection.register(device, function (result) {
                        myDevices.push(result);
                        defer.resolve(result);
                    });
                });
                return defer.promise;
            },

            claimDevice: function (options) {
                var deviceOptions = _.omit(options, reservedProperties);

                return skynetPromise.then(function(skynetConnection){
                    var defer = $q.defer();

                 skynetConnection.claimdevice(deviceOptions, function(result){
                        if(result.error) {
                            return defer.reject(result.error);
                        }
                        service.updateDevice(deviceOptions).then(function(updatedDevice) {
                            defer.resolve(updatedDevice);
                        });
                    });

                    return defer.promise;
                })
                .then(function(){
                    return service.refreshDevices();
                })
                .then(function(){
                    return service.getDeviceByUUID(deviceOptions.uuid);
                });
            },

            updateDevice: function (options) {
                var device = _.omit(options, reservedProperties),
                    defer = $q.defer();

                skynetPromise.then(function (skynetConnection) {
                    skynetConnection.update(device, function () {
                        defer.resolve(device);
                    });
                });

                return defer.promise;
            },

            unregisterDevice: function (device) {
                var defer = $q.defer();

                skynetPromise.then(function (skynetConnection) {
                    skynetConnection.unregister(device, function (result) {
                        service.getDevices(true).then(function(devices){
                            defer.resolve(devices);
                        });
                    });
                });

                return defer.promise;
            },

            getUnclaimed: function (nodeType) {
                if(nodeType === 'gateway'){
                    return service.getUnclaimedGateways();
                }

                if(nodeType === 'device') {
                    return service.getUnclaimedDevices();
                }

                return service.getUnclaimedNodes().then(function(devices){
                    return _.where(devices, {type: nodeType});
                });
            },

            getUnclaimedDevices: function () {
                return service.getUnclaimedNodes().then(function (devices) {
                    return _.filter(devices, function(device){
                        return (device.type !== 'gateway');
                    });
                });
            },

            getUnclaimedGateways: function () {
                return service.getUnclaimedNodes().then(function (devices) {
                    return _.where(devices, {type: 'gateway'});
                });
            },

            getUnclaimedNodes: function() {
                var defer = $q.defer();

                skynetPromise.then(function (skynetConnection) {
                    skynetConnection.unclaimeddevices({}, function (result) {
                        defer.resolve(_.where(result.devices, {online: true}));
                    });
                });

                return defer.promise;
            },

            gatewayConfig: function (options) {
               options.timeout = 1000;
                var defer = $q.defer();
                skynetPromise.then(function (skynetConnection) {
                    skynetConnection.gatewayConfig(options, function (result) {
                        defer.resolve(result);
                    });
                });

                return defer.promise;
            },

            createSubdevice: function (options) {
                return service.gatewayConfig(_.extend({ method: 'createSubdevice' },
                    _.omit(options, reservedProperties)));
            },

            updateSubdevice: function (options) {
                return service.gatewayConfig(_.extend({ method: 'updateSubdevice' },
                    _.omit(options, reservedProperties)));
            },

            deleteSubdevice: function (options) {
                return service.gatewayConfig(_.extend({ method: 'deleteSubdevice' },
                    _.omit(options, reservedProperties)));
            },

            addLogoUrl: function(data) {
                if(data && data.type){
                    data.logo = 'https://ds78apnml6was.cloudfront.net/' + data.type.replace(':', '/') + '.svg';
                } else {
                    data.logo = 'https://ds78apnml6was.cloudfront.net/device/other.svg';
                }
                return data;
            }
        };

        return service;
    });