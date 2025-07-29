import sequelize from '../db/sequelize.js';
import defineEmployeeModel from './employee.model.js';
import definePermissionModel from './permission.model.js';
import defineTaskModel from './task.model.js'; 
import defineIncrementSchemeModel from './incrementScheme.model.js'; 
import defineLeaveTypeModel from './leave-type.model.js';
import defineLeaveRequestModel from './leave-request.model.js';
import defineCompanyRuleModel from './company-rules.model.js';
import definePublicHolidayModel from './public-holiday.model.js';

defineEmployeeModel(sequelize);
definePermissionModel(sequelize);
defineTaskModel(sequelize);
defineIncrementSchemeModel(sequelize);
defineLeaveTypeModel(sequelize);     
defineLeaveRequestModel(sequelize);  
defineCompanyRuleModel(sequelize); 
definePublicHolidayModel(sequelize);

const { Employee, Permission, Task, LeaveType, LeaveRequest } = sequelize.models;

Employee.belongsToMany(Permission, { through: 'employee_permissions' });
Permission.belongsToMany(Employee, { through: 'employee_permissions' });

Employee.hasMany(Task);
Task.belongsTo(Employee);

// --- New Leave Management Associations ---
// Employee <-> LeaveRequest
Employee.hasMany(LeaveRequest, { foreignKey: 'employee_id' });
LeaveRequest.belongsTo(Employee, { foreignKey: 'employee_id' });


// An Employee can also be the creator of a request (as an admin override)
LeaveRequest.belongsTo(Employee, {
  as: 'CreatedByAdmin', // Use an alias to distinguish from the requester
  foreignKey: 'created_by_admin_id'
});

// LeaveType <-> LeaveRequest
LeaveType.hasMany(LeaveRequest, { foreignKey: 'leave_type_id' });
LeaveRequest.belongsTo(LeaveType, { foreignKey: 'leave_type_id' });


// A LeaveType can have a fallback LeaveType (self-referencing)
LeaveType.belongsTo(LeaveType, {
  as: 'FallbackType', // Use an alias for clarity in queries
  foreignKey: 'fallback_leave_type_id'
});

console.log('Models and Associations defined');

export { sequelize };
export const models = sequelize.models;