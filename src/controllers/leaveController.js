


import { models, sequelize } from '../models/index.js';
import { Op } from 'sequelize';
import crypto from 'crypto';

const { LeaveRequest, LeaveType, Employee, CompanyRule, PublicHoliday } = models;


// const calculateWorkingDays = (start, end) => {
//     let count = 0;
//     const startDate = new Date(start);
//     const endDate = new Date(end);

//     let currentDate = new Date(startDate.toISOString().split('T')[0]);

//     while (currentDate <= endDate) {
       
//         const dayOfWeek = currentDate.getDay();
//         if (dayOfWeek !== 0) {
//             count++;
//         }
//         currentDate.setDate(currentDate.getDate() + 1);
//     }
//     return count;
// };


// Helper function to create a clean, time-stripped date in UTC.
const getUTCDate = (date) => {
    if (!date) return null;
    const d = new Date(date);
    return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
};

export const calculateWorkingDays = (startDate, endDate, holidays = []) => {
    const start = getUTCDate(startDate);
    const end = getUTCDate(endDate);

    if (!start || !end || start > end) return 0;

    let count = 0;
    const holidayDates = new Set(holidays.map(h => h.date));
    let currentDate = new Date(start);

    while (currentDate <= end) {
        const dayOfWeek = currentDate.getUTCDay(); // Use getUTCDay() for consistency
        const isoDate = currentDate.toISOString().split('T')[0];

        if (dayOfWeek !== 0 && !holidayDates.has(isoDate)) {
            count++;
        }
        currentDate.setUTCDate(currentDate.getUTCDate() + 1); // Use setUTCDate()
    }
    return count;
};

export const getCalendarData = async (req, res) => {
    const { userId } = req.user;
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const endOfYear = new Date(now.getFullYear(), 11, 31);

    try {
        const [holidays, existingLeaves] = await Promise.all([
            PublicHoliday.findAll({
                where: { date: { [Op.between]: [startOfYear, endOfYear] } }
            }),
            LeaveRequest.findAll({
                where: {
                    employee_id: userId,
                    status: { [Op.in]: ['pending', 'approved'] },
                    start_date: { [Op.between]: [startOfYear, endOfYear] }
                },
                attributes: ['start_date', 'end_date', 'status']
            })
        ]);

        res.status(200).json({ holidays, existingLeaves });
    } catch (error) {
        console.error("Error fetching calendar data:", error);
        res.status(500).json({ message: 'Server error fetching calendar data.' });
    }
};

