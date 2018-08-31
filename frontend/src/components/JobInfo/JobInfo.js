import React, { Component } from "react"
import PropTypes from "prop-types"
import { connect } from "react-redux"
import { Grid, Row, Col } from "react-flexbox-grid"
import { Card, CardTitle, CardText } from "material-ui/Card"
import JobLink from "../JobLink/JobLink"
import TableHelper from "../TableHelper/TableHelper"
import MetaPayload from "../MetaPayload/MetaPayload"
import ConstraintTable from "../ConstraintTable/ConstraintTable"
import JobTaskGroupActionScale from "../JobTaskGroupActionScale/JobTaskGroupActionScale"
import JobTaskGroupActionStop from "../JobTaskGroupActionStop/JobTaskGroupActionStop"
import { TableRow, TableRowColumn } from "../Table"

const jobProps = ["ID", "Name", "Type", "Region", "Datacenters", "Status", "Priority"]

class JobInfo extends Component {
  render() {
    if (this.props.job.ID == null) {
      return <div>Loading job ...</div>
    }

    const tasks = []
    const job = this.props.job
    const jobMetaBag = job.Meta || {}

    // Build the task groups table
    const taskGroups = job.TaskGroups.map(taskGroup => {
      taskGroup.Tasks.map(task => {
        tasks.push(
          <TableRow key={task.ID}>
            <TableRowColumn>
              <JobLink jobId={job.ID} taskGroupId={taskGroup.ID}>
                {taskGroup.Name}
              </JobLink>
            </TableRowColumn>
            <TableRowColumn>
              <JobLink jobId={job.ID} taskGroupId={taskGroup.ID} taskId={task.ID}>
                {task.Name}
              </JobLink>
            </TableRowColumn>
            <TableRowColumn>
              {task.Driver}
            </TableRowColumn>
            <TableRowColumn>
              {task.Resources.CPU}
            </TableRowColumn>
            <TableRowColumn>
              {task.Resources.MemoryMB}
            </TableRowColumn>
            <TableRowColumn>
              {task.Resources.DiskMB}
            </TableRowColumn>
            <TableRowColumn>
              <ConstraintTable idPrefix={task.ID} asTooltip constraints={task.Constraints} />
            </TableRowColumn>
          </TableRow>
        )
      })

      const taskGroupMeta = taskGroup.Meta || {}
      return (
        <TableRow key={taskGroup.ID}>
          <TableRowColumn>
            <JobLink jobId={job.ID} taskGroupId={taskGroup.ID}>
              {taskGroup.Name}
            </JobLink>
          </TableRowColumn>
          <TableRowColumn>
            {taskGroup.Count}
          </TableRowColumn>
          <TableRowColumn>
            {taskGroup.Tasks.length}
          </TableRowColumn>
          <TableRowColumn>
            <MetaPayload asTooltip metaBag={taskGroupMeta} identifier={taskGroup.ID} />
          </TableRowColumn>
          <TableRowColumn>
            {taskGroup.RestartPolicy.Mode}
          </TableRowColumn>
          <TableRowColumn>
            <ConstraintTable idPrefix={taskGroup.ID} asTooltip constraints={taskGroup.Constraints} />
          </TableRowColumn>
          <TableRowColumn>
            <JobTaskGroupActionScale job={job} taskGroup={taskGroup} />
            <JobTaskGroupActionStop job={job} taskGroup={taskGroup} />
          </TableRowColumn>
        </TableRow>
      )
    })

    return (
      <Grid fluid style={{ padding: 0 }}>
        <Row>
          <Col key="properties-pane" xs={12} sm={12} md={6} lg={6}>
            <Card>
              <CardTitle title="Job Properties" />
              <CardText>
                <dl className="dl-horizontal">
                  {jobProps.map(jobProp => {
                    let jobPropValue = this.props.job[jobProp]
                    if (Array.isArray(jobPropValue)) {
                      jobPropValue = jobPropValue.join(", ")
                    }

                    const result = []
                    result.push(
                      <dt key="{jobProp}-key">
                        {jobProp}
                      </dt>
                    )
                    result.push(
                      <dd key="{jobProp}-value">
                        {jobPropValue}
                      </dd>
                    )

                    return result
                  }, this)}
                </dl>
              </CardText>
            </Card>
          </Col>
          <Col key="meta-pane" xs={12} sm={12} md={6} lg={6}>
            <Card>
              <CardTitle title="Meta Properties" />
              <CardText>
                <MetaPayload dtWithClass="wide" metaBag={jobMetaBag} identifier="meta" />
              </CardText>
            </Card>
          </Col>
        </Row>
        <Row style={{ marginTop: "1rem" }}>
          <Col key="constraints-pane" xs={12} sm={12} md={6} lg={6}>
            <Card>
              <CardTitle title="Constraints" />
              <CardText>
                <ConstraintTable idPrefix={this.props.job.ID} constraints={this.props.job.Constraints} />
              </CardText>
            </Card>
          </Col>
        </Row>
        <Row style={{ marginTop: "1rem" }}>
          <Col key="task-groups-pane" xs={12} sm={12} md={12} lg={12}>
            <Card>
              <CardTitle title="Task Groups" />
              <CardText>
                {taskGroups.length > 0
                  ? <TableHelper
                      classes="table table-hover table-striped"
                      headers={["Name", "Count", "Tasks", "Meta", "Restart Policy", "Constraints", "Actions"]}
                      body={taskGroups}
                    />
                  : null}
              </CardText>
            </Card>
          </Col>
        </Row>
        <Row style={{ marginTop: "1rem" }}>
          <Col key="tasks-pane" xs={12} sm={12} md={12} lg={12}>
            <Card>
              <CardTitle title="Tasks" />
              <CardText>
                {tasks.length > 0
                  ? <TableHelper
                      classes="table table-hover table-striped"
                      headers={["Task Group", "Name", "Driver", "CPU", "Memory", "Disk", "Constraints"]}
                      body={tasks}
                    />
                  : null}
              </CardText>
            </Card>
          </Col>
        </Row>
      </Grid>
    )
  }
}

JobInfo.defaultProps = {
  job: {
    constraints: []
  },
  allocations: {},
  evaluations: {}
}

function mapStateToProps({ job, allocations, evaluations }) {
  return { job, allocations, evaluations }
}

JobInfo.propTypes = {
  job: PropTypes.object.isRequired
}

export default connect(mapStateToProps)(JobInfo)
