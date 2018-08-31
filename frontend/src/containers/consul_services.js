import React, { Component } from "react"
import PropTypes from "prop-types"
import { connect } from "react-redux"
import { withRouter } from "react-router"
import { List, ListItem } from "material-ui/List"
import { Card, CardHeader, CardText } from "material-ui/Card"
import { Grid, Row, Col } from "react-flexbox-grid"
import FontIcon from "material-ui/FontIcon"
import Subheader from "material-ui/Subheader"
import Paper from "material-ui/Paper"
import RaisedButton from "material-ui/RaisedButton"
import TextField from "material-ui/TextField"
import Checkbox from "material-ui/Checkbox"
import { red500, green500, orange500, grey200 } from "material-ui/styles/colors"
import {
  CONSUL_WATCH_SERVICES,
  CONSUL_UNWATCH_SERVICES,
  CONSUL_WATCH_SERVICE,
  CONSUL_UNWATCH_SERVICE,
  CONSUL_DEREGISTER_SERVICE_CHECK,
  CONSUL_DEREGISTER_SERVICE
} from "../sagas/event"

class ConsulServices extends Component {
  constructor(props) {
    super(props)
    this.state = {}
    this._onClickService = this.monitorService.bind(this)
  }

  componentDidMount() {
    this.props.dispatch({ type: CONSUL_WATCH_SERVICES })

    if (this.props.routeParams.name) {
      this.props.dispatch({
        type: CONSUL_WATCH_SERVICE,
        payload: this.props.routeParams.name
      })
    }
  }

  componentWillUnmount() {
    this.props.dispatch({ type: CONSUL_UNWATCH_SERVICES })

    if (this.props.routeParams.name) {
      this.props.dispatch({
        type: CONSUL_UNWATCH_SERVICE,
        payload: this.props.routeParams.name
      })
    }
  }

  componentDidUpdate(prevProps) {
    if (!this.props.routeParams.name) {
      if (prevProps.routeParams.name) {
        this.props.dispatch({
          type: CONSUL_UNWATCH_SERVICE,
          payload: prevProps.routeParams.name
        })
      }
      return
    }

    if (prevProps.routeParams.name == this.props.routeParams.name) {
      return
    }

    if (prevProps.routeParams.name) {
      this.props.dispatch({
        type: CONSUL_UNWATCH_SERVICE,
        payload: prevProps.routeParams.name
      })
    }

    this.props.dispatch({
      type: CONSUL_WATCH_SERVICE,
      payload: this.props.routeParams.name
    })
  }

  monitorService(name) {
    window.scrollTo(0, document.getElementById("value-pane").offsetTop)
    this.props.router.push({
      pathname: `/consul/${this.props.router.params.region}/services/${name}`
    })
  }

  getConsulService() {
    return this.props.consulService
  }

  deregisterServiceCheck(nodeAddress, checkID) {
    this.props.dispatch({
      type: CONSUL_DEREGISTER_SERVICE_CHECK,
      payload: { nodeAddress, checkID }
    })
  }

  deregisterService(nodeAddress, serviceID) {
    this.props.dispatch({
      type: CONSUL_DEREGISTER_SERVICE,
      payload: { nodeAddress, serviceID }
    })
  }

  filteredServices() {
    let services = this.props.consulServices

    if ("service_name" in this.state) {
      services = services.filter(service => service.Name.indexOf(this.state.service_name) != -1)
    }

    if ("passing" in this.state && this.state.passing) {
      services = services.filter(service => service.ChecksPassing > 0)
    }

    if ("warning" in this.state && this.state.warning) {
      services = services.filter(service => service.ChecksWarning > 0)
    }

    if ("critical" in this.state && this.state.critical) {
      services = services.filter(service => service.ChecksCritical > 0)
    }

    return services
  }

