import { DataTypes } from 'sequelize';

export default (sequelize) => {
  sequelize.define('SalaryComponent', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, allowNull: false, unique: true },
    type: { type: DataTypes.ENUM('Earning', 'Deduction'), allowNull: false },
    is_base_component: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }
  }, { tableName: 'salary_components', timestamps: false });
};