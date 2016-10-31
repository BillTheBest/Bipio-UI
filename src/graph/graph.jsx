import d3 from 'd3'
import converter from './converter.js'
import { publish, subscribe } from '../eventSystem.js'
import styles from '../styles/graph-creator.css'

var width  = 960,
    height = 500,
    locX = 200,
    locY = 200;    

var svg, graph, sourceIcon, iconAddr = "";

export function createGraph(dom, bipData, channelData) {   
  // set up initial nodes and links
  //  - nodes are known by 'id', not by index in array. 

  var lastNodeId = 0;
  var nodes = [];
  var links = [];
  if (bipData && channelData) {
    //console.log(channelData);
    var sourceAction = channelData.action;
    converter.toGraph(bipData, sourceAction, nodes, links);
    lastNodeId = nodes.length - 1;
    sourceIcon = bipData.icon;
  }

  svg = d3.select(dom)
    .append('svg')
    .attr('oncontextmenu', 'return false;')
    .attr('width', width)
    .attr('height', height);  
  graph = new GraphCreator(svg, nodes, lastNodeId, links);
  graph.restart();
}

export function createNode(pod, sourceFlag) {
  if (sourceFlag) { graph.newSource(pod); } 
  else { graph.newNode(pod); }  
  //console.log(pod); 
}

export function saveNode(node, transform) {
  graph.saveNode(node, transform);  
}

export function setIconAddr(addr) {
  iconAddr = addr;
}

export function getGraph() {
  var convertedGraph = converter.toJSON(graph.nodes, graph.links);
  return convertedGraph;
}

export function getSource() {
  var source = graph.nodes[0];
  return source;
}

export function deleteNode(pod) {
  graph.deleteNode(pod);
}

export function keyboardSwitch(state) {
  if (state) {
    d3.select(window)
    .on('keydown', function(d){graph.keydown.call(graph, d);})
    .on('keyup', function(d){graph.keyup.call(graph, d);});
  }
  else {
    d3.select(window)
    .on('keydown', null)
    .on('keyup', null);
  }
}


var GraphCreator = function(svg, nodes, lastNodeId, links){
  var thisGraph = this;
      
  thisGraph.nodes = nodes || [];
  thisGraph.links = links || [];
  thisGraph.lastNodeId = lastNodeId || 0;

  // init D3 force layout
  var force = d3.layout.force()
      .nodes(thisGraph.nodes)
      .links(thisGraph.links)
      .size([width, height])
      .linkDistance(150)
      .charge(-500)
      .on('tick', function(d){thisGraph.tick.call(thisGraph, d);})
  thisGraph.force = force;
  
  thisGraph.svg = svg; 
  
  svg.on('mousedown', function(d){thisGraph.mousedown.call(thisGraph, d);})
    .on('mousemove', function(d){thisGraph.mousemove.call(thisGraph, d);})
    .on('mouseup', function(d){thisGraph.mouseup.call(thisGraph, d);})
    
  d3.select(window)
    .on('keydown', function(d){thisGraph.keydown.call(thisGraph, d);})
    .on('keyup', function(d){thisGraph.keyup.call(thisGraph, d);});

  // define arrow markers for graph links
  svg.append('svg:defs').append('svg:marker')
      .attr('id', 'end-arrow')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 4)
      .attr('markerWidth', 3)
      .attr('markerHeight', 3)
      .attr('orient', 'auto')
     .append('svg:path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#000');

  svg.append('svg:defs').append('svg:marker')
      .attr('id', 'mark-end-arrow')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 6)
      .attr('markerWidth', 3)
      .attr('markerHeight', 3)
      .attr('orient', 'auto')
     .append('svg:path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#000');

  // line displayed when dragging new nodes
  thisGraph.drag_line = svg.append('svg:path')
    .attr('class', 'link dragline hidden')
    .attr('d', 'M0,0L0,0');    

  // handles to link and node element groups
  thisGraph.path = svg.append('svg:g').selectAll('path');
  thisGraph.circle = svg.append('svg:g').selectAll('g');

  // mouse event vars  
  thisGraph.state = {
    selected_node: null,
    selected_link: null,
    mousedown_link: null,
    mousedown_node: null,
    mouseup_node: null
  };
};


