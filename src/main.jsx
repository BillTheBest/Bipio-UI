import React from 'react'
import { render } from 'react-dom'
import { Router, Route, Link, IndexRoute, browserHistory } from 'react-router'

import Api from './apiPage.jsx'
import graphPage from './graph/graphPage.jsx'
import testPage from './testPage.jsx'

import "./styles/main.less";

const App = React.createClass({
  render() {
    return (
      <div>
        <h1>Реестр Сервисов</h1>       
        {this.props.children}
      </div>
    )
  }
})

render((
  <Router>
    <Route path="/" component={App}>
      <IndexRoute component={Api} />
      <Route path="graph/:id" component={graphPage} />      
    </Route>
  </Router>
), document.body)


