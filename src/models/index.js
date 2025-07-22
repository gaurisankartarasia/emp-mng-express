import sequelize from '../db/sequelize.js';
import defineEmployeeModel from './employee.model.js';
import definePermissionModel from './permission.model.js';
import defineTaskModel from './task.model.js'; 

defineEmployeeModel(sequelize);
definePermissionModel(sequelize);
defineTaskModel(sequelize);

const { Employee, Permission, Task } = sequelize.models;

Employee.belongsToMany(Permission, { through: 'employee_permissions' });
Permission.belongsToMany(Employee, { through: 'employee_permissions' });

Employee.hasMany(Task);
Task.belongsTo(Employee);

console.log('Models and Associations defined');

export { sequelize };
export const models = sequelize.models;