GraphCreator.prototype.resetMouseVars = function() {
  var thisGraph = this;
  thisGraph.state.mousedown_node = null;
  thisGraph.state.mouseup_node = null;
  thisGraph.state.mousedown_link = null;
}

// update force layout (called automatically each iteration)
GraphCreator.prototype.tick = function() {
  var thisGraph = this;
  // draw directed edges with proper padding from node centers
  thisGraph.path.attr('d', function(d) {
    var deltaX = d.target.x - d.source.x,
        deltaY = d.target.y - d.source.y,
        dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY),
        normX = deltaX / dist,
        normY = deltaY / dist,
        sourcePadding = 26,
        targetPadding = 30,
        sourceX = d.source.x + (sourcePadding * normX),
        sourceY = d.source.y + (sourcePadding * normY),
        targetX = d.target.x - (targetPadding * normX),
        targetY = d.target.y - (targetPadding * normY);
    return 'M' + sourceX + ',' + sourceY + 'L' + targetX + ',' + targetY;
  });

  thisGraph.circle.attr('transform', function(d) {
    return 'translate(' + d.x + ',' + d.y + ')';
  });
}

// update graph (called when needed)
GraphCreator.prototype.restart = function() {
  var thisGraph = this,
      state = thisGraph.state;
  // path (link) group
  thisGraph.path = thisGraph.path.data(thisGraph.links);

  // update existing links
  thisGraph.path.classed('selected', function(d) { return d === state.selected_link; })    
    .style('marker-end', function(d) { return 'url(#end-arrow)'; });


  // add new links
  thisGraph.path.enter().append('svg:path')
    .attr('class', 'link')
    .classed('selected', function(d) { return d === state.selected_link; })
    .style('marker-end', function(d) { return 'url(#end-arrow)'; })
    .on('mousedown', function(d) {
      if(d3.event.ctrlKey) return;

      // select link
      state.mousedown_link = d;
      if(state.mousedown_link === state.selected_link) state.selected_link = null;
      else state.selected_link = state.mousedown_link;
      state.selected_node = null;
      thisGraph.restart.call(thisGraph, d);
    });

  // remove old links
  thisGraph.path.exit().remove();


  // circle (node) group
  // NB: the function arg is crucial here! nodes are known by id, not by index!
  thisGraph.circle = thisGraph.circle.data(thisGraph.nodes, function(d) { return d.id; });

  // update existing nodes (source & selected visual states)
  thisGraph.circle.selectAll('circle')
    //.style('fill', function(d) { return (d === state.selected_node) ? d3.rgb("gray").brighter().toString() : "gray"; })
    .classed('source', function(d) { return (d.name == "source"); });

  // add new nodes
  var g = thisGraph.circle.enter().append('svg:g');

  // show node icons
   

  g.append('svg:image')
      .attr('x', -16)
      .attr('y', -16)
      .attr('width', 32)
      .attr('height', 32)
      .attr("xlink:href", function(d) {         
	var name = d.name;
        if (name == "source")
         { if (sourceIcon) { return sourceIcon; }
          else {
          var pos = d.action.indexOf(".");
	  if (pos == -1) { pos = d.action.length; }
	  return iconAddr + d.action.substring(0, pos) + ".png";
          } }
        else {
          var pos = name.indexOf(".");
	  return iconAddr + name.substring(0, pos) + ".png";
        }
      });

  g.append('svg:circle')
    .attr('class', 'node')
    .attr('r', 24)
    //.style('fill', function(d) { return (d === state.selected_node) ? d3.rgb("gray").brighter().toString() : "gray"; })
    .style('fill', 'white')
    .style('fill-opacity', 0)
    .style('stroke', function(d) { return d3.rgb("gray").darker().toString(); })
    .classed('source', function(d) { return (d.name == "source"); })
    .on('mouseover', function(d) {
      if(!state.mousedown_node || d === state.mousedown_node) return;
      // enlarge target node
      d3.select(this).attr('transform', 'scale(1.1)');
    })
    .on('mouseout', function(d) {
      if(!state.mousedown_node || d === state.mousedown_node) return;
      // unenlarge target node
      d3.select(this).attr('transform', '');
    })
    .on('mousedown', function(d) {
      if(d3.event.ctrlKey) return;

      // select node
      state.mousedown_node = d;
      if(state.mousedown_node === state.selected_node) state.selected_node = null;
      else state.selected_node = state.mousedown_node;
      state.selected_link = null;

      // reposition drag line
      thisGraph.drag_line
        .style('marker-end', 'url(#mark-end-arrow)')
        .classed('hidden', false)
        .attr('d', 'M' + state.mousedown_node.x + ',' + state.mousedown_node.y + 'L' + state.mousedown_node.x + ',' + state.mousedown_node.y);

      thisGraph.restart.call(thisGraph, d);
    })
    .on('mouseup', function(d) {
      if(!state.mousedown_node) return;

      // needed by FF
      thisGraph.drag_line
        .classed('hidden', true)
        .style('marker-end', '');

      // check for drag-to-self
      // TODO: Add the one-source rule and check that a link in the opposite direction doesn't already exist.
      state.mouseup_node = d;
      if(state.mouseup_node === state.mousedown_node) { thisGraph.resetMouseVars.call(thisGraph, d); return; }

      // unenlarge target node
      d3.select(this).attr('transform', '');

      // add link to graph (update if exists)
      // NB: links are strictly source < target; arrows separately specified by booleans
      // TODO: Problems with link sources/targets? Why the need to determine source and target by whose id is greater? Links overlap! Ensure that directions are correct and that unnecessary links aren't created or updated with wrong directions. Also add the one source rule.
      var source, target;      
      source = state.mousedown_node;
      target = state.mouseup_node; 

      var targetCheck = thisGraph.links.filter(function(l) { return (l.target === target); })[0];     
      
      if ((target.name == "source") || (targetCheck)) { alert("Backwards linking is forbidden!"); } 
      else {
        var link;
        link = thisGraph.links.filter(function(l) {
          return ((l.source === source && l.target === target)||(l.source === target && l.target === source));
        })[0];

        if(!link) {
          link = {source: source, target: target};        
          thisGraph.links.push(link);
	  target.transforms = {};
        }
      }

      // select new link
      state.selected_link = link;
      state.selected_node = null;
      thisGraph.restart.call(thisGraph, d);
    })
    .on('dblclick', function(d){
     
      // select node
      state.mousedown_node = d;
      if(state.mousedown_node === state.selected_node) state.selected_node = null;
      else state.selected_node = state.mousedown_node;
      state.selected_link = null;      
	
      //console.log(state.mousedown_node);
      //Do not select source node. TODO: Finish this.
      if (state.mousedown_node.name != "source") {
        //Send selected pod and its source (check if pod is bip source). Alert if no source pod detected.
        var source;
        if (state.mousedown_node.name != "source") {
	  source = [];
          var targetName = state.mousedown_node.name;
          for (var i = 0; i < thisGraph.links.length; i++) {
	    for (var j = 0; j < thisGraph.links.length; j++) {
	      if (thisGraph.links[j].target.name == targetName) { 
		  source.push(thisGraph.links[j].source); 
	    	  targetName = thisGraph.links[j].source.name; 
		  break; 
	      }
	    }
	  }
        } else { source = ""; }
        if ((state.mousedown_node.name != "source") && (!source)) { alert("A source is needed for this pod!"); }
        else {
	  publish('openProps', state.mousedown_node, source);
          console.log(state.mousedown_node, source);
          thisGraph.restart.call(thisGraph, d);
        }
      }
    });
  
  // remove old nodes
  thisGraph.circle.exit().remove();

  // set the graph in motion
  thisGraph.force.start();
}

