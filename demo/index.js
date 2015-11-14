/* globals cola, sigma */
var getColor = require('./getColor.js');
var createLayout = require('ngraph.forcelayout');

var srcGraph = require('miserables');
var whisper = require('ngraph.cw')(srcGraph);

var globalPos = new Map();

for (var i = 0; i < 3; ++i) {
  whisper.step();
}
var clusterGraph = require('./produceClusterGraph.js')(srcGraph, whisper);

var localLayouts = {};
whisper.forEachCluster(makeLocalLayout);

var clusterLayout = new cola.Layout();
var clusterNodes = getAllNodes(clusterGraph).map(toColaNode);

clusterLayout.avoidOverlaps(true)
  .nodes(clusterNodes)
  .links(getAllLinks(clusterNodes, clusterGraph))
  .linkDistance(200)
  .size([1960, 1500])
  .start(0, 0, 60);

var clusterPosLookup = {};
for (var i = 0; i < clusterNodes.length; ++i) {
  clusterPosLookup[clusterNodes[i].name] =  clusterNodes[i].bounds;
}

whisper.forEachCluster(makeGlobalLayout);

renderGraph();

function makeGlobalLayout(cluster) {
  var meta = localLayouts[cluster.class];
  var clusterPos = clusterPosLookup[cluster.class];
  var nodes = meta.nodes;
  var localLayout = meta.layout;

  for (var i = 0; i < nodes.length; ++i) {
    setGlobalPos(nodes[i]);
  }

  function setGlobalPos(node) {
    var localPos = localLayout.getNodePosition(node);
    globalPos.set(node, {
      x: (localPos.x - meta.minX) + clusterPos.x,
      y: (localPos.y - meta.minY) + clusterPos.y
    });
  }
}
function makeLocalLayout(cluster) {
  var nodes = cluster.nodes;
  var subGraph = makeSubgraph(nodes, srcGraph);

  var localLayout = createLayout(subGraph, {
    springLength: 20,
    springCoeff: 0.00055,
    dragCoeff: 0.09,
    gravity: -1
  });

  for (var i = 0; i < 150; ++i) {
    localLayout.step();
  }

  var minX = Number.POSITIVE_INFINITY,
    minY = Number.POSITIVE_INFINITY;
  var maxX = Number.NEGATIVE_INFINITY,
    maxY = Number.NEGATIVE_INFINITY;
  nodes.forEach(findMinPos);

  localLayouts[cluster.class] = {
    minX: minX - 10,
    minY: minY - 10,
    maxX: maxX + 10,
    maxY: maxY + 10,
    layout: localLayout,
    nodes: cluster.nodes
  };

  function findMinPos(node) {
    var pos = localLayout.getNodePosition(node);
    if (pos.x < minX)
      minX = pos.x;
    if (pos.y < minY)
      minY = pos.y;
    if (pos.x > maxX)
      maxX = pos.x;
    if (pos.y > maxY)
      maxY = pos.y;
  }
}

function makeSubgraph(nodes, srcGraph) {
  var subGraph = require('ngraph.graph')();
  var i;

  for (i = 0; i < nodes.length; ++i) {
    subGraph.addNode(nodes[i]);
  }

  for (i = 0; i < nodes.length; ++i) {
    addInternalConnections(nodes[i]);
  }

  return subGraph;

  function addInternalConnections(nodeId) {
    srcGraph.forEachLinkedNode(nodeId, function(otherNode, link) {
      if (!subGraph.getNode(otherNode.id)) return; // external link
      if (link.fromId === nodeId) subGraph.addLink(nodeId, otherNode.id);
      else subGraph.addLink(otherNode.id, nodeId);
    });
  }
}

function renderGraph() {
  //var sigma = require('sigma');
  var sigmaGraph = {
    nodes: [],
    edges: []
  };
  srcGraph.forEachNode(addNodeToSigma);
  srcGraph.forEachLink(addLinkToSigma);

  function addNodeToSigma(node) {
    var pos = globalPos.get(node.id);
    sigmaGraph.nodes.push({
      id: node.id.toString(),
      label: node.id.toString(),
      x: pos.x,
      y: pos.y,
      size: 1,
      color: getColor(whisper.getClass(node.id))
    });
  }

  function addLinkToSigma(link) {
    sigmaGraph.edges.push({
      id: link.id.toString(),
      source: link.fromId.toString(),
      target: link.toId.toString()
    });
  }
  var sig = new sigma({
    container: 'container',
    graph: sigmaGraph,
  });
}

function getAllNodes(graph) {
  var nodes = [];
  graph.forEachNode(function(node) {
    nodes.push(node);
  });
  return nodes;
}

function getAllLinks(nodes, graph) {
  var links = [];
  var lookup = new Map();
  for (var i = 0; i < nodes.length; ++i) {
    lookup.set(nodes[i].name, i);
  }
  graph.forEachLink(function(l) {
    links.push({
      source: lookup.get(l.fromId),
      target: lookup.get(l.toId)
    });
  });
  return links;
}

function toColaNode(ngraphNode) {
  var meta = localLayouts[ngraphNode.id];
  return {
    width: meta.maxX - meta.minX,
    name: ngraphNode.id,
    height: meta.maxY - meta.minY
  };
}

function toColaLink(ngraphLink) {
  return {
    source: ngraphLink.fromId,
    target: ngraphLink.toId
  };
}

