const models = require('../../../models/index');
const moment = require('moment');
const { Op } = require("sequelize");
const bcrypt = require('bcrypt');

exports.list = function (req, res) {
	let whereStatement = {};
	whereStatement.status = {
		[Op.in]: ['Active']
	}
	if (req.query.dept) {
		whereStatement.department = req.query.dept;
	}
	models.Employee.findAll({
		attributes: {
			exclude: ['password']
		},
		where: whereStatement
	}).then(Employees => {
		return res.send({ success: true, results: Employees });
	}).catch(err => {
		console.log(`${moment().format()} - Error in Employee list API - ${err} ${err.stack}`);
		return res.send({ success: false, error: 'Error fetching data' });
	});
}

exports.listActiveEmployees = function(req, res) {
	models.Employee.findAll({
		attributes: ['id', 'number', 'firstName', 'lastName', 'role'],
		where: {
			status: 'Active'
		}
	}).then(Employers => {
		return res.send({ success: true, results: Employers });
	}).catch(err => {
		console.log(`${moment().format()} - Error in listAllEmployees API ${err} ${err.stack}`);
		return res.send({ success: false, error: 'Error fetching data'});
	});
}

exports.listEmployers = function(req, res) {
	models.Employee.findAll({
		attributes: ['id', 'number', 'firstName', 'lastName', 'role'],
		where: {
			role: {
				[Op.in]: ['Admin', 'Manager']
			}
		}
	}).then(Employers => {
		return res.send({ success: true, results: Employers });
	}).catch(err => {
		console.log(`${moment().format()} - Error in listEmployers API ${err} ${err.stack}`);
		return res.send({ success: false, error: 'Error fetching data'});
	});
}

//listDepartment
exports.lookUpDepartment = function (req, res) {
	let department = models.Employee.rawAttributes.department.values;
	let departmentObj = [];
	department.forEach(obj => {
		departmentObj.push({
			id: obj,
			text: obj
		});
	})
	return res.send({ success: true, department: department, departmentObj: departmentObj });
}

//listRole
exports.lookUpRole = function (req, res) {
	let role = models.Employee.rawAttributes.role.values;
	let roleObj = [];
	role.forEach(obj => {
		roleObj.push({
			id: obj,
			text: obj
		});
	})
	return res.send({ success: true, role: role, roleObj: roleObj });
}

exports.get = function (req, res) {
	if (!req.params.id) {
		return res.send({ success: false, error: 'EmployeeId missing' });
	}
	models.Employee.findOne({
		attributes: {
			exclude: ['password']
		},
		where: {
			id: req.params.id
		}
	}).then(Employee => {
		return res.send({ success: true, results: Employee || {} });
	}).catch(err => {
		console.log(`${moment().format()} - Error in Employee get API - ${err}`);
		return res.send({ success: false, error: 'Error fetching data' });
	});
}

exports.create = function (req, res) {
	//#region validate
	if (!req.body.number || !req.body.username || !req.body.password) {
		return res.send({ success: false, error: 'fields left empty', message: 'fields left empty' });
	}
	if (isNaN(req.body.number)) {
		return res.send({ success: false, message: 'Incorrect Employee Number' });
	}
	if (!req.body.officeEmail && !req.body.personalEmail) {
		return res.send({ success: false, message: 'Email fields left empty' });
	}
	if (req.body.password.length < 5) {
		return res.send({ success: false, message: 'password too short. Should be atleast 5 characters.' });
	}
	if (req.body.username.length < 2) {
		return res.send({ success: false, message: 'username too short' });
	}
	//#endregion

	hashPassword(req.body.password, function (err, hash) {
		if (err) {
			console.log(`${moment().format()} - Error hashing password - ${err}`);
			return res.send({ success: false, error: 'Error hashing password' });
		}

		Promise.all([
			models.Employee.findOne({
				attributes: ['id', 'username'],
				where: {
					username: {
						[Op.iLike]: req.body.username
					}
				}
			}),
			models.Employee.findOne({
				attributes: ['id', 'number', 'firstName', 'lastName'],
				where: {
					id: req.body.ManagerId,
					status: "Active"
				}
			})
		]).then(([Employee, Manager]) => {
			if (Employee) {
				return res.send({ success: false, error: 'username already taken' });
			}
			if (!Manager) {
				return res.send({ success: false, error: 'Manager not found or inactive.' });
			}

			let data = {
				number: req.body.number,
				username: req.body.username,
				password: hash, // Using hashed password here
				status: 'Active',
				firstName: req.body.firstName,
				lastName: req.body.lastName,
				department: req.body.department,
				role: req.body.role,
				designation: req.body.designation,
				dateOfBirth: req.body.dateOfBirth && new Date(req.body.dateOfBirth) ? new Date(req.body.dateOfBirth) : null,
				dateOfJoining: req.body.dateOfJoining && new Date(req.body.dateOfJoining) ? new Date(req.body.dateOfJoining) : null,
				officePhone: req.body.officePhone, // company phone 
				personalPhone: req.body.personalPhone, // primary phone 
				officeEmail: req.body.officeEmail,
				personalEmail: req.body.personalEmail,
				manager: {
					id: Manager.id,
					name: Manager.firstName + " - " + Manager.number
				}
			};
			models.Employee.create(data).then(emp => {
				return res.send({ success: true, message: 'Employee record created' })
			}).catch(err => {
				console.log(`${moment().format()} - Error in Employee create API - ${err}`);
				return res.send({ success: false, error: 'Error creating employee' });
			});
		}).catch(err => {
			console.log(`${moment().format()} - Error in Employee create API - ${err}`);
			return res.send({ success: false, error: 'Error fetching data' });
		});
	});
}

