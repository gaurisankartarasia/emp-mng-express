import { models, sequelize  } from '../models/index.js';
const { SalaryComponent, EmployeeSalaryStructure, Employee } = models;





export const calculateSalaryBreakdown = async (employeeId) => {
    const structureRules = await EmployeeSalaryStructure.findAll({
        where: { employee_id: employeeId },
        include: [{ model: SalaryComponent, as: 'component' }],
        raw: true,
        nest: true 
    });

    if (!structureRules || structureRules.length === 0) {
        return { error: `No salary structure defined for employee ID ${employeeId}.` };
    }

    const calculatedValues = new Map(); 
    const isCalculated = new Set();   
    let passes = 0;
    const maxPasses = structureRules.length; 

    while (isCalculated.size < structureRules.length && passes <= maxPasses) {
        let calculationsMadeInThisPass = false;

        for (const rule of structureRules) {
            if (isCalculated.has(rule.id)) {
                continue; 
            }

            if (rule.calculation_type === 'Flat') {
                calculatedValues.set(rule.component.id, parseFloat(rule.value));
                isCalculated.add(rule.id);
                calculationsMadeInThisPass = true;
            } else if (rule.calculation_type === 'Percentage') {
               const dependencyIds = typeof rule.dependencies === 'string'
                    ? JSON.parse(rule.dependencies)
                    : (rule.dependencies || []);
                
                const areDependenciesMet = dependencyIds.every(depId => calculatedValues.has(depId));
                
                if (areDependenciesMet) {
                    const baseSum = dependencyIds.reduce((sum, depId) => sum + calculatedValues.get(depId), 0);
                    const calculatedAmount = (baseSum * parseFloat(rule.value)) / 100;
                    
                    calculatedValues.set(rule.component.id, calculatedAmount);
                    isCalculated.add(rule.id);
                    calculationsMadeInThisPass = true;
                }
            }
        }
        
        if (!calculationsMadeInThisPass) {
            break;
        }
        passes++;
    }

    if (isCalculated.size < structureRules.length) {
        const uncalculated = structureRules.filter(r => !isCalculated.has(r.id)).map(r => r.component.name);
        throw new Error(`Could not resolve salary structure. Circular dependency or missing base value detected. Uncalculated components: ${uncalculated.join(', ')}`);
    }

    const breakdown = [];
    let totalEarnings = 0;
    let totalDeductions = 0;

    structureRules.forEach(rule => {
        const amount = calculatedValues.get(rule.component.id);
        breakdown.push({
            name: rule.component.name,
            type: rule.component.type,
            amount: parseFloat(amount.toFixed(2))
        });

        if (rule.component.type === 'Earning') {
            totalEarnings += amount;
        } else if (rule.component.type === 'Deduction') {
            totalDeductions += amount;
        }
    });

    return {
        employee_id: employeeId,
        breakdown,
        summary: {
            totalEarnings: parseFloat(totalEarnings.toFixed(2)),
            totalDeductions: parseFloat(totalDeductions.toFixed(2)),
            netSalary: parseFloat((totalEarnings - totalDeductions).toFixed(2))
        }
    };
};

export const getSalaryComponents = async (req, res) => {
    try {
        const components = await SalaryComponent.findAll({ order: [['name', 'ASC']] });
        res.status(200).json(components);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching salary components', error: error.message });
    }
};


export const createSalaryComponent = async (req, res) => {
    try {
        const newComponent = await SalaryComponent.create(req.body);
        res.status(201).json(newComponent);
    } catch (error) {
        res.status(500).json({ message: 'Error creating salary component', error: error.message });
    }
};


export const updateSalaryComponent = async (req, res) => {
    const { id } = req.params;
    try {
        const component = await SalaryComponent.findByPk(id);
        if (!component) return res.status(404).json({ message: 'Component not found.' });
        await component.update(req.body);
        res.status(200).json(component);
    } catch (error) {
        res.status(500).json({ message: 'Error updating salary component', error: error.message });
    }
};


export const deleteSalaryComponent = async (req, res) => {
    const { id } = req.params;
    try {
        const component = await SalaryComponent.findByPk(id);
        if (!component) return res.status(404).json({ message: 'Component not found.' });
        await component.destroy();
        res.status(200).json({ message: 'Component deleted successfully.' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting salary component', error: error.message });
    }
};









export const getEmployeeSalaryStructure = async (req, res) => {
    const { employeeId } = req.params;
    try {
        const structure = await EmployeeSalaryStructure.findAll({
            where: { employee_id: employeeId },
            include: [{ model: SalaryComponent, as: 'component' }]
        });
        res.status(200).json(structure);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching employee salary structure.', error: error.message });
    }
};

export const updateEmployeeSalaryStructure = async (req, res) => {
    const { employeeId } = req.params;
    const structureRules = req.body;

    if (!Array.isArray(structureRules)) {
        return res.status(400).json({ message: 'Request body must be an array of salary structure rules.' });
    }

    const t = await sequelize.transaction();
    try {
        await EmployeeSalaryStructure.destroy({
            where: { employee_id: employeeId },
            transaction: t
        });

        const newRules = structureRules.map(rule => ({
            ...rule,
            employee_id: employeeId,
            dependencies: rule.calculation_type === 'Percentage' ? rule.dependencies : null,
        }));
        
        if (newRules.length > 0) {
            await EmployeeSalaryStructure.bulkCreate(newRules, {
                transaction: t,
                validate: true 
            });
        }
        
        await t.commit();
        res.status(200).json({ message: "Employee's salary structure updated successfully." });

    } catch (error) {
        await t.rollback();
        res.status(500).json({ message: 'Error updating employee salary structure.', error: error.message });
    }
};