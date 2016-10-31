import React from 'react'
import { render } from 'react-dom'
import { Link } from 'react-router'
//import styles from '../styles/graph-creator.css'
import styles from '../styles/index.css'
import "../styles/main.less";

import config from '../config.js'

import { Button, ButtonGroup, ButtonToolbar } from 'react-bootstrap';
import { Modal } from 'react-bootstrap';
import { Input } from 'react-bootstrap';
import { ProgressBar } from 'react-bootstrap';
import Calendar from 'react-input-calendar';

import { createGraph, createNode, setIconAddr, saveNode, 
         getGraph, getSource, deleteNode, keyboardSwitch } from './graph.jsx'
import { publish, subscribe, unsubscribe } from '../eventSystem.js'
import { randomString, addEscapeChars } from '../util.js'

var moment = require('moment')
moment.locale('ru')

var Client = require('node-rest-client').Client
var options_auth = { user: config.username, password: config.token }
var client = new Client(options_auth)

var bipData, podData, channelData, bipProperties;

const graphPage = React.createClass ({    
  getInitialState(){
    return { showNodeCreationModal: false,
	     showNodePropsModal: false,
	     showBipPropsModal: false,
	     showProgressModal: false,
	     progress: 0,
	     loadingMsg: <h3><p>Загрузка...</p></h3>,
             chosenPod: "",
	     chosenSource: "",
             newBip: false,
             selectSource: false};
  },
  render() {  
    var btnTitle, modTitle;
    if (this.state.selectSource) { btnTitle = "Выбрать источник"; modTitle = "Выбрать источник"; }
    else { btnTitle = "Выбрать действие"; modTitle = "Добавить действие"; }  
    return (
      <div>
	<Link to="/">Вернуться к индексу</Link>	        
	<hr/>
	<h2>Редактор задачи</h2>	
	<ButtonToolbar>
	  <Button bsStyle="primary" onClick={this.openNode}>{btnTitle}</Button>
	  <Button bsStyle="primary" onClick={this.saveGraph}>Сохранить задачу</Button>
	  <Button bsStyle="primary" disabled={this.state.newBip} onClick={this.runGraph}>Протестировать задачу</Button>
	  <Button bsStyle="primary" onClick={this.openBipProps}>Свойства задачи</Button>
	</ButtonToolbar>
	{this.state.loadingMsg}
	
	<Modal show={this.state.showNodeCreationModal} onHide={this.close}>
          <Modal.Header closeButton>
            <Modal.Title className="modalText">{modTitle}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <NodeWindow selectSource={this.state.selectSource}/>
	   </Modal.Body>          
        </Modal>

	<Modal show={this.state.showNodePropsModal} onHide={this.close}>
          <Modal.Header closeButton>
            <Modal.Title className="modalText">Свойства действия</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <PropsWindow pod={this.state.chosenPod} source={this.state.chosenSource}/>
	   </Modal.Body>          
        </Modal>

	<Modal show={this.state.showBipPropsModal} onHide={this.close}>
          <Modal.Header closeButton>
            <Modal.Title className="modalText">Свойства задачи</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <BipPropsWindow/>
	   </Modal.Body>          
        </Modal>

        <Modal show={this.state.showProgressModal} onHide={this.close}>
          <Modal.Header>
            <Modal.Title className="modalText">Выполнение задачи</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <ProgressBar active now={this.state.progress} label={`${this.state.progress}%`} />  
	  </Modal.Body>          
        </Modal>

        <div ref="graph">
        </div>
        
      </div>
    )
  },  
  componentDidMount() { 
    //console.log(this.props.params.id);
    subscribe('openProps', this.openProps);
    subscribe('closeModal', this.close);  
    subscribe('setSelectSource', this.setSelectSource);   
    bipProperties = {};
    var addr = config.bipioAddress + "/rpc/describe/pod";
    client.get(addr, function (data, response){  
      podData = data;
      //Extract icon address
      for (var key in podData) {
	if (podData.hasOwnProperty(key)) {
	  var val = podData[key];
	  var str = val.icon;
	  var pos = str.lastIndexOf("/");
	  var iconAddr = str.substring(0,pos + 1);
	  setIconAddr(iconAddr);
	  //console.log(iconAddr);
	  break;	
	}
      } 
      if (this.props.params.id == "new") { 
	this.setState({newBip: true, selectSource: true, loadingMsg: ""}); 	
        bipData = "";
        channelData = "";	
        var dom =  this.refs.graph.getDOMNode();
        createGraph(dom, bipData, channelData);    
      }       
      else {
        addr = config.bipioAddress + "/rest/bip/" + this.props.params.id;
        client.get(addr, function (data, response){	
	  bipData = data;
	  if (bipData.hasOwnProperty("note")) { bipProperties.nameRus = bipData.note; }
	  //if (bipData.hasOwnProperty("schedule")) { bipProperties.schedule.frequency = 
	  //bipData.schedule.sched.rrule.freq; }
	  console.log(bipProperties);	 	    
	  if (bipData.config.channel_id) { 	   
	    addr = config.bipioAddress + "/rest/channel/" + bipData.config.channel_id;
            client.get(addr, function (data, response){			
	      channelData = data;
              //console.log(channelData);	
              var dom =  this.refs.graph.getDOMNode();
              createGraph(dom, bipData, channelData);  	
            }.bind(this));		
	  }
	  else {
	    //console.log("test");
	    channelData = {action: bipData.type};
	    var dom =  this.refs.graph.getDOMNode();
            createGraph(dom, bipData, channelData); 
	  } 
	  this.setState({loadingMsg: ""});            
        }.bind(this)); 
      }
    }.bind(this));     
  },
  shouldComponentUpdate() {
  //TODO: figure out component updates  
  return true;  
  },
  componentWillUnmount() {
    unsubscribe('openProps', this.openProps);
    unsubscribe('closeModal', this.close);
    unsubscribe('setSelectSource', this.setSelectSource);     
  },
  close(){
    this.setState({ showNodeCreationModal: false,
		    showNodePropsModal: false,
		    showBipPropsModal: false,
		    showProgressModal: false });
    keyboardSwitch(true);
  },
  openProps(pod, source) {
    this.setState({ showNodePropsModal: true, chosenPod: pod, chosenSource: source });
    keyboardSwitch(false);        
  },
  openNode(){    
    this.setState({ showNodeCreationModal: true }); 
    keyboardSwitch(false);   
  },
  openBipProps(){    
    this.setState({ showBipPropsModal: true }); 
    keyboardSwitch(false);   
  },
  setSelectSource(state) {
    this.setState({ selectSource: state });
  },
  runGraph(){
    if (bipData && bipData.type == "http") {
      var addr = config.bipioAddress + "/bip/http/" + bipData.name;    
      client.get(addr,function (data, response) {
        console.log(data);     
      }.bind(this)); 
      this.setState({ showProgressModal: true }); 
      keyboardSwitch(false);
    
      var ws = new WebSocket('ws://192.168.100.137:3000');    
        
      ws.onerror = function() {
        console.log('Connection Error');
      };
 
      ws.onopen = function() {
        console.log('WebSocket Client Connected');
                       
        var event_subscription = {"event": "subscribe", "data": "bipProgress"};
        ws.send(JSON.stringify(event_subscription)); 
        console.log(JSON.stringify(event_subscription));           
      };

      ws.onmessage = function(e) {      
        console.log("Received: '" + e.data + "'");           
        var msg = JSON.parse(e.data);
        var prog = Math.round(msg.data.state);
        this.setState({progress: prog});
        if (prog == 100) { 
	  ws.close; 
	  this.setState({ showProgressModal: false,
			  progress: 0 });	
        }
      }.bind(this);
 
      ws.onclose = function() {
        console.log('Client Closed');
        ws.close();
      };
    } 
    else {
      var addr = config.bipioAddress + "/rpc/bip/trigger/" + bipData.id;    
      client.get(addr,function (data, response) {
        console.log(data);     
      }.bind(this)); 
    }
  },
  saveGraph(){
    if (this.state.newBip) {      
      var source = getSource();
      if (source.action == "http") {
	//POST http graph

	//generate random bip name - old way, used if no name is set explicitly
	var name = randomString(6);
        if (!bipProperties.nameRus) { bipProperties.nameRus = name; }
	
	var graph = getGraph();
        //graph.hub = addEscapeChars(graph.hub);       	
	
        jsondata = { type: "http", config: { password: "", username: "", auth: "none" }, 
                     hub: graph.hub, icon: null, paused: false,
                     name: name, note: bipProperties.nameRus, domain_id: config.vanityDomain, end_life: { "action": "pause", "time": "+1y", "imp": 1000 }, schedule: { startDateTime:"2016-01-26T14:50-05:00", timeZone: { name: "Europe/Moscow", offset: "+03:00" },
	            recurrencePattern: "FREQ=MINUTELY;INTERVAL=15;", sched: { dtstart: {
                    zoneless: "2016-01-26T14:50", locale: "+03:00", utc: "2016-01-26T14:50+0300" },
                    rrule: { freq: "minutely", interval: "15" } }, nextTimeToRun: 1456506300000 } };
	console.log(jsondata);
	addr = config.bipioAddress + "/rest/bip";
	args = {
          data: jsondata,
          headers: { "Content-Type": "application/json" }
        }
	client.post(addr, args, function (data, response) {
          console.log(data); 
	  bipData = data;
          this.setState({ newBip: false });
        }.bind(this)); 
      }
      else {
        //POST source
        var jsondata = { name: channelName, action: source.action, config: source.config.config };
        console.log(jsondata);
        var addr = config.bipioAddress + "/rest/channel";
        var args = {
          data: jsondata,
          headers: { "Content-Type": "application/json" }
        }  
        client.post(addr, args, function (data, response) 
        { 
	  console.log(data); 
	  channelData = data;
          //POST graph
          //generate random bip name - old way, used if no name is set explicitly
          var name = randomString(6);
          if (!bipProperties.nameRus) { bipProperties.nameRus = name; }
	  var frequency = 15;		
	  //if (bipProperties.schedule.frequency) { frequency = bipProperties.schedule.frequency; }
	  var recurrencePattern = "FREQ=MINUTELY;INTERVAL=15;";
 
          var graph = getGraph();
	  //graph.hub = addEscapeChars(graph.hub);
          jsondata = { domain_id: "", type: "trigger", config: { channel_id: channelData.id, 
		     config:source.config.config }, hub: graph.hub, icon: null, 
		     paused: false, name: channelName, note: bipProperties.nameRus, "end_life": { "action": "pause", 
		     "time": "+1y", "imp": 1000 }, "schedule": { "startDateTime":"2016-01-26T14:50+03:00", 
		     "timeZone": { "name": "Europe/Moscow", "offset": "+03:00" },
	             "recurrencePattern": recurrencePattern, "sched": { "dtstart": {
                     "zoneless": "2016-01-26T14:50", "locale": "+03:00", "utc": "2016-01-26T14:50+0300" },
                     "rrule": { "freq": "minutely", "interval": frequency } }, "nextTimeToRun": 1456506300000 } }; 
	  console.log(jsondata);
	  addr = config.bipioAddress + "/rest/bip";
	  args = {
            data: jsondata,
            headers: { "Content-Type": "application/json" }
          }
	  client.post(addr, args, function (data, response) {
            console.log(data); 
	    bipData = data;
            this.setState({ newBip: false });
          }.bind(this));
        }.bind(this));
      }
    }
    else {
      //PATCH source
      var source = getSource();
      //channelData.config = source.config.config;
      //console.log(channelData);
      var addr = config.bipioAddress + "/rest/channel/" + bipData.config.channel_id;
      var args = {
        data: channelData,
        headers: { "Content-Type": "application/json" }
      }
      //client.patch(addr, args, function (data, response) { console.log(data); });
      //PATCH graph
      var graph = getGraph();
      bipData.hub = graph.hub;
      bipData.config = source.config;
      if (bipProperties.nameRus) 
        { bipData.note = bipProperties.nameRus; }
      else 
        { bipData.note = bipData.name; }
      var recurrencePattern = "FREQ=MINUTELY;INTERVAL=15;";
      //bipData.schedule.sched.rrule.interval = bipProperties.schedule.frequency;
      //bipData.schedule.recurrencePattern = recurrencePattern;
      //console.log(bipData);   
      addr = config.bipioAddress + "/rest/bip/" + this.props.params.id;
      args.data = bipData; 
      client.patch(addr, args, function (data, response) { console.log(data); });
    }
  }
})