export const validateLeaveRequest = async (req, res) => {
    const { leave_type_id, start_date, end_date } = req.body;
    const { userId } = req.user;

    if (!leave_type_id || !start_date || !end_date) {
        return res.status(400).json({ message: 'Missing required fields for validation.' });
    }
    if (new Date(start_date) > new Date(end_date)) {
        return res.status(400).json({ message: 'Start date cannot be after end date.' });
    }

    try {
        const rules = await LeaveType.findByPk(leave_type_id, {
            include: [{ model: LeaveType, as: 'FallbackType' }]
        });
        if (!rules) {
            return res.status(404).json({ message: "Invalid leave type specified." });
        }

        const requestedDays = calculateWorkingDays(start_date, end_date);
        const now = new Date();
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        const endOfYear = new Date(now.getFullYear(), 11, 31);
        const today = new Date(now.setHours(0, 0, 0, 0));

        if (new Date(start_date) < today && !rules.allow_retroactive_application) {
            return res.status(400).json({ message: "Request failed. The start date cannot be in the past for this leave type." });
        }

        if (rules.max_days_per_request && requestedDays > rules.max_days_per_request) {
            return res.status(400).json({
                message: `Request failed. You cannot request more than ${rules.max_days_per_request} consecutive working days for this leave type.`
            });
        }
        
        if (rules.monthly_allowance_days) {
            const requestStartDate = new Date(start_date);
            const requestEndDate = new Date(end_date);
            
            const monthsToCheck = [];
            let currentMonth = new Date(requestStartDate.getFullYear(), requestStartDate.getMonth(), 1);
            const requestEndMonth = new Date(requestEndDate.getFullYear(), requestEndDate.getMonth(), 1);
            
            while (currentMonth <= requestEndMonth) {
                monthsToCheck.push(new Date(currentMonth));
                currentMonth.setMonth(currentMonth.getMonth() + 1);
            }
            
            for (const monthStart of monthsToCheck) {
                const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
                
                const leavesAffectingThisMonth = await LeaveRequest.findAll({
                    where: {
                        employee_id: userId,
                        leave_type_id: leave_type_id,
                         status: { [Op.in]: ['approved', 'pending'] },
                        start_date: { [Op.lte]: monthEnd },
                        end_date: { [Op.gte]: monthStart }
                    }
                });
                
                let alreadyTakenThisMonth = 0;
                leavesAffectingThisMonth.forEach(leave => {
                    const leaveStart = new Date(leave.start_date);
                    const leaveEnd = new Date(leave.end_date);
                    
                    const overlapStart = leaveStart > monthStart ? leaveStart : monthStart;
                    const overlapEnd = leaveEnd < monthEnd ? leaveEnd : monthEnd;
                    
                    if (overlapStart <= overlapEnd) {
                        alreadyTakenThisMonth += calculateWorkingDays(overlapStart, overlapEnd);
                    }
                });
                
                const requestOverlapStart = requestStartDate > monthStart ? requestStartDate : monthStart;
                const requestOverlapEnd = requestEndDate < monthEnd ? requestEndDate : monthEnd;
                
                let requestDaysInThisMonth = 0;
                if (requestOverlapStart <= requestOverlapEnd) {
                    requestDaysInThisMonth = calculateWorkingDays(requestOverlapStart, requestOverlapEnd);
                }
                
                if ((alreadyTakenThisMonth + requestDaysInThisMonth) > rules.monthly_allowance_days) {
                    const remainingMonthly = rules.monthly_allowance_days - alreadyTakenThisMonth;
                    const monthName = monthStart.toLocaleString('default', { month: 'long', year: 'numeric' });
                    
                    return res.status(400).json({
                        message: `Request failed. This request exceeds your monthly limit of ${rules.monthly_allowance_days} days for ${monthName}. You have ${Math.max(0, remainingMonthly)} working days remaining for that month.`
                    });
                }
            }
        }

        if (!rules.is_unpaid) {
            const totalCapRule = await CompanyRule.findOne({ where: { setting_key: 'total_annual_leave_cap' } });
            if (totalCapRule) {
                const totalAnnualCap = Number(totalCapRule.setting_value);
                const allPaidLeaves = await LeaveRequest.findAll({
                    where: { employee_id: userId, status: 'approved', start_date: { [Op.between]: [startOfYear, endOfYear] } },
                    include: [{ model: LeaveType, where: { is_unpaid: false }, attributes: [] }]
                });
                const totalPaidDaysTaken = allPaidLeaves.reduce((total, leave) => total + calculateWorkingDays(leave.start_date, leave.end_date), 0);

                if ((totalPaidDaysTaken + requestedDays) > totalAnnualCap) {
                    const remainingTotal = totalAnnualCap - totalPaidDaysTaken;
                    return res.status(400).json({ message: `Request failed. This request would exceed your total annual leave limit. You have ${remainingTotal} paid working days remaining this year.` });
                }
            }
        }

        if (rules.annual_allowance_days) {
            const leavesOfThisType = await LeaveRequest.findAll({
                where: { employee_id: userId, leave_type_id: leave_type_id, status: 'approved', start_date: { [Op.between]: [startOfYear, endOfYear] } }
            });
            const alreadyTakenDays = leavesOfThisType.reduce((total, leave) => total + calculateWorkingDays(leave.start_date, leave.end_date), 0);
            const remainingBalance = rules.annual_allowance_days - alreadyTakenDays;

            if (requestedDays > remainingBalance) {
                if (!rules.FallbackType) {
                    return res.status(400).json({ message: `Request failed. You only have ${remainingBalance} working days remaining for this leave type and no alternative is available.` });
                }

                const paidPortionDays = Math.max(0, remainingBalance);
                const fallbackPortionDays = requestedDays - paidPortionDays;
                
                const paidPortionEndDate = new Date(start_date);
                if (paidPortionDays > 0) {
                    paidPortionEndDate.setDate(paidPortionEndDate.getDate() + paidPortionDays - 1);
                }
                
                const fallbackPortionStartDate = new Date(paidPortionEndDate);
                if (paidPortionDays > 0) {
                   fallbackPortionStartDate.setDate(fallbackPortionStartDate.getDate() + 1);
                }

                const proposal = {
                    original_request: { leave_type_id, start_date, end_date },
                    split: []
                };

                if (paidPortionDays > 0) {
                    proposal.split.push({
                        leave_type_id: rules.id,
                        leave_type_name: rules.name,
                        days: paidPortionDays,
                        start_date: new Date(start_date).toISOString().split('T')[0],
                        end_date: paidPortionEndDate.toISOString().split('T')[0]
                    });
                }
                proposal.split.push({
                    leave_type_id: rules.FallbackType.id,
                    leave_type_name: rules.FallbackType.name,
                    days: fallbackPortionDays,
                    start_date: fallbackPortionStartDate.toISOString().split('T')[0],
                    end_date: new Date(end_date).toISOString().split('T')[0]
                });

                return res.status(200).json({ status: "split_required", proposal });
            }
        }

        return res.status(200).json({ status: "ok" });

    } catch (error) {
        console.error("Error in validateLeaveRequest:", error);
        res.status(500).json({ message: 'Server error during leave validation.' });
    }
};



