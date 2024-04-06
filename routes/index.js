const express = require('express');
const router = express.Router();
const models = require('../models');
const moment = require('moment');
const { Op } = require("sequelize");
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const securityConf = require('../config/security.json');

function getSessionSecret(req, callback) {
	var decoded = jwt.decode(req.cookies['SessionToken'], { complete: true });
	var id = -1;
	if (decoded != null) {
		id = decoded.payload.id
		console.log('decoded', decoded)
	}
	secret = securityConf.session.secret;
	callback(secret)
}

function requireLogin(req, res, next) {
	getSessionSecret(req, function (secret) {
		console.log('secret', secret)
		jwt.verify(req.cookies['SessionToken'], secret, function (err, decoded) {
			if (err) {
				res.status(403);
				res.set('Clear-Site-Data', '"storage"');
				res.clearCookie('SessionToken');
				res.redirect('/login?error=Not Authorized&repath=' + req.path);
			} else {
				res.locals.employeeId = decoded.id;
				res.locals.username = decoded.username;
				res.locals.employeeName = decoded.firstName;
				res.locals.department = decoded.department;
				res.locals.role = decoded.role;
				next();
			}
		});
	});
}

router.get('/', function (req, res) {
	res.redirect('/login');
});

router.get('/login', function (req, res) {
	let repath = 'employee';
	res.render('login', { title: 'Login', repath: repath });
});

router.post('/login', function (req, res) {
	if (!req.body.username || !req.body.password) {
		res.status(401);
		res.send({ success: false, error: 'fields left empty' });
	} else {
		models.Employee.findOne({
			attributes: ['id', 'number', 'username', 'password', 'firstName', 'lastName', 'department', 'role', 'status'],
			where: {
				username: {
					[Op.iLike]: req.body.username
				},
				status: ['Active']
			},
		}).then(function (Employee) {
			if (!Employee) {
				res.status(401);
				res.send({ success: false, error: 'username not found' });
			} else {
				bcrypt.compare(req.body.password, Employee.password, function (err, match) {
					if (!match) {
						res.status(401);
						res.send({ success: false, error: 'password incorrect', data: {} });
					} else {
						let token = jwt.sign(buildReplyUser(Employee), securityConf.session.secret, {expiresIn: '1h'});
						console.log('token', token)
						res.cookie('SessionToken', token, { httpOnly: true });
						let data = buildReplyUser(Employee);
						res.send(data);
					}
				});
			}
		}).catch(err => {
			console.log(`${moment().format()} - Error in login ${err} ${err.stack}`);
			res.send({ success: false, error: 'Error fetching data' });
		});
	}
});

router.get('/logout', function (req, res) {
	res.set('Clear-Site-Data', '"storage"');
	res.clearCookie('SessionToken')
	res.redirect('/login');
});

router.get('/employee', requireLogin, function (req, res) {
	res.render('employee', { title: 'Employee Master', sidebar: false, menubar: true });
});

function buildReplyUser(employee) {
	let replyUser = {};
	replyUser = employee.dataValues;
	delete replyUser.password;
	return replyUser;
}

module.exports = router;