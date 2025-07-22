import { sequelize } from '../models/index.js';

const { Employee, Task } = sequelize.models;

export const getDashboardSummary = async (req, res) => {
    const { userId, is_master } = req.user;

    try {
        let summary = {};

        if (is_master) {
            const [totalEmployees, totalTasks, tasksInProgress, recentTasks, overallRating] = await Promise.all([
                Employee.count(),
                Task.count(),
                Task.count({ where: { status: 'in_progress' } }),
                Task.findAll({
                    limit: 5,
                    order: [['createdAt', 'DESC']],
                    include: { model: Employee, attributes: ['name'] }
                }),
                Task.findOne({
                    attributes: [[sequelize.fn('AVG', sequelize.col('completion_rating')), 'avgRating']],
                    where: { status: 'completed' },
                    raw: true
                })
            ]);
            summary = {
                kpi1: { title: "Total Employees", value: totalEmployees },
                kpi2: { title: "Total Tasks", value: totalTasks },
                kpi3: { title: "Tasks In Progress", value: tasksInProgress },
                kpi4: { title: "Overall Avg. Rating", value: parseFloat(overallRating.avgRating || 0).toFixed(2) },
                recentTasks
            };
        } else {
            const [myTasks, myTasksInProgress, myTasksCompleted, recentTasks, myRating] = await Promise.all([
                Task.count({ where: { EmployeeId: userId } }),
                Task.count({ where: { EmployeeId: userId, status: 'in_progress' } }),
                Task.count({ where: { EmployeeId: userId, status: 'completed' } }),
                Task.findAll({
                    where: { EmployeeId: userId },
                    limit: 5,
                    order: [['createdAt', 'DESC']]
                }),
                Task.findOne({
                    attributes: [[sequelize.fn('AVG', sequelize.col('completion_rating')), 'avgRating']],
                    where: { EmployeeId: userId, status: 'completed' },
                    raw: true
                })
            ]);
            summary = {
                kpi1: { title: "My Total Tasks", value: myTasks },
                kpi2: { title: "My Tasks In Progress", value: myTasksInProgress },
                kpi3: { title: "My Completed Tasks", value: myTasksCompleted },
                kpi4: { title: "My Avg. Rating", value: parseFloat(myRating.avgRating || 0).toFixed(2) },
                recentTasks
            };
        }

        res.status(200).json(summary);

    } catch (error) {
        console.error("Dashboard summary error:", error);
        res.status(500).json({ message: "Error fetching dashboard summary.", error: error.message });
    }
};