export const createSingleLeaveRequest = async (req, res) => {
const { leave_type_id, start_date, end_date, reason } = req.body;
const { userId } = req.user;
if (!leave_type_id || !start_date || !end_date) {
    return res.status(400).json({ message: 'Missing required fields for leave creation.' });
}

try {
 

    const newRequest = await LeaveRequest.create({
        employee_id: userId,
        leave_type_id,
        start_date,
        end_date,
        reason,
        status: 'pending' 
    });

    res.status(201).json(newRequest);

} catch (error) {
    console.error("Error in createSingleLeaveRequest:", error);
    res.status(500).json({ message: 'Server error while creating leave request.' });
}
};


export const createSplitLeaveRequest = async (req, res) => {
    const split = req.body?.split;
    const reason = req.body?.original_request?.reason;
    const { userId } = req.user;

    if (!split || !Array.isArray(split) || split.length === 0) {
        return res.status(400).json({ message: 'Invalid or missing split proposal data.' });
    }

    let t; // Define transaction variable in a higher scope

    try {
        t = await sequelize.transaction(); // Initialize the transaction
        const batchId = crypto.randomUUID();

        const requestsToCreate = split.map(item => ({
            employee_id: userId,
            leave_type_id: item.leave_type_id,
            start_date: item.start_date,
            end_date: item.end_date,
            reason: reason || "",
            status: 'pending',
            batch_id: batchId
        }));

        await LeaveRequest.bulkCreate(requestsToCreate, { transaction: t });
        await t.commit();
        
        return res.status(201).json({ message: 'Split leave request created successfully.', batch_id: batchId });

    } catch (error) {
        if (t) {
            await t.rollback();
        }
        console.error("Error in createSplitLeaveRequest:", error);
        return res.status(500).json({ message: error.message || 'Server error creating split request. The operation was rolled back.' });
    }
};

export const getMyLeaveRequests = async (req, res) => {
  try {
    const { userId } = req.user;
    if (!userId) {
      return res.status(403).json({ message: "Forbidden: User ID not found in token." });
    }

    const requests = await LeaveRequest.findAll({
      where: { employee_id: userId }, // Always filters by the logged-in user
      include: [
        { model: Employee, attributes: ['id', 'name'] },
        { model: LeaveType, attributes: ['id', 'name'] }
      ],
      order: [['created_at', 'DESC']]
    });

    res.status(200).json(requests);
  } catch (error) {
    res.status(500).json({ message: 'Server error while fetching your leave requests.', error: error.message });
  }
};

export const getManagedLeaveRequests = async (req, res) => {
  try {
  
    const requests = await LeaveRequest.findAll({
      include: [
        { model: Employee, attributes: ['id', 'name', 'email'] },
        { model: LeaveType, attributes: ['id', 'name'] }
      ],
      order: [['created_at', 'DESC']]
    });

    res.status(200).json(requests);
  } catch (error) {
    res.status(500).json({ message: 'Server error while fetching managed leave requests.', error: error.message });
  }
};




