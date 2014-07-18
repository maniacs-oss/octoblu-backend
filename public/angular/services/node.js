angular.module('octobluApp')
    .service('NodeService', function($q, deviceService, channelService, NodeTypeService){

        var nodes, allNodeTypes = [];

        function getDeviceNodes(devices, nodeTypes ){
            var deviceNodes = _.map(devices, function(device){

                var deviceNodeType = _.findWhere(nodeTypes, function(nodeType){
                    var isNodeType = (nodeType.skynet.type === (device.type || 'device') && nodeType.skynet.subtype === (device.subtype || 'other'));
                    return isNodeType;
                });
                return _.extend({ category: 'device', nodeType : deviceNodeType}, device);
            });

            return deviceNodes;
        }

        function getChannelNodes(channels, nodeTypes){
            var channelNodes = _.map(channels, function(channel){
                var channelNodeType = _.findWhere(nodeTypes, function(nodeType){
                    return (nodeType.category === 'channel')
                        && (nodeType.name === channel.name )
                });
                return _.extend({ category : 'channel',  nodeType : channelNodeType}, channel);
            });
            return channelNodes;
        }

        var service = {
            getAllNodes : function(){
                var defer = $q.defer();
                NodeTypeService.getNodeTypes().then(function(nodeTypes){
                    angular.copy(nodeTypes, allNodeTypes);
                    return deviceService.getDevices(true);
                }).then(function(devices){
                   nodes = getDeviceNodes(devices, allNodeTypes);
//                   angular.copy(deviceNodes, nodes);
                   return channelService.getActiveChannels(true);
                }).then(function(channels){
                    var channelNodes = getChannelNodes(channels, allNodeTypes);
                    return nodes.concat(channelNodes);

                }).then(function(combinedNodes){
                    defer.resolve(combinedNodes);
                });
                return defer.promise;
            }
        };
       return service;
    });