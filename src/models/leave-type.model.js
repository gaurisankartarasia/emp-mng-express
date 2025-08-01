import { DataTypes } from 'sequelize';

export default (sequelize) => {
  sequelize.define('LeaveType', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    is_unpaid: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
 
    monthly_allowance_days: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    max_days_per_request: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
   
    fallback_leave_type_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  }, {
    tableName: 'leave_types',
    timestamps: false
  });
};