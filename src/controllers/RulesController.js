import { models, sequelize } from '../models/index.js';
const { LeaveType, CompanyRule, PublicHoliday } = models;





// --- Leave Type Controllers ---

export const getLeaveTypes = async (req, res) => {
    try {
        const leaveTypes = await LeaveType.findAll({
            order: [['name', 'ASC']],
            include: [{ model: LeaveType, as: 'FallbackType', attributes: ['id', 'name'] }]
        });
        res.status(200).json(leaveTypes);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching leave types', error: error.message });
    }
};

export const createLeaveType = async (req, res) => {
    try {
        const newLeaveType = await LeaveType.create(req.body);
        res.status(201).json(newLeaveType);
    } catch (error) {
        res.status(500).json({ message: 'Error creating leave type', error: error.message });
    }
};

export const updateLeaveType = async (req, res) => {
    const { id } = req.params;
    try {
        const leaveType = await LeaveType.findByPk(id);
        if (!leaveType) {
            return res.status(404).json({ message: 'Leave type not found.' });
        }
        await leaveType.update(req.body);
        res.status(200).json(leaveType);
    } catch (error) {
        res.status(500).json({ message: 'Error updating leave type', error: error.message });
    }
};

export const deleteLeaveType = async (req, res) => {
    const { id } = req.params;
    try {
        const leaveType = await LeaveType.findByPk(id);
        if (!leaveType) {
            return res.status(404).json({ message: 'Leave type not found.' });
        }
        await leaveType.destroy();
        res.status(200).json({ message: 'Leave type deleted successfully.' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting leave type', error: error.message });
    }
};


// --- Company Rule Controllers ---

export const getCompanyRules = async (req, res) => {
    try {
        const rules = await CompanyRule.findAll();
        res.status(200).json(rules);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching company rules', error: error.message });
    }
};

export const updateCompanyRules = async (req, res) => {
    const rulesToUpdate = req.body; // Expecting an array of { setting_key, setting_value }
    const t = await sequelize.transaction();
    try {
        await Promise.all(
            rulesToUpdate.map(rule =>
                CompanyRule.update(
                    { setting_value: rule.setting_value },
                    { where: { setting_key: rule.setting_key }, transaction: t }
                )
            )
        );
        await t.commit();
        res.status(200).json({ message: 'Company rules updated successfully.' });
    } catch (error) {
        await t.rollback();
        res.status(500).json({ message: 'Error updating company rules', error: error.message });
    }
};

