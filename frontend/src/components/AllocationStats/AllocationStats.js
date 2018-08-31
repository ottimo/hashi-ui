import React, { Component } from "react"
import PropTypes from "prop-types"
import { Grid, Row, Col } from "react-flexbox-grid"
import { connect } from "react-redux"
import { green500, blue500, orange500, green200, blue200, orange200 } from "material-ui/styles/colors"
import { NOMAD_WATCH_ALLOC_STATS, NOMAD_UNWATCH_ALLOC_STATS } from "../../sagas/event"
import UtilizationAreaChart from "../UtilizationAreaChart/UtilizationAreaChart"

class StatsSet extends Component {
  render() {
    const CPUItems = [
      { name: "Used", stroke: green500, fill: green200 },
      { name: "System", stroke: blue500, fill: blue200 },
      { name: "User", stroke: orange500, fill: orange200 }
    ]
    const MemoryItems = [
      { name: "RSS", stroke: green500, fill: green200 },
      { name: "Cache", stroke: orange500, fill: orange200 },
      { name: "Swap", stroke: blue500, fill: blue200 }
    ]
    const data = this.props.data

    return (
      <Grid fluid style={{ padding: 0 }}>
        <h3>{this.props.title}</h3>
        <Row>
          <Col key="cpu-utilization-pane" xs={12} sm={12} md={12} lg={6}>
            <UtilizationAreaChart title="CPU usage (MHz)" data={data.cpu} allocated={true} items={CPUItems} />
          </Col>
          <Col key="memory-utilization-pane" xs={12} sm={12} md={12} lg={6}>
            <UtilizationAreaChart title="RAM usage (MB)" data={data.memory} allocated={true} items={MemoryItems} />
          </Col>
        </Row>
      </Grid>
    )
  }
}

class AllocStats extends Component {
  componentWillMount() {
    this.props.dispatch({
      type: NOMAD_WATCH_ALLOC_STATS,
      payload: {
        ID: this.props.allocation.ID
      }
    })
  }

  componentWillUnmount() {
    this.props.dispatch({
      type: NOMAD_UNWATCH_ALLOC_STATS,
      payload: {
        ID: this.props.allocation.ID
      }
    })
  }

  render() {
    const stats = this.props.allocStats
    if (!stats) {
      return <div>Loading ...</div>
    }

    let statsSets = [
      <StatsSet
        key="allocation"
        title="All tasks"
        data={stats.Global}
        allocatedCPU={this.props.allocation.Resources.CPU}
        allocatedMemory={this.props.allocation.Resources.MemoryMB}
      />
    ]

    Object.keys(stats.Task).map((key, index) =>
      statsSets.push(
        <StatsSet
          key={key}
          title={key}
          data={stats.Task[key]}
          allocatedCPU={this.props.allocation.TaskResources[key].CPU}
          allocatedMemory={this.props.allocation.TaskResources[key].MemoryMB}
        />
      )
    )

    return <div>{statsSets}</div>
  }
}

function mapStateToProps({ allocation, allocStats }) {
  return { allocation, allocStats: allocStats[allocation.ID] }
}

AllocStats.propTypes = {
  allocation: PropTypes.object.isRequired,
  allocStats: PropTypes.object,
  dispatch: PropTypes.func.isRequired
}

export default connect(mapStateToProps)(AllocStats)
