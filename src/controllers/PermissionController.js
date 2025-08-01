// import { models } from '../models/index.js';
// const { Employee, Permission } = models;

// // Get all possible permissions that can be assigned
// export const getAllPermissions = async (req, res) => {
//     try {
//         const permissions = await Permission.findAll({ order: [['id', 'ASC']] });
//         res.status(200).json(permissions);
//     } catch (error) {
//         res.status(500).json({ message: 'Error fetching permissions list', error: error.message });
//     }
// };

// // Get the currently assigned permissions for a single employee
// export const getEmployeePermissions = async (req, res) => {
//     const { employeeId } = req.params;
//     try {
//         const employee = await Employee.findByPk(employeeId);
//         if (!employee) {
//             return res.status(404).json({ message: 'Employee not found.' });
//         }
//         // Use the magic method from Sequelize to get associated permissions
//         const permissions = await employee.getPermissions({
//             attributes: ['id'] // We only need the IDs
//         });
//         res.status(200).json(permissions);
//     } catch (error) {
//         res.status(500).json({ message: 'Error fetching employee permissions', error: error.message });
//     }
// };

// // Update an employee's permissions based on a list of IDs
// export const updateEmployeePermissions = async (req, res) => {
//     const { employeeId } = req.params;
//     const { permissionIds } = req.body; // Expects an array of permission IDs

//     if (!Array.isArray(permissionIds)) {
//         return res.status(400).json({ message: 'permissionIds must be an array.' });
//     }

//     try {
//         const employee = await Employee.findByPk(employeeId);
//         if (!employee) {
//             return res.status(404).json({ message: 'Employee not found.' });
//         }
//         if (employee.is_master) {
//             return res.status(403).json({ message: 'Cannot modify permissions for a master account.' });
//         }
        
//         // This Sequelize method automatically syncs the junction table.
//         // It adds new associations and removes old ones.
//         await employee.setPermissions(permissionIds);
        
//         res.status(200).json({ message: 'Permissions updated successfully.' });
//     } catch (error) {
//         res.status(500).json({ message: 'Error updating permissions', error: error.message });
//     }
// };


import { sequelize } from '../models/index.js'; // <-- Import the main sequelize instance

// Get models directly from the sequelize instance to ensure they are fully initialized
const Employee = sequelize.models.Employee;
const Permission = sequelize.models.Permission;

// Get all possible permissions that can be assigned
export const getAllPermissions = async (req, res) => {
    try {
        const permissions = await Permission.findAll({ order: [['id', 'ASC']] });
        res.status(200).json(permissions);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching permissions list', error: error.message });
    }
};

// Get the currently assigned permissions for a single employee
export const getEmployeePermissions = async (req, res) => {
    const { employeeId } = req.params;
    try {
        const employee = await Employee.findByPk(employeeId); // This will now work correctly
        if (!employee) {
            return res.status(404).json({ message: 'Employee not found.' });
        }
        const permissions = await employee.getPermissions({
            attributes: ['id']
        });
        res.status(200).json(permissions);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching employee permissions', error: error.message });
    }
};

// Update an employee's permissions based on a list of IDs
export const updateEmployeePermissions = async (req, res) => {
    const { employeeId } = req.params;
    const { permissionIds } = req.body;

    if (!Array.isArray(permissionIds)) {
        return res.status(400).json({ message: 'permissionIds must be an array.' });
    }

    try {
        const employee = await Employee.findByPk(employeeId);
        if (!employee) {
            return res.status(404).json({ message: 'Employee not found.' });
        }
        if (employee.is_master) {
            return res.status(403).json({ message: 'Cannot modify permissions for a master account.' });
        }
        
        await employee.setPermissions(permissionIds);
        
        res.status(200).json({ message: 'Permissions updated successfully.' });
    } catch (error) {
        res.status(500).json({ message: 'Error updating permissions', error: error.message });
    }
};