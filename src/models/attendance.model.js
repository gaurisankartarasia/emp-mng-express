import { DataTypes } from 'sequelize';

export default (sequelize) => {
  sequelize.define('Attendance', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    employee_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    check_in_time: {
      type: DataTypes.DATE,
      allowNull: true
    },
    check_out_time: {
      type: DataTypes.DATE,
      allowNull: true
    },
    remark: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'attendance',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });
};