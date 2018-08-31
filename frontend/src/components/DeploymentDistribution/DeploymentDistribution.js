import React, { Component } from "react"
import PropTypes from "prop-types"
import ReactTooltip from "react-tooltip"
import AppendedReactTooltip from "../AppendedReactTooltip/AppendedReactTooltip"

const sumAggregate = (total, val) => total + val
const mapBy = (val, key) => {
  return val.map(next => next[key])
}

class DeploymentDistribution extends Component {
  constructor(props) {
    super(props)
    this.state = { active: null }
  }

  data() {
    const counter = {
      DesiredCanaries: 0,
      PlacedCanaries: 0,
      DesiredTotal: 0,
      PlacedAllocs: 0,
      HealthyAllocs: 0,
      UnhealthyAllocs: 0
    }

    const summary = this.props.deployment.TaskGroups

    Object.keys(summary).forEach(taskGroupID => {
      counter.DesiredCanaries += summary[taskGroupID].DesiredCanaries
      counter.PlacedCanaries += (summary[taskGroupID].PlacedCanaries || []).length
      counter.DesiredTotal += summary[taskGroupID].DesiredTotal
      counter.PlacedAllocs += summary[taskGroupID].PlacedAllocs
      counter.HealthyAllocs += summary[taskGroupID].HealthyAllocs
      counter.UnhealthyAllocs += summary[taskGroupID].UnhealthyAllocs
    })

    let sum = 0
    let data = []
    let progress = 0
    let remaining = 0

    switch (this.props.type) {
      case "canary":
        if (counter.DesiredCanaries == 0) {
          return null
        }

        sum = 100

        progress = counter.PlacedCanaries / counter.DesiredCanaries * 100
        remaining = 100 - progress

        if (progress > 100) {
          progress = 100
          remaining = 0
        } else if (progress < 0) {
          progress = 0
          remaining = 100
        } else if (Number.isNaN(progress)) {
          progress = 0
          remaining = 0
          sum = 0
        }

        data = [
          {
            label: "Placed",
            value: progress,
            className: "placed",
            tooltip: counter.PlacedCanaries + " (" + parseInt(progress) + "% complete)"
          },
          {
            label: "Desired",
            value: remaining,
            className: "desired",
            tooltip: counter.DesiredCanaries + " (" + parseInt(100 - progress) + "% remaining)"
          }
        ]
        break

      case "healthy":
        sum = counter.DesiredTotal

        data = [
          { label: "Healthy", value: counter.HealthyAllocs, className: "healthy" },
          { label: "Unhealthy", value: counter.UnhealthyAllocs, className: "failed" },
          { label: "Pending", value: sum - (counter.UnhealthyAllocs + counter.HealthyAllocs), className: "pending" }
        ]
        break

      case "total":
        sum = 100

        progress = counter.PlacedAllocs / counter.DesiredTotal * 100
        remaining = 100 - progress

        if (progress > 100) {
          progress = 100
          remaining = 0
        } else if (progress < 0) {
          progress = 0
          remaining = 100
        }

        data = [
          {
            label: "Placed",
            value: progress,
            className: "placed",
            tooltip: counter.PlacedAllocs + " (" + parseInt(progress) + "% complete)"
          },
          {
            label: "Desired",
            value: remaining,
            className: "desired",
            tooltip: counter.DesiredTotal + " (" + parseInt(100 - progress) + "% remaining)"
          }
        ]
        break

      default:
        throw "Unknown type: " + this.props.type
    }

    return data.map(({ label, value, className, tooltip }, index) => ({
      label,
      value,
      className,
      tooltip,
      percent: sum > 0 ? value / sum * 100 : 0,
      offset: mapBy(data.slice(0, index), "value").reduce(sumAggregate, 0) / sum * 100
    }))
  }

  render() {
    let data = this.data()
    if (data == null) {
      return null
    }

    let percentSum = 0
    let self = this
    let tt = ""

    if (this.state.active) {
      tt = (
        <AppendedReactTooltip
          id={`deployment-${this.props.type}-stats-${this.props.deployment.ID}`}
          className="chart tt"
          type="light"
        >
          <ol>
            {data.map(x => {
              return (
                <li key={x.label}>
                  <span className="label">
                    <span className={`color-swatch ${x.className}`} />
                    {x.label}
                  </span>
                  <span className="value">{x.tooltip || x.value}</span>
                </li>
              )
            })}
          </ol>
        </AppendedReactTooltip>
      )
    }

    return (
      <div>
        <div style={{ height: 20 }} className="chart distribution-bar">
          {tt}
          <svg data-tip data-for={`deployment-${this.props.type}-stats-${this.props.deployment.ID}`}>
            <g className="bars">
              {data.map(x => {
                let mouseenter = e => {
                  self.setState({ active: x.label })
                }
                let mouseleave = e => {
                  self.setState({ active: null })
                }

                let className = x.className

                if (self.state.active) {
                  className = className + (self.state.active == x.label ? " active" : " inactive")
                }

                let el = (
                  <rect
                    key={x.label}
                    width={x.percent + "%"}
                    height={20}
                    x={percentSum + "%"}
                    className={className}
                    onMouseEnter={mouseenter}
                    onMouseLeave={mouseleave}
                  />
                )

                percentSum += x.percent
                return el
              })}
            </g>
            <rect width="100%" height="100%" className="border" />
          </svg>
        </div>
      </div>
    )
  }
}

DeploymentDistribution.propTypes = {
  type: PropTypes.string.isRequired
}

export default DeploymentDistribution
