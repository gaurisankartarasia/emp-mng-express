import { models } from '../models/index.js';
import { sequelize } from '../models/index.js';
import { Op } from 'sequelize';

const { Employee, Task } = models;

const getIncrementPercentage = (rating) => {
    const roundedRating = Math.round(rating || 0);
    switch (roundedRating) {
        case 5: return 15.0; // Outstanding
        case 4: return 10.0; // Exceeds Expectations
        case 3: return 5.0;  // Meets Expectations
        case 2: return 3.0;  // Needs Improvement
        case 1: return 1.0;  // Unsatisfactory
        default: return 0.0; 
    }
};




// export const getIncrementReport = async (req, res) => {
//     try {
//         const { search } = req.query; 
//         const whereClause = {};

//         if (search) {
//             whereClause.name = { [Op.like]: `%${search}%` }; 
//         }

//         const employeesData = await Employee.findAll({
//             where: whereClause, 
//             attributes: [
//                 'id',
//                 'name',
//                 'current_salary',
//                 'joined_at',
//                 [sequelize.fn('DATEDIFF', sequelize.fn('NOW'), sequelize.col('joined_at')), 'days_of_service'],
//                 [sequelize.fn('AVG', sequelize.col('Tasks.completion_rating')), 'average_rating']
//             ],
//             include: [{
//                 model: Task,
//                 attributes: [],
//                 where: { status: 'completed' },
//                 required: false
//             }],
//             group: ['Employee.id'],
//             raw: true,
//             order: [['name', 'ASC']]
//         });

//         const report = employeesData.map(emp => {
//             const isEligible = emp.days_of_service >= 180;
//             const incrementPercentage = isEligible ? getIncrementPercentage(emp.average_rating) : 0;
//             const currentSalary = parseFloat(emp.current_salary || 0);
//             const newSalary = currentSalary * (1 + (incrementPercentage / 100));

//             return {
//                 ...emp,
//                 average_rating: emp.average_rating ? parseFloat(emp.average_rating).toFixed(2) : null,
//                 is_eligible: isEligible,
//                 increment_percentage: incrementPercentage.toFixed(2),
//                 new_salary: newSalary.toFixed(2)
//             };
//         });

//         res.status(200).json(report);
//     } catch (error) {
//         console.error('Error generating increment report:', error);
//         res.status(500).json({ message: 'Error generating increment report', error: error.message });
//     }
// };


export const getIncrementReport = async (req, res) => {
    try {
        const { search, page = 1, pageSize = 10, sortBy = 'average_rating', sortOrder = 'ASC' } = req.query;

        const limit = parseInt(pageSize, 10);
        const offset = (parseInt(page, 10) - 1) * limit;
        const whereClause = {};

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
            const isEligible = rawEmp.days_of_service >= 180;
            const incrementPercentage = isEligible ? getIncrementPercentage(rawEmp.average_rating) : 0;
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