import { DataTypes } from 'sequelize';

export default (sequelize) => {
  sequelize.define('CompanyRule', {
    setting_key: {
      type: DataTypes.STRING(50),
      primaryKey: true
    },
    setting_value: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    }
  }, {
    tableName: 'company_rules',
    timestamps: true,
    createdAt: false,
    updatedAt: 'updated_at'
  });
};