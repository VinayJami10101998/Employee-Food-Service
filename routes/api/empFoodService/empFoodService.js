const models = require('../../../models');
const empFoodService = require('../../../config/emp-food-category.json');

exports.lookUpFoodService = function (req, res) {
	res.send({ success: true, category: empFoodService.category });
}

exports.get = function (req, res) {
	models.EmpFoodService.findOne({
		where: {
			id: req.params.id
		}
	}).then(empFoodService => {
		return res.send({ success: true, empFoodService: empFoodService });
	}).catch(err => {
		console.log('Error in EmpFoodService get API: ', err, err.stack);
		return res.send({ success: false, error: 'Unable to get foodservice records' });
	});
}

exports.getIssuedFoodServices = function (req, res) {
	if(!req.params.id) {
		return res.send({ success: false, error: 'Employee missing'});
	}
	models.EmpFoodService.findAll({
		where: {
			employee: { id: req.params.id }
		}
	}).then(empFoodServices => {
		return res.send({ success: true, results: empFoodServices });
	}).catch(err => {
		console.log('Error in EmpFoodService getIssuedFoodServices API: ', err, err.stack);
		return res.send({ success: false, error: 'Unable to get issued foodservices' });
	});
}

exports.create = function (req, res) {
	if (!req.body.category || !req.body.noOfDays || !req.body.employeeId) {
		return res.send({ success: false, error: 'Input All feilds' });
	}

	models.Employee.findOne({
		attributes: ['id', 'number', 'firstName', 'lastName'],
		where: {
			id: req.body.employeeId,
			status: 'Active'
		}
	}).then(Employee => {
		if (!Employee) {
			return res.send({ success: false, error: 'Employee does not exist or inactive' });
		}

		let employeeDetails = {
			id: Employee.id,
			number: Employee.number,
			firstName: Employee.firstName,
			lastName: Employee.lastName
		};

		let packageFee = 0;
		if (req.body.category == 1) { //1 - Indian
			packageFee = 25.65
		} else if (req.body.category == 2) { //2 - Chinese
			packageFee = 20.00
		} else if (req.body.category == 3) { //3 - Italian
			packageFee = 18.90
		} else if (req.body.category == 4) { // 4 - Lebanese
			packageFee = 18.65
		} else if (req.body.category == 5) { // 5 - Japanese
			packageFee = 22.00
		}

		let totalPackageFee = packageFee * req.body.noOfDays;

		models.EmpFoodService.create({
			category: req.body.category,
			noOfDays: req.body.noOfDays,
			packageFee: totalPackageFee,
			employee: Object.assign({ issuedAt: Date.now() }, employeeDetails)
		}).then(empFoodService => {
			return res.send({ success: true, empFoodService: empFoodService });
		}).catch(err => {
			console.log(`Error in EmpFoodService create API: ${err} ${err.stack}`);
			return res.send({ success: false, error: 'Error assigning foodservice' });
		});
	});
}

exports.update = function (req, res) {

	if(!req.params.id) {
		return res.send({ success: false, error: 'Food Category not found'});
	}
	if ((!req.body.feedbackDate && !req.body.feedbackNotes) && 
		(!req.body.category || !req.body.noOfDays || !req.body.employeeId)
	) {
		return res.send({ success: false, error: 'Input all feilds' });
	}
	if(res.locals.employeeId != req.body.employeeId) {
		return res.send({ success: false, error: 'Unauthorized access'});
	}

	Promise.all([
		models.Employee.findOne({
			attributes: ['id', 'number', 'firstName', 'lastName'],
			where: {
				id: req.body.employeeId,
				status: 'Active'
			}
		}),
		models.EmpFoodService.findOne({
			attributes: ['id', 'category', 'noOfDays', 'packageFee', 'feedback'],
			where: {
				id: req.params.id
			}
		})
	]).then(([Employee, empFoodService]) => {
		if(!empFoodService) {
			return res.send({ success: false, error: 'Record not found' });
		}

		let employeeDetails = {
			id: Employee.id,
			number: Employee.number,
			firstName: Employee.firstName,
			lastName: Employee.lastName
		};

		let packageFee = empFoodService.packageFee && Number(empFoodService.packageFee) || 0;
		if (req.body.category == 1) { //1 - Indian
			packageFee = 25.65
		} else if (req.body.category == 2) { //2 - Chinese
			packageFee = 20.00
		} else if (req.body.category == 3) { //3 - Italian
			packageFee = 18.90
		} else if (req.body.category == 4) { // 4 - Lebanese
			packageFee = 18.65
		} else if (req.body.category == 5) { // 5 - Japanese
			packageFee = 22
		}
		let feedback = empFoodService.feedback && Object.keys(empFoodService.feedback).length > 0 ? empFoodService.feedback : {};
		if(req.body.feedbackDate && req.body.feedbackNotes) {
			feedback = {
				date: new Date(req.body.feedbackDate),
				notes: req.body.feedbackNotes
			}
		}
		
		if(!req.body.feedbackDate && !req.body.feedbackNotes) {
			empFoodService.category = req.body.category;
			empFoodService.noOfDays = req.body.noOfDays;
			empFoodService.packageFee = req.body.noOfDays * packageFee;
		}
		empFoodService.feedback = feedback;
		empFoodService.employee = Object.assign({ issuedAt: Date.now() }, employeeDetails)
		empFoodService.save().then(newData => {
			return res.send({ success: true, empFoodService: newData });
		});
	}).catch(err => {
		console.log(`Error in EmpFoodService create API: ${err} ${err.stack}`);
		return res.send({ success: false, error: 'Error updating foodservice' });
	});
}

exports.delete = function(req, res) {
	if(!req.params.id) {
		return res.send({ success: false, error: 'Food Service record missing' });
	}
	if(['Admin'].indexOf(res.locals.role) == -1) {
		return res.send({ success: false, error: 'Unauthorized access' });
	}
	models.EmpFoodService.destroy({
		where: {
			id: req.params.id
		}
	}).then(delCount => {
		if (delCount > 0) {
			return res.send({ success: true, rowsDeleted: delCount });
		} else {
			return res.send({ success: false, rowsDeleted: delCount, error: 'Food Service record not found' });
		}
	}).catch(err => {
		console.log('Error in EmpFoodService delete API: ', err, err.stack);
		return res.send({ success: false, error: 'Unable to delete foodservice' });
	});
}