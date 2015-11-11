var createGraph = require('ngraph.graph');
module.exports = produceClusterGraph;

function produceClusterGraph(srcGraph, whisper) {
  var graph = createGraph();
  var allLinks = [];

  // first pass adds nodes. Each node is a cluster
  whisper.forEachCluster(addToGraph);
  // Second we go through each node in the source graph and add links between
  // connected clusters
  srcGraph.forEachLink(connectClusters);
  allLinks.forEach(function(l) {
    var fromSize = graph.getNode(l.fromId).data.length;
    var toSize = graph.getNode(l.toId).data.length;
    var ratio = l.data/(fromSize + toSize - l.data);
//    if (ratio < 0.16) graph.removeLink(l);
  });

  return graph;

  function addToGraph(cluster) {
    graph.addNode(cluster.class, cluster.nodes);
  }

  function connectClusters(link) {
    var fromCluster = whisper.getClass(link.fromId);
    var toCluster = whisper.getClass(link.toId);

    if (fromCluster !== toCluster) {
      var link = graph.getLink(fromCluster, toCluster);
      if (!link) {
        link = graph.addLink(fromCluster, toCluster, 1);
        allLinks.push(link);
      } else {
        link.data += 1;
      }
    }
  }

  function byData(x, y) {
    return y.data - x.data;
  }
}