GraphCreator.prototype.mousedown = function() {
var thisGraph = this,
    state = thisGraph.state;  
  // prevent I-bar on drag
  //d3.event.preventDefault();

  // because :active only works in WebKit?
  svg.classed('active', true);

  if(d3.event.ctrlKey || state.mousedown_node || state.mousedown_link) return;

 

  thisGraph.restart();
}

GraphCreator.prototype.mousemove = function() {
var thisGraph = this,
    state = thisGraph.state;  
  if(!state.mousedown_node) return;

  // update drag line
  thisGraph.drag_line.attr('d', 'M' + state.mousedown_node.x + ',' + state.mousedown_node.y + 'L' + d3.mouse(thisGraph.svg.node())[0] + ',' + d3.mouse(thisGraph.svg.node())[1]);

  thisGraph.restart();
}

GraphCreator.prototype.mouseup = function() {
var thisGraph = this,
    state = thisGraph.state;  
  if(state.mousedown_node) {
    // hide drag line
    thisGraph.drag_line
      .classed('hidden', true)
      .style('marker-end', '');
  }

  // because :active only works in WebKit?
  svg.classed('active', false);

  // clear mouse event vars
  thisGraph.resetMouseVars();
}

GraphCreator.prototype.spliceLinksForNode = function(node) {
var thisGraph = this,
    state = thisGraph.state;  
  var toSplice = thisGraph.links.filter(function(l) {
    return (l.source === node || l.target === node);
  });
  toSplice.map(function(l) {
    thisGraph.links.splice(thisGraph.links.indexOf(l), 1);
  });
}