var NodeWindow = React.createClass ({
  getDefaultProps(){
    return { selectSource: false };
  },
  getInitialState(){
    return { showSelectPage: true,             
             podList: "",
             actionList: "" };
  },
  render() {       
    return (
      <div className="modalText">      
        <form id="selectPage" hidden={!this.state.showSelectPage}>          
	  <ButtonGroup vertical>        
           {this.state.podList}
	  </ButtonGroup>
        </form>
        <form id="actionPage" hidden={this.state.showSelectPage}>
          <h4>Выберите действие</h4>
          <Button bsStyle="link" onClick={() => {this.goBack()}}>&larr; Назад</Button>
          <br /><ButtonGroup vertical>           
           {this.state.actionList}          
	  </ButtonGroup>
        </form>
        <Button bsStyle="primary" onClick={() => {this.close()}}>Закрыть</Button>
      </div>
  )},
  componentDidMount() {
    var podList = [],
	triggerType = (this.props.selectSource) ? "poll" : "invoke";        
    if (triggerType == "poll") { podList.push(<Button key="http" bsStyle="link" onClick={this.newNode.bind(this, "http")}>Http</Button>) } 
    for (var key in podData) {
      	      if (podData.hasOwnProperty(key)) {
		var val = podData[key],
                    boundClick = this.selectPod.bind(this, val);
		for (var key in val.actions) {
		    if ((val.actions.hasOwnProperty(key)) && (val.actions[key].trigger == triggerType)) {
                        podList.push(<Button key={val.name} bsStyle="link" onClick={boundClick}>{val.title}</Button>);	
			break;
		    }
		}	
	      }
            };
    this.setState({ podList: podList });    
  },   
  newNode(action){        
    //console.log(action);
    createNode(action, this.props.selectSource);
    if (this.props.selectSource) { publish('setSelectSource', false) }
    publish('closeModal');
  }, 
  selectPod(pod){
    this.setState({ showSelectPage: false }); 
    var actionList = [],
	triggerType = (this.props.selectSource) ? "poll" : "invoke";
	
    //console.log(pod);
    for (var key in pod.actions) {
      	      if ((pod.actions.hasOwnProperty(key)) && (pod.actions[key].trigger == triggerType)) {
		var val = pod.actions[key],  
	            selectAction = pod.name + "." + val.name,              
		    boundClick = this.newNode.bind(this, selectAction);
                actionList.push(<Button key={val.name} bsStyle="link" onClick={boundClick}>{val.title}</Button>);
	      }
            }; 
    this.setState({ actionList: actionList });                 
  },
  goBack(pod){
    this.setState({ showSelectPage: true,           
        	    actionList: "" });             
  },
  close(){
    publish('closeModal');
  }
})