exports.update = function (req, res) {

	if (!req.params.id && req.params.id < 0) {
		return res.send({ success: false, error: 'EmployeeId missing', message: 'EmployeeId missing' });
	}
	if (!req.body.officeEmail && !req.body.personalEmail) {
		return res.send({ success: false, error: 'Email fields left empty', message: 'Email fields left empty' });
	}
	if (!req.body.dateOfJoining) {
		return res.send({ success: false, message: 'Joining Date left empty', error: 'Joining Date left empty' });
	}

	Promise.all([
		models.Employee.findOne({
			attributes: {
				exclude: ['password']
			},
			where: { id: req.params.id }
		}),
		models.Employee.findOne({
			attributes: ['id', 'number', 'firstName', 'lastName'],
			where: {
				id: req.body.ManagerId,
				status: "Active"
			}
		})
	]).then(([Employee, Manager]) => {
		if (!Employee) {
			return res.send({ success: false, error: 'Employee not found', message: 'Employee not found' });
		}
		if (!Manager) {
			return res.send({ success: false, error: 'Manager not found or inactive.' });
		}
		Employee.number = req.body.number;
		Employee.username = req.body.username;
		Employee.status = req.body.status;
		Employee.firstName = req.body.firstName;
		Employee.lastName = req.body.lastName;
		Employee.department = req.body.department;
		Employee.role = req.body.role;
		Employee.designation = req.body.designation;
		Employee.dateOfBirth = req.body.dateOfBirth && new Date(req.body.dateOfBirth) ? new Date(req.body.dateOfBirth) : null;
		Employee.dateOfJoining = new Date(req.body.dateOfJoining);
		Employee.officePhone = req.body.officePhone;
		Employee.personalPhone = req.body.personalPhone;
		Employee.officeEmail = req.body.officeEmail;
		Employee.personalEmail = req.body.personalEmail;
		
		let updateMgr = Employee.Manager && Object.keys(Employee.Manager).length 
			&& JSON.parse(JSON.stringify(Employee.Manager)) || {};
		updateMgr.id = Manager.id;
		updateMgr.name = Manager.firstName + " - " + Manager.number;
		Employee.manager = updateMgr;

		Employee.save().then(employee => {
			return res.send({ success: true, employee: employee });
		}).catch(err => {
			console.log(`${moment().format()} - Error in Employee update API - ${err}`);
			return res.send({ success: false, error: "Error updating Employee." });
		});
	}).catch(err => {
		console.log(`${moment().format()} - Error in Employee update API - ${err}`);
		return res.send({ success: false, error: 'Error fetching Employee data.' });
	});
}

// Function to update password
exports.updatePassword = function (req, res) {

	let updateAccess = [res.locals.role].includes('Admin');
	// Input validation
	if (res.locals.employeeId != req.params.id && !updateAccess) {
		return res.send({ success: false, logout: false, error: 'Not Authorized to change password' });
	} else if (!req.body.newPassword || !req.body.confirmPassword) {
		return res.send({ success: false, logout: false, error: 'Input all feilds' });
	} else if (req.body.newPassword.length < 5) {
		return res.send({ success: false, logout: false, error: 'Password too short' });
	}

	// Find employee by ID
	models.Employee.findOne({
		attributes: ['id', 'firstName', 'lastName', 'number', 'username', 'password'],
		where: {
			id: req.params.id
		}
	}).then(Employee => {
		if (!Employee) {
			return res.send({ success: false, logout: false, error: 'Employee not found' });
		}

		// Hash and update new password
		hashPassword(req.body.newPassword, function (err, hash) {
			if (hash) {
				Employee.password = hash;
				Employee.save().then(emp => {
					res.send({ success: true, logout: true, message: 'Password changed successfully' });
				}).catch(err => {
					res.send({ success: false, logout: false, error: 'Unable to change password' });
				});
			} else {
				res.send({ success: false, logout: false, error: 'Unable to change password' });
			}
		});
	}).catch(err => {
		console.log(`${moment().format()} - Error in Employee updatePassword API: ${err} ${err.stack}`);
		return res.send({ success: false, logout: false, error: 'Unable to change password' });
	});
}

// Function to hash password
function hashPassword(password, callback) {
    bcrypt.genSalt(11, function (err, salt) {
        if (err) {
            callback(err, null);
        } else {
            bcrypt.hash(password, salt, function (err, hash) {
                if (err) {
                    callback(err, null);
                } else {
                    callback(null, hash.toString('hex'));
                }
            });
        }
    });
}