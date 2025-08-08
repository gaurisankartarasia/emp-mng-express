import { DataTypes } from 'sequelize';

export default (sequelize) => {
  sequelize.define('EmployeeSalaryStructure', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    employee_id: { type: DataTypes.INTEGER, allowNull: false },
    component_id: { type: DataTypes.INTEGER, allowNull: false },
    calculation_type: { type: DataTypes.ENUM('Flat', 'Percentage'), allowNull: false },
    value: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    // Remove the old 'percentage_of_component_id' and add the new 'dependencies'
    dependencies: {
      type: DataTypes.JSON,
      allowNull: true
    }
  }, { tableName: 'employee_salary_structures', createdAt: 'created_at', updatedAt: 'updated_at' });
};