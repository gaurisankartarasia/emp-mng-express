import { DataTypes } from 'sequelize';

export default (sequelize) => {
    sequelize.define('PayrollReport', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        month: { type: DataTypes.INTEGER, allowNull: false },
        year: { type: DataTypes.INTEGER, allowNull: false },
        status: { type: DataTypes.ENUM('processing', 'completed', 'failed'), allowNull: false, defaultValue: 'processing' },
        generated_by_id: { type: DataTypes.INTEGER, allowNull: false },
        generated_at: { type: DataTypes.DATE, allowNull: true },
        error_log: { type: DataTypes.TEXT, allowNull: true }
    }, { tableName: 'payroll_reports', createdAt: 'created_at', updatedAt: 'updated_at' });
};