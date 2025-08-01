import { DataTypes } from 'sequelize';

export default (sequelize) => {
  sequelize.define('LeaveRequest', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    employee_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    leave_type_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    start_date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    end_date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    manager_comments: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      defaultValue: 'pending'
    },
    batch_id: {
      type: DataTypes.STRING(36),
      allowNull: true
    },
     days: { 
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    created_by_admin_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  }, {
    tableName: 'leave_requests',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });
};