var PropsWindow = React.createClass ({
  getDefaultProps(){
    return { pod: "",
	     source: "" };
  },
  getInitialState(){
    return { importValues: {},
	     propsList: [],
	     podTitle: "",
	     hideDeleteButton: true};
  },
  render() {       
    var propsForm = this.state.propsList.map(function (prop) {
	var boundChange = this.handleChange.bind(this, prop.value);	
	return (
	  <Input type="text" value={this.state.importValues[prop.value]} label={prop.label} placeholder={prop.placeholder} 
	                        key={prop.value} onChange={boundChange} ref={prop.value} />
	);
    }, this);
    return (
      <div className="modalText">
        <form>
          <h4>{this.state.podTitle}</h4>
	  <ButtonGroup vertical> 	         
           {propsForm}
	   <Button onClick={() => {this.saveNode()}}>Сохранить свойства</Button>
	  </ButtonGroup>
        </form>
        <Button bsStyle="primary" onClick={() => {this.close()}}>Закрыть</Button>
        <Button bsStyle="danger" disabled={this.state.hideDeleteButton} onClick={() => {this.deleteNode()}}>Удалить действие</Button>
      </div>
  )}, 
  componentDidMount() {  
    var tmp, sourceName, sourceAction,
	pos, podName,
        secondPos, actionName,
        chosenAction, podDescription,
	sourceDescription, sourceChosenAction;
    //console.log(this.props.pod);
    //extract pod description and action. If pod is source - extract channel.
    if (this.props.pod.name == "source") {
        pos = this.props.pod.action.indexOf(".");
        podName = this.props.pod.action.substring(0, pos);        
        actionName = this.props.pod.action.substring(pos + 1);
    }
    else {    
        pos = this.props.pod.name.indexOf(".");
        podName = this.props.pod.name.substring(0, pos);
        secondPos = this.props.pod.name.lastIndexOf(".");
        actionName = this.props.pod.name.substring(pos + 1, secondPos);
	this.setState({ hideDeleteButton: false });
    }
        
    for (var key in podData) {
      	      if (podData.hasOwnProperty(key)) {
		var val = podData[key];                    
		if (val.name == podName) { podDescription = val; break; }
	      }
            };
    this.setState({ podTitle: podDescription.title });    
    for (var key in podDescription.actions) {
      	      if (podDescription.actions.hasOwnProperty(key)) {
		var val = podDescription.actions[key];	        		                    
		if (val.name == actionName) { chosenAction = val; break; }
	      }
            };    
    //this.setState({ chosenAction: tmp });    
    //console.log(chosenAction); 

    //Extract source pod
    if (this.props.source) {
      if (this.props.source.name == "source") {
        pos = this.props.source.action.indexOf(".");
        sourceName = this.props.source.action.substring(0, pos);        
        sourceAction = this.props.source.action.substring(pos + 1);
      }
      else {    
        pos = this.props.source.name.indexOf(".");
        sourceName = this.props.source.name.substring(0, pos);
        secondPos = this.props.source.name.lastIndexOf(".");
        sourceAction = this.props.source.name.substring(pos + 1, secondPos);
      }   

      for (var key in podData) {
      	      if (podData.hasOwnProperty(key)) {
		var val = podData[key];                    
		if (val.name == sourceName) { sourceDescription = val; break; }
	      }
            };
      //this.setState({ sourceDescription: tmp });
    
      for (var key in podDescription.actions) {
      	      if (podDescription.actions.hasOwnProperty(key)) {
		var val = podDescription.actions[key];	        		                    
		if (val.name == sourceAction) { sourceChosenAction = val; break; }
	      }
            };    
      //this.setState({ sourceAction: tmp });       
    }
    
    //Create form
    var propsList = [],
	importValue = {},
	disposition = [];
    var podTransforms;
    if (this.props.pod.name == "source") { podTransforms = this.props.pod.config.config; }
    else { podTransforms = this.props.pod.transforms; }

    for (var i=0; i < chosenAction.imports.disposition.length; i++) { 
	disposition[i] = chosenAction.imports.disposition[i];
	var val = disposition[i];	
	importValue[val] = "";		
    }
    //this.setState({ importValues: importValue });
    //console.log(this.state.importValues[val]);
    
    for (var i=0; i < disposition.length; i++) {
	var val = disposition[i];
	if (chosenAction.imports.properties.hasOwnProperty(val)) {
          var importVal = chosenAction.imports.properties[val],
	      desc = ""; 	

 	  if(podTransforms.hasOwnProperty(val)) {
	    importValue[val] = podTransforms[val];
	  }    
          //this.setState({ importValues: importValue });       
          //console.log(this.state.importValues[val]);
	  
          if (importVal.hasOwnProperty("description")) {desc = importVal.description;}
	  propsList.push({ value: val, label: importVal.title, placeholder: desc });
          //console.log(propsList[i]);
	}
    } 
   
    this.setState({ propsList: propsList, importValues: importValue });    
  }, 
  saveNode(){    
    //console.log(this.props.pod.name, this.state.importValues); 
    saveNode(this.props.pod.name, this.state.importValues);   
    publish('closeModal');	    
  },
  deleteNode(){
    deleteNode(this.props.pod);
    publish('closeModal');
  },  
  handleChange(name) {
    var importValues = this.state.importValues;	
    importValues[name] = this.refs[name].getValue();       
    this.setState({ importValues: importValues });
    //console.log(this.state.importValues, name);
  },
  close(){
    publish('closeModal');
  }
})

