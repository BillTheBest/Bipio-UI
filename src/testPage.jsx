import React from 'react'
import { render } from 'react-dom'
import { Link } from 'react-router'
import { Button, ButtonGroup } from 'react-bootstrap'
import { Input } from 'react-bootstrap'
import config from './config.js'
import "./styles/main.less"

var Client = require('node-rest-client').Client
var client = new Client()

const Api = React.createClass ({  
  getInitialState(){
    return { tool: "",
	     output: "",
	     address: "" };
  },
  handleChangeAddress(e) {
    this.setState({ address: e.target.value });
  },
  handleChangeTool(e) {
    this.setState({ tool: e.target.value });
  },
  handleChangeOutput(e) {
    this.setState({ output: e.target.value });
  },
  sendRequest() {
    var countryPlhd;
    if (this.state.address) { countryPlhd = ""; }
    else { countryPlhd = "USA"; } 
    var requestMessage = { typeTool:this.state.tool, country:countryPlhd, params:"", iprange:this.state.address };
    console.log(requestMessage);
    var args = {
	data: requestMessage,
	headers: { "Content-Type": "application/json" }
    };
    var addr = config.bipAddress;
    client.post(addr, args, function (data, response) {	
	console.log(data);	
    });
  },
  render() {    
    return (
      	<div>
	<Link to="/">Вернуться к индексу</Link>
	<h1>Тестовое окружение</h1>	
  	    <label>Адрес</label>
            <Input
             type="text"
             value={this.state.address}
             placeholder="Адрес или диапазон"
             onChange={this.handleChangeAddress}	    
            />
	    <label>Инструмент</label>	    
            <Input
             type="text"
             value={this.state.tool}
             placeholder="masscan или paris-traceroute"
             onChange={this.handleChangeTool}	         
            />
	    <label>Вывод</label>	    
            <Input
             type="text"
             value={this.state.output}
             placeholder="sock или db"
             onChange={this.handleChangeOutput}	     
            />
            <Button bsStyle="primary" onClick={this.sendRequest}>Послать запрос</Button>
        </div>
    )
  }
})

module.exports = Api
