import { DataTypes } from 'sequelize';

export default (sequelize) => {
  sequelize.define('SalarySlip', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    report_id: { type: DataTypes.INTEGER, allowNull: false },
    employee_id: { type: DataTypes.INTEGER, allowNull: false },
    employee_name: { type: DataTypes.STRING, allowNull: false },
    gross_salary: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    per_day_salary: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    total_payable_days: { type: DataTypes.INTEGER, allowNull: false },
    deductions: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    net_salary: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    breakdown_data: { type: DataTypes.JSON, allowNull: true }
  }, { tableName: 'salary_slips', createdAt: 'created_at', updatedAt: 'updated_at' });
};