var BipPropsWindow = React.createClass ({
  getInitialState(){
    var now = moment();
    return { name: "",
	     date: now,
	     frequency: ""};
  },    
  render() {       
    return (
      <div className="modalText">                     
	<ButtonGroup vertical>
	  <Input type="text" value={this.state.name} label="Название" onChange={this.changeName}  />
	  //Edit index.js in react-input-calendar to translate the "Today" button
	  <Calendar format="DD.MM.YYYY" date={this.state.date} onChange={this.changeDate} />
	  <Input type="text" value={this.state.frequency} label="Период повторения, минут" onChange={this.changeFrequency}  />
	  <Button onClick={() => {this.save()}}>Сохранить</Button>          
          <Button bsStyle="primary" onClick={() => {this.close()}}>Закрыть</Button>
	</ButtonGroup>
      </div>
  )},
  componentDidMount() {   
    this.setState({ name: bipProperties.nameRus });    
  },      
  changeName(event){
    this.setState({ name: event.target.value });
    //console.log(this.state.name);
  },
  changeDate(date){
    this.setState({ date: date });
    console.log(this.state.date);
  },
  changeFrequency(event){
    this.setState({ frequency: event.target.value });
    //console.log(this.state.name);
  },
  save(){
    if (this.state.name) { bipProperties.nameRus = this.state.name; }
    //if (this.state.frequency) { bipProperties.schedule.frequency = this.state.frequency; }
    publish('closeModal');
  },
  close(){
    publish('closeModal');
  }
})

module.exports = graphPage 
