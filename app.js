const express = require('express');
const path = require('path');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');

const Sequelize = require("sequelize");
const env = process.env.NODE_ENV || "development";
const config = require('./config/db.json')[env];
const sequelize = new Sequelize(config.database, config.username, config.password, config);

sequelize.authenticate()
	.then(() => console.log('Database connected...'))
	.catch(err => console.log('Error: ' + err))

const app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true, parameterLimit: 100000 }));
app.use(cookieParser());

app.use(function (req, res, next) {
	res.setHeader('X-Frame-Options', 'SAMEORIGIN');
	next();
});

app.use(require('less-middleware')(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public')));

app.all('*', function (req, res, next) {
	res.header("Access-Control-Allow-Origin", "http://localhost:4040/");
	res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
	res.header("Access-Control-Allow-Headers", "X-Requested-With, Accept, Origin, Content-Type");
	next();
});

app.locals.moment = require('moment');


app.use('/', require('./routes/index'));

app.use('/employees', require('./routes/api/employee'));
app.use('/empFoodServices', require('./routes/api/empFoodService'));

const PORT = process.env.PORT || 4040;
app.set('port', PORT);
app.listen(PORT, console.log(`Server started on port ${PORT}`));

module.exports = app;