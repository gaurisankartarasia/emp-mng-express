import sequelize from '../db/sequelize.js';
import defineEmployeeModel from './employee.model.js';
import definePermissionModel from './permission.model.js';
import defineTaskModel from './task.model.js'; 
import defineIncrementSchemeModel from './incrementScheme.model.js'; 
import defineLeaveTypeModel from './leave-type.model.js';
import defineLeaveRequestModel from './leave-request.model.js';
import defineCompanyRuleModel from './company-rules.model.js';
// import definePublicHolidayModel from './public-holiday.model.js';
import defineAttendanceModel from './attendance.model.js';

defineEmployeeModel(sequelize);
definePermissionModel(sequelize);
defineTaskModel(sequelize);
defineIncrementSchemeModel(sequelize);
defineLeaveTypeModel(sequelize);     
defineLeaveRequestModel(sequelize);  
defineCompanyRuleModel(sequelize); 
defineAttendanceModel(sequelize);
// definePublicHolidayModel(sequelize);

const { Employee, Permission, Task, LeaveType, LeaveRequest, Attendance  } = sequelize.models;

Employee.belongsToMany(Permission, { through: 'employee_permissions' });
Permission.belongsToMany(Employee, { through: 'employee_permissions' });

Employee.hasMany(Task);
Task.belongsTo(Employee);


Employee.hasMany(LeaveRequest, { foreignKey: 'employee_id' });
LeaveRequest.belongsTo(Employee, { foreignKey: 'employee_id' });


LeaveRequest.belongsTo(Employee, {
  as: 'CreatedByAdmin', 
  foreignKey: 'created_by_admin_id'
});

LeaveType.hasMany(LeaveRequest, { foreignKey: 'leave_type_id' });
LeaveRequest.belongsTo(LeaveType, { foreignKey: 'leave_type_id' });


LeaveType.belongsTo(LeaveType, {
  as: 'FallbackType', 
  foreignKey: 'fallback_leave_type_id'
});

Employee.hasMany(Attendance, { foreignKey: 'employee_id' });
Attendance.belongsTo(Employee, { foreignKey: 'employee_id' });

console.log('Models and Associations defined');

export { sequelize };
export const models = sequelize.models;