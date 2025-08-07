
import { sequelize } from '../models/index.js';
import { Op } from 'sequelize';

const { Employee, Task, IncrementScheme } = sequelize.models; 



export const getIncrementScheme = async (req, res) => {
    try {
        const scheme = await IncrementScheme.findAll({
            order: [['rating', 'DESC']],
            raw: true
        });
        res.status(200).json(scheme);
    } catch (error) {
        console.error('Error fetching increment scheme:', error);
        res.status(500).json({ message: 'Error fetching increment scheme', error: error.message });
    }
};

export const getIncrementReport = async (req, res) => {
    try {
        const { search, page = 1, pageSize = 10, sortBy = 'name', sortOrder = 'ASC' } = req.query;

        const schemeRows = await IncrementScheme.findAll({ raw: true });
        if (schemeRows.length === 0) {
            return res.status(500).json({ message: "Increment scheme is not configured in the database." });
        }
        
        const schemeMap = new Map(schemeRows.map(item => [item.rating, parseFloat(item.percentage)]));
        const defaultPercentage = schemeMap.get(0) || 0;

        const limit = parseInt(pageSize, 10);
        const offset = (parseInt(page, 10) - 1) * limit;
        const whereClause = { is_master: false };

        if (search) {
            whereClause.name = { [Op.like]: `%${search}%` };
        }

        const { count, rows } = await Employee.findAndCountAll({
            where: whereClause,
            attributes: [
                'id', 'name', 'current_salary', 'joined_at',
                [sequelize.fn('DATEDIFF', sequelize.fn('NOW'), sequelize.col('joined_at')), 'days_of_service'],
                [sequelize.fn('AVG', sequelize.col('Tasks.completion_rating')), 'average_rating']
            ],
            include: [{ model: Task, attributes: [], where: { status: 'completed' }, required: false }],
            group: ['Employee.id'],
            limit: limit,
            offset: offset,
            order: [[sortBy, sortOrder]],
            subQuery: false 
        });

        const totalItems = count.length;
        const report = rows.map(emp => {
            const rawEmp = emp.get({ plain: true });
            const roundedRating = Math.round(rawEmp.average_rating || 0);
            
            const isEligible = rawEmp.days_of_service >= 180;
            const incrementPercentage = isEligible ? (schemeMap.get(roundedRating) || defaultPercentage) : 0;
            const currentSalary = parseFloat(rawEmp.current_salary || 0);
            const newSalary = currentSalary * (1 + (incrementPercentage / 100));

            return {
                ...rawEmp,
                average_rating: rawEmp.average_rating ? parseFloat(rawEmp.average_rating).toFixed(2) : null,
                is_eligible: isEligible,
                increment_percentage: incrementPercentage.toFixed(2),
                new_salary: newSalary.toFixed(2)
            };
        });

        res.status(200).json({
            data: report,
            totalPages: Math.ceil(totalItems / limit),
            totalItems: totalItems
        });

    } catch (error) {
        console.error('Error generating increment report:', error);
        res.status(500).json({ message: 'Error generating increment report', error: error.message });
    }
};