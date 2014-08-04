angular.module('octobluApp')
  .service('FlowRenderer', function (FlowNodeRenderer, FlowLinkRenderer) {
    return function (renderScope) {
      var dispatch = d3.dispatch('flowChanged');
      var linkRenderer = FlowLinkRenderer(renderScope),
        nodeRenderer = FlowNodeRenderer(renderScope);

      this.render = function (flow) {
        nodeRenderer.render(flow.nodes);
        linkRenderer.render(flow.links);

        nodeRenderer
          .on('nodeMoved', function (flowNode) {
            var nodeLinks = getNodeLinks(flowNode.id, flow.links);
            linkRenderer.updateLinks(nodeLinks);
          });

        nodeRenderer
          .on('nodeChanged', function (flowNode) {
            dispatch.flowChanged(flow);
          });
      };

      this.clear = function () {
        nodeRenderer.clear();
        linkRenderer.clear();
      };

      this.on = function (event, callback) {
        return dispatch.on(event, callback);
      };
    };

    function getNodeLinks(nodeId, links) {
      var fromLinks = _.where(links, { 'from': nodeId } );
      var toLinks = _.where(links, { 'to': nodeId } );

      return fromLinks.concat(toLinks);
    }
  });
