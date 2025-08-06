import { models } from '../models/index.js';
import { Op } from 'sequelize';

const { Employee, Attendance, LeaveRequest, LeaveType } = models;


export const getEmployeeList = async (req, res) => {
    try {
        const employees = await Employee.findAll({
            where: { is_active: true },
            attributes: ['id', 'name'],
            order: [['name', 'ASC']]
        });
        res.status(200).json(employees);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching employee list.', error: error.message });
    }
};


export const calculateMonthlySalary = async (req, res) => {


    
    const { 
        employee_id, 
        month, year } = req.body;

    if (!employee_id || !month || !year) {
        return res.status(400).json({ message: 'Employee ID, month, and year are required.' });
    }

    try {
        const employee = await Employee.findByPk(employee_id, { attributes: ['id', 'name', 'current_salary'] });
        if (!employee) {
            return res.status(404).json({ message: 'Employee not found.' });
        }
        
        const monthlySalary = parseFloat(employee.current_salary);
        const startDate = new Date(Date.UTC(year, month - 1, 1));
        const endDate = new Date(Date.UTC(year, month, 0));
        const totalDaysInMonth = endDate.getUTCDate();

        const [daysPresent, paidLeaves] = await Promise.all([
            Attendance.findAll({
                where: {
                    employee_id: employee_id,
                    date: { [Op.between]: [startDate, endDate] },
                    check_in_time: { [Op.ne]: null }
                },
                attributes: ['date']
            }),

            LeaveRequest.findAll({

                where: {
                    employee_id: employee_id,
                    status: 'approved',
                    start_date: { [Op.lte]: endDate },
                    end_date: { [Op.gte]: startDate }
                },
                include: { model: LeaveType, as: 'LeaveType', where: { is_unpaid: false } }
            })
        ]);

        const processedDates = new Set();
        let presentDaysCount = 0;
        let paidLeaveDaysCount = 0;

        daysPresent.forEach(att => {
            const dateStr = att.date;
            if (!processedDates.has(dateStr)) {
                processedDates.add(dateStr);
                presentDaysCount++;
            }
        });

        paidLeaves.forEach(leave => {
            let currentDate = new Date(leave.start_date);
            const leaveEndDate = new Date(leave.end_date);
            
            while (currentDate <= leaveEndDate) {
                if (currentDate >= startDate && currentDate <= endDate) {
                    const dateStr = currentDate.toISOString().split('T')[0];
                    if (!processedDates.has(dateStr)) {
                        processedDates.add(dateStr);
                        paidLeaveDaysCount++;
                    }
                }
                currentDate.setDate(currentDate.getDate() + 1);
            }
        });

        const totalPayableDays = presentDaysCount + paidLeaveDaysCount;
        
        const perDaySalary = monthlySalary / totalDaysInMonth;
        const finalSalary = totalPayableDays * perDaySalary;
        const totalDeductions = monthlySalary - finalSalary;

        res.status(200).json({
            employee: {
                id: employee.id,
                name: employee.name,
            },
            payPeriod: {
                month,
                year,
                startDate,
                endDate,
            },
            salaryDetails: {
                grossSalary: monthlySalary.toFixed(2),
                perDaySalary: perDaySalary.toFixed(2),
                totalPayableDays,
                totalDaysInMonth,
                deductions: totalDeductions.toFixed(2),
                netSalary: finalSalary.toFixed(2),
            },
            attendanceBreakdown: {
                presentDays: presentDaysCount,
                paidLeaveDays: paidLeaveDaysCount,
                unpaidDays: totalDaysInMonth - totalPayableDays,
            }
        });

    } catch (error) {
        console.error("Error calculating salary:", error);
        res.status(500).json({ message: 'Server error during salary calculation.', error: error.message });
    }
};

