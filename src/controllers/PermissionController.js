
import { sequelize } from '../models/index.js'; 

const Employee = sequelize.models.Employee;
const Permission = sequelize.models.Permission;

export const getAllPermissions = async (req, res) => {
    try {
        const permissions = await Permission.findAll({ order: [['id', 'ASC']] });
        res.status(200).json(permissions);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching permissions list', error: error.message });
    }
};

export const getEmployeePermissions = async (req, res) => {
    const { employeeId } = req.params;
    try {
        const employee = await Employee.findByPk(employeeId); 
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