// only respond once per keydown
var lastKeyDown = -1;

GraphCreator.prototype.keydown = function() {
  var thisGraph = this,
      state = thisGraph.state;  
  d3.event.preventDefault();

  if(lastKeyDown !== -1) return;
  lastKeyDown = d3.event.keyCode;

  // ctrl
  if(d3.event.keyCode === 17) {
    thisGraph.circle.call(thisGraph.force.drag);
    svg.classed('ctrl', true);
  }

  if(!state.selected_node && !state.selected_link) return;
  switch(d3.event.keyCode) {
    case 8: // backspace
    case 46: // delete
      if(state.selected_node && state.selected_node.id != 0) {
        thisGraph.nodes.splice(thisGraph.nodes.indexOf(state.selected_node), 1);
        thisGraph.spliceLinksForNode(state.selected_node);
      } else if(state.selected_link) {
        for (var i=0; i < thisGraph.nodes.length; i++) {
	  if (thisGraph.nodes[i].name == state.selected_link.target.name) {
	    thisGraph.nodes[i].transforms = {};
	    break;
	  }
	}
        thisGraph.links.splice(thisGraph.links.indexOf(state.selected_link), 1);
      }
      state.selected_link = null;
      state.selected_node = null;
      thisGraph.restart();
      break;    
  }
}

GraphCreator.prototype.keyup = function() {
  var thisGraph = this,
    state = thisGraph.state;  
  lastKeyDown = -1;

  // ctrl
  if(d3.event.keyCode === 17) {
    thisGraph.circle
      .on('mousedown.drag', null)
      .on('touchstart.drag', null);
    svg.classed('ctrl', false);
  }
}

GraphCreator.prototype.newNode = function(pod) {
  var thisGraph = this;
  // insert new node at point
  var node = {name: pod + "._" + thisGraph.lastNodeId++, id: thisGraph.lastNodeId, transforms: {} };
  node.x = locX;
  node.y = locY;
  thisGraph.nodes.push(node);

  thisGraph.restart();
}

GraphCreator.prototype.newSource = function(pod) {
  var thisGraph = this;
  // insert new bip source
  var node = {name: "source", id: 0, type: "trigger", action: pod, config: { config: {} } };
  node.x = locX;
  node.y = locY;
  thisGraph.nodes.push(node);

  thisGraph.restart();
}

GraphCreator.prototype.deleteNode = function(pod) {
  var thisGraph = this;
  if(pod.id != 0) {
        thisGraph.nodes.splice(thisGraph.nodes.indexOf(pod), 1);
        thisGraph.spliceLinksForNode(pod);
      }
  thisGraph.restart();
}
  
GraphCreator.prototype.saveNode = function(node, transform) {
  var thisGraph = this;
  
  for (var key in transform) {
    if (transform.hasOwnProperty(key)) {
      if (transform[key] == "") { delete transform[key]; }
    }
  }
  if (node == "source") {
    for (var i=0; i < thisGraph.nodes.length; i++) {
      if (thisGraph.nodes[i].name == node) { thisGraph.nodes[i].config.config = transform; break; }
    }
  } else {
    for (var i=0; i < thisGraph.nodes.length; i++) {
      if (thisGraph.nodes[i].name == node) { thisGraph.nodes[i].transforms = transform; break; }
    }
  }
  thisGraph.restart();
}