  render() {
    let listStyle = {}

    if (window.innerWidth < 1024) {
      listStyle = { maxHeight: 200, overflow: "scroll" }
    }

    return (
      <Grid fluid style={{ padding: 0 }}>
        <Row>
          <Col key="navigation-pane" xs={12} sm={12} md={4} lg={4}>
            <Subheader>Available Services</Subheader>
            <Card>
              <CardHeader title="Filter list" actAsExpander showExpandableButton />
              <CardText style={{ paddingTop: 0 }} expandable>
                <TextField
                  hintText="Service name"
                  value={this.state.service_name}
                  onChange={(proxy, value) => {
                    this.setState({ service_name: value })
                  }}
                />
                <Checkbox
                  label="Checks passing"
                  onCheck={(proxy, checked) => {
                    this.setState({ passing: checked })
                  }}
                />
                <Checkbox
                  label="Checks warning"
                  onCheck={(proxy, checked) => {
                    this.setState({ warning: checked })
                  }}
                />
                <Checkbox
                  label="Checks critical"
                  onCheck={(proxy, checked) => {
                    this.setState({ critical: checked })
                  }}
                />
              </CardText>
            </Card>
            <Paper>
              <List style={listStyle}>
                {this.filteredServices().map(service => {
                  let icon = undefined

                  if (service.ChecksCritical) {
                    icon = (
                      <FontIcon color={red500} className="material-icons">
                        error
                      </FontIcon>
                    )
                  } else if (service.ChecksWarning) {
                    icon = (
                      <FontIcon color={orange500} className="material-icons">
                        warning
                      </FontIcon>
                    )
                  } else {
                    icon = (
                      <FontIcon color={green500} className="material-icons">
                        check
                      </FontIcon>
                    )
                  }

                  let secondaryText = `Passing: ${service.ChecksPassing}`
                  secondaryText += ` / Warning: ${service.ChecksWarning}`
                  secondaryText += ` / Critical: ${service.ChecksCritical}`
                  secondaryText += ` @ ${new Set(service.Nodes).size} nodes`

                  const style = this.props.routeParams.name == service.Name ? { backgroundColor: grey200 } : {}

                  return (
                    <ListItem
                      key={service.Name}
                      onClick={() => this._onClickService(service.Name)}
                      primaryText={service.Name}
                      secondaryText={secondaryText}
                      leftIcon={icon}
                      style={style}
                    />
                  )
                })}
              </List>
            </Paper>
          </Col>
          <Col id="value-pane" key="value-pane" xs={12} sm={12} md={8} lg={8}>
            <Subheader>
              {this.props.routeParams.name ? `Service: ${this.props.routeParams.name}` : "Please select a service"}
            </Subheader>

            {this.getConsulService().map((entry, index) => {
              const counters = {
                passing: 0,
                warning: 0,
                critical: 0
              }

              const checks = entry.Checks.map(check => {
                counters[check.Status]++

                let icon = undefined

                if (check.Status === "critical") {
                  icon = (
                    <FontIcon color={red500} className="material-icons">
                      error
                    </FontIcon>
                  )
                } else if (check.Status === "warning") {
                  icon = (
                    <FontIcon color={orange500} className="material-icons">
                      warning
                    </FontIcon>
                  )
                } else {
                  icon = (
                    <FontIcon color={green500} className="material-icons">
                      check
                    </FontIcon>
                  )
                }

                return (
                  <Card key={`${check.Name}-${check.CheckID}-${check.Status}`}>
                    <CardHeader
                      title={`${check.Name} ${check.Notes ? " | " + check.Notes : ""}`}
                      avatar={icon}
                      actAsExpander
                      showExpandableButton
                    />
                    <CardText expandable>
                      <strong>CheckID:</strong>
                      <br />
                      <div className="content-file small">
                        {check.CheckID}
                      </div>

                      <br />

                      <strong>Output:</strong>
                      <br />
                      <div className="content-file small">
                        {check.Output ? check.Output.trim() : "- no output -"}
                      </div>

                      <br />

                      <RaisedButton
                        label="Deregister"
                        labelColor="#fff"
                        backgroundColor={red500}
                        style={{ marginRight: 12 }}
                        onClick={() => {
                          this.deregisterServiceCheck(entry.Node.Address, check.CheckID)
                        }}
                      />
                    </CardText>
                  </Card>
                )
              })

              let secondaryText = `Passing: ${counters.passing}`
              secondaryText += ` / Warning: ${counters.warning}`
              secondaryText += ` / Critical: ${counters.critical}`

              if (entry.Service.Port) {
                secondaryText += ` | Port: ${entry.Service.Port}`
              }

              if (entry.Service.Tags && entry.Service.Tags.length > 0) {
                secondaryText += ` | Tags: ${entry.Service.Tags.join(", ")}`
              }

              return (
                <Card key={`${entry.Node.Node} - ${entry.Service.ID}`} style={{ marginTop: index > 0 ? "1em" : 0 }}>
                  <CardHeader title={`${entry.Node.Node} - ${entry.Service.ID}`} subtitle={secondaryText} />
                  <div style={{ float: "right", marginTop: -60 }}>
                    <RaisedButton
                      label="Deregister"
                      labelColor="#fff"
                      backgroundColor={red500}
                      style={{ marginRight: 12 }}
                      onClick={() => {
                        this.deregisterService(entry.Node.Address, entry.Service.ID)
                      }}
                    />
                  </div>
                  <CardText>
                    {checks}
                  </CardText>
                </Card>
              )
            })}
          </Col>
        </Row>
      </Grid>
    )
  }
}

function mapStateToProps({ consulServices, consulService }) {
  return { consulServices, consulService }
}

ConsulServices.defaultProps = {
  consulServices: [],
  consulService: []
}

ConsulServices.propTypes = {
  dispatch: PropTypes.func.isRequired,
  consulServices: PropTypes.array.isRequired,
  consulService: PropTypes.array.isRequired,
  router: PropTypes.object.isRequired,
  routeParams: PropTypes.object.isRequired
}

export default connect(mapStateToProps)(withRouter(ConsulServices))
