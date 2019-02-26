import React from 'react';

export class PlantUnitInfo extends React.Component {

  render() {
    if (this.props.plant === null || this.props.unit === null) {
      return <div class="info-card faded-text">No unit loaded</div>;
    }
    const plantInfo = this.props.getInfo(this.props.plant);
    return (
      <div class="info-card">
        <table>
          <tr>
            <th>ORISPL</th>
            <th>Plant Name</th>
            <th>Unit</th>
            <th>State</th>
            <th>County</th>
            <th>Fuel</th>
            <th>Operator</th>
          </tr>
          <tr>
            <td>{this.props.plant}</td>
            <td>{plantInfo.name}</td>
            <td>{this.props.unit}</td>
            <td>{plantInfo.state}</td>
            <td>{plantInfo.county}</td>
            <td>{plantInfo.fuel_source}</td>
            <td>{plantInfo.operator}</td>
          </tr>
        </table>
      </div>
    );
  }
}