export const updateLeaveRequest = async (req, res) => {
    const { status, manager_comments } = req.body;
    const { id } = req.params;
    const { userId, is_master } = req.user;

    try {
        const request = await LeaveRequest.findByPk(id);

        if (!request) {
            return res.status(404).json({ message: 'Leave request not found.' });
        }
        
     
        if (request.status === 'approved' || request.status === 'rejected') {
            return res.status(400).json({ message: "This request has already been finalized and cannot be changed." });
        }

        if (request.employee_id === userId && !is_master) {
            return res.status(403).json({ message: "Forbidden: You cannot update your own leave request." });
        }


        if (!status) {
            return res.status(400).json({ message: 'Status is required.' });
        }

        request.status = status;
        if (manager_comments !== undefined) {
            request.manager_comments = manager_comments;
        }

        await request.save();
        res.status(200).json(request);

    } catch (error) {
        res.status(500).json({ message: 'Error updating leave request', error: error.message });
    }
};


export const getLeaveConfig = async (req, res) => {
    try {
        const { userId } = req.user;
        const now = new Date();
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        const endOfYear = new Date(now.getFullYear(), 11, 31);
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        const [allLeaveTypes, companyRules, allApprovedLeaves] = await Promise.all([
            LeaveType.findAll(),
            CompanyRule.findAll(),
            LeaveRequest.findAll({
                where: {
                    employee_id: userId,
                    status: 'approved',
                    start_date: { [Op.lte]: endOfYear },
                    end_date: { [Op.gte]: startOfYear }
                },
                include: { model: LeaveType, as: 'LeaveType', attributes: ['is_unpaid'] }
            })
        ]);
        
        const rulesMap = new Map(companyRules.map(rule => [rule.setting_key, rule.setting_value]));
        const totalAnnualCap = Number(rulesMap.get('total_annual_leave_cap')) || 0;

        let totalPaidDaysTakenThisYear = 0;
        let totalUnpaidDaysTakenThisYear = 0;
        let totalUnpaidDaysTakenThisMonth = 0;
        let totalPaidAllowance = 0;

        const balanceDetails = allLeaveTypes.map(lt => {
            const leavesOfThisType = allApprovedLeaves.filter(al => al.leave_type_id === lt.id);
            
            let daysTakenThisYear = 0;
            leavesOfThisType.forEach(leave => {
                const effectiveStart = new Date(leave.start_date) > startOfYear ? new Date(leave.start_date) : startOfYear;
                const effectiveEnd = new Date(leave.end_date) < endOfYear ? new Date(leave.end_date) : endOfYear;
                if (effectiveStart <= effectiveEnd) {
                    daysTakenThisYear += calculateWorkingDays(effectiveStart, effectiveEnd);
                }
            });

            if (!lt.is_unpaid) {
                totalPaidDaysTakenThisYear += daysTakenThisYear;
                if (lt.annual_allowance_days) {
                    totalPaidAllowance += lt.annual_allowance_days;
                }
            } else {
                totalUnpaidDaysTakenThisYear += daysTakenThisYear;
                
                leavesOfThisType.forEach(leave => {
                    const monthStart = new Date(leave.start_date) > startOfMonth ? new Date(leave.start_date) : startOfMonth;
                    const monthEnd = new Date(leave.end_date) < endOfMonth ? new Date(leave.end_date) : endOfMonth;
                    if (monthStart <= monthEnd) {
                        totalUnpaidDaysTakenThisMonth += calculateWorkingDays(monthStart, monthEnd);
                    }
                });
            }

            return {
                id: lt.id,
                name: lt.name,
                allowance: lt.annual_allowance_days,
                is_unpaid: lt.is_unpaid,
                taken: daysTakenThisYear,
                remaining: lt.annual_allowance_days !== null ? lt.annual_allowance_days - daysTakenThisYear : null,
            };
        });
        
        const effectiveAllowance = totalAnnualCap > 0 ? totalAnnualCap : totalPaidAllowance;
        
        const annualBalance = {
            allowance: effectiveAllowance,
            taken: totalPaidDaysTakenThisYear,
            remaining: effectiveAllowance - totalPaidDaysTakenThisYear,
        };
        
        res.status(200).json({
            leaveTypes: allLeaveTypes,
            balanceDetails,
            annualBalance,
            unpaidLeaveBalance: {
                takenThisYear: totalUnpaidDaysTakenThisYear,
                takenThisMonth: totalUnpaidDaysTakenThisMonth
            }
        });

    } catch (error) {
        console.error("Error fetching leave config:", error);
        res.status(500).json({ message: 'Error fetching leave configuration.', error: error.message });
    }
};
