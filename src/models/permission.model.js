import { DataTypes } from 'sequelize';

export default (sequelize) => {
  sequelize.define('Permission', {
    code_name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    description: {
      type: DataTypes.TEXT
    }
  }, {
    tableName: 'permissions',
    timestamps: true
  });
};