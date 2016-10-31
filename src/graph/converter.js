export default converter();

function converter() {
  let api = {
        toGraph: toGraph,
        toJSON: toJSON
    };

  return api;   
  
  function toGraph(jsondata, sourceAction, nodes, links) {
    if (!jsondata.hasOwnProperty('hub')) return false;
    
    var pods = ["source"];
    var currId = 0;
    
    //Source node
    nodes.push({name: "source", id: currId, type: jsondata.type, title: jsondata.name, action: sourceAction, config: jsondata.config});
    currId++;    

    //Extract pods
    for (var key in jsondata.hub) {
      if (jsondata.hub.hasOwnProperty(key)) {
  	var val = jsondata.hub[key];        
	for(var i = 0; i < val.edges.length; i++) {          
	  pods.push(val.edges[i]);
	};
      };
    };
    
    //Other nodes - extract props
    for (var i = 1; i < pods.length; i++) {
      var transforms = {},
	  name = pods[i];
      for (var key in jsondata.hub) {
        if (jsondata.hub.hasOwnProperty(key)) {
 	  var val = jsondata.hub[key].transforms; 
	  if (val && val.hasOwnProperty(name)) { transforms = val[name]; }
	};
      };
      nodes.push({name: name, id: currId, transforms: transforms});      
      currId++;      
    };

    //Links
    for (var key in jsondata.hub) {
      if (jsondata.hub.hasOwnProperty(key)) {
	var val = jsondata.hub[key];
	var srcId = pods.indexOf(key);
        for (var i = 0; i < val.edges.length; i++) {
          var link = val.edges[i];
          var tarId = pods.indexOf(link);
          links.push({source: nodes[srcId], target: nodes[tarId]}); 	     
        };
      };
    };

    //console.log(nodes[0]);  	
  }; 

  function toJSON(nodes, links) {
  //creates a {hub} object based on graph data    
    var result = { hub: {} };     
    for ( var i = 0; i < links.length; i++ ) {
      var sourceName = links[i].source.name;
      if (!result.hub.hasOwnProperty(sourceName)) {
        result.hub[sourceName] = { edges: [], transforms: {} };
      }
      var targetName = links[i].target.name;
      result.hub[sourceName].edges.push(targetName);
    
      var targetNode;
      for (var j=0; j < nodes.length; j++ ) {
        if (nodes[j].name == targetName) { targetNode = nodes[j]; break; }	
      }
      result.hub[sourceName].transforms[targetName] = targetNode.transforms;
    }   
    return result;
  };
}
