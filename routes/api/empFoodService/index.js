'use strict';

const express = require('express');
const controller = require('./empFoodService');
const router = express.Router();

const jwt = require('jsonwebtoken');
const securityConf = require('../../../config/security.json');


function getSessionSecret(req, callback) {
	var decoded = jwt.decode(req.cookies['SessionToken'], { complete: true });
	var id = -1;
	if (decoded != null) {
		id = decoded.payload.id
	}
	let secret = securityConf.session.secret;
	callback(secret)
}

function requireLogin(req, res, next) {
	getSessionSecret(req, function (secret) {
		jwt.verify(req.cookies['SessionToken'], secret, function (err, decoded) {
			if (err) {
				res.status(403);
                res.send({ success: false, error: 'Not Authorized' });
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

router.get('/list/foodservice', requireLogin, controller.lookUpFoodService);
router.get('/:id([0-9]+)', requireLogin, controller.get);
router.post('/', requireLogin, controller.create);
router.put('/:id([0-9]+)', requireLogin, controller.update);
router.delete('/:id([0-9]+)', requireLogin, controller.delete);
router.get('/issuedServices/:id([0-9]+)', requireLogin, controller.getIssuedFoodServices);

module.exports = router;