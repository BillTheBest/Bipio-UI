import React from 'react'
import { render } from 'react-dom'
import { Link } from 'react-router'
import { Button, ButtonGroup } from 'react-bootstrap'
import config from './config.js'
import "./styles/main.less"

var Client = require('node-rest-client').Client

var options_auth = { user: config.username, password: config.token }
var client = new Client(options_auth)

const Api = React.createClass ({
  getInitialState() {
    return {output: "Загрузка..."};
  },
  componentDidMount() {
    this.updateMenu();    
  },
  runGraph(name){
    var addr = config.bipAddress + name;    
    client.get(addr,function (data, response) {
      console.log(data);     
    }.bind(this)); 
  },
  deleteGraph(id){
    var addr = config.bipioAddress + "/rest/bip/" + id;    
    client.delete(addr,function (data, response) {
      console.log(data);   
      this.updateMenu();  
    }.bind(this)); 
  },
  updateMenu(){
    var addr = config.bipioAddress + "/rest/bip"
    client.get(addr, function (data, response) {
	//console.log(data);
	var jsondata = data; 
	if(jsondata.total == 0) this.setState({output: <Link to="/graph/new"><Button bsStyle="primary">Создать задачу</Button></Link>});
	else this.setState({output: 
         <div>
	  <Link to="/graph/new"><Button bsStyle="primary">Создать новую задачу</Button></Link>
	  <hr/>
	  <h3>Сохраненные задачи:</h3>
          <ul> 
            {jsondata.data.map((bip, index) => (
	      <li key={index}>
		<Link to={`/graph/${bip.id}`}>{bip.note}</Link>
		<Button bsStyle="primary" onClick={this.runGraph.bind(this, bip.name)}>Запустить</Button>
                <Button bsStyle="danger" onClick={this.deleteGraph.bind(this, bip.id)}>Удалить</Button>
	      </li>
	    ))}
	  </ul>		
	 </div>
	});       	
    }.bind(this));
  },
  render() {    
    return (
      	<div>
	{this.state.output}
        </div>
    )
  }
})

module.exports = Api
