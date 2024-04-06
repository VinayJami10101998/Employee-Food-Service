"use strict";

const Sequelize = require("sequelize");
const bcrypt = require('bcryptjs');
const env = process.env.NODE_ENV || "development";
const config = require('../config/db.json')[env];
const sequelize = new Sequelize(config.database, config.username, config.password, config);

const Employee = sequelize.define("Employee", {
	id: {
		type: Sequelize.BIGINT,
		allowNull: false,
		primaryKey: true,
		autoIncrement: true
	},
	number: Sequelize.STRING,
	username: Sequelize.STRING,
	password: Sequelize.STRING,
	firstName: Sequelize.STRING,
	lastName: Sequelize.STRING,
	status: {
		type: Sequelize.ENUM,
		values: ['Active']
	},
	department: {
		type: Sequelize.ENUM,
		values: ['Accounts', 'IT', 'Sales', 'Service']
	},
	role: {
		type: Sequelize.ENUM,
		values: ['Admin', 'Manager', 'User']
	},
	designation: Sequelize.STRING,
	dateOfBirth: {
		type: Sequelize.DATE,
		validate: {
			isDate: true
		}
	},
	dateOfJoining: {
		type: Sequelize.DATE,
		validate: {
			isDate: true
		}
	},
	officePhone: Sequelize.STRING, // company phone 
	personalPhone: Sequelize.STRING, // primary phone 
	officeEmail: Sequelize.STRING,
	personalEmail: Sequelize.STRING,
    manager: {
        type: Sequelize.JSONB,
        defaultValue: {} //id, firstName, lastName, number
    }
});
Employee.sync().then(() => {
	console.log('Employee table created');
});

const EmpFoodService = sequelize.define("EmpFoodService", {
	category: Sequelize.INTEGER, //dropdown
	noOfDays: Sequelize.INTEGER,
	packageFee: {
		type: Sequelize.NUMERIC(12, 2),
		defaultValue: 0
	},
	employee: { // issuedToEmployee
		type: Sequelize.JSONB,
		defaultValue: {}
    },
	feedback: {
		type: Sequelize.JSONB,
		defaultValue: {}
	}
});
EmpFoodService.sync().then(() => {
	console.log('EmpFoodService table created');
});

module.exports = {
	Employee: Employee,
	EmpFoodService: EmpFoodService
}