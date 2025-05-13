const bodyParser = require('body-parser');
const express = require('express');
const fs = require('fs');
const zlib = require('zlib');
const path = require('path');
const asyncfs = require('fs').promises;
const uuid = require('uuid');
const database = require('./database.js');
const Settings = database.Settings;
const PayloadFireResults = database.PayloadFireResults;
const CollectedPages = database.CollectedPages;
const InjectionRequests = database.InjectionRequests;
const sequelize = database.sequelize;
const notification = require('./notification.js');
const api = require('./api.js');
const validate = require('express-jsonschema').validate;
const constants = require('./constants.js');

function set_secure_headers(req, res) {
	res.set("X-XSS-Protection", "mode=block");
	res.set("X-Content-Type-Options", "nosniff");
	res.set("X-Frame-Options", "deny");

	if (req.path.startsWith(constants.API_BASE_PATH)) {
		res.set("Content-Security-Policy", "default-src 'none'; script-src 'none'");
		res.set("Content-Type", "application/json");
		return
	}
}

async function check_file_exists(file_path) {
	return asyncfs.access(file_path, fs.constants.F_OK).then(() => {
		return true;
	}).catch(() => {
		return false;
	});
}

// Load XSS payload from file into memory
const XSS_PAYLOAD = fs.readFileSync(
	'./probe.js',
	'utf8'
);

var multer = require('multer');
var upload = multer({ dest: '/tmp/' })
const SCREENSHOTS_DIR = path.resolve(process.env.SCREENSHOTS_DIR || './screenshots');
const SCREENSHOT_FILENAME_REGEX = new RegExp(/^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}\.png$/i);

async function get_app_server() {
	const app = express();
	app.set('case sensitive routing', true);

    app.use(async function(req, res, next) {
		if(req.path.toLowerCase() === req.path) {
			next();
			return
		}

		res.status(401).json({
			"success": false,
			"error": "No.",
			"code": "WHY_ARE_YOU_SHOUTING"
		}).end();
    });

	app.use(bodyParser.json());

    app.use(async function(req, res, next) {
    	set_secure_headers(req, res);
    	next();
    });

    // [...] (rest of the code remains the same)

	if(!constants.useHTTPS) {
		console.log("✅ HTTPS desactivado, usando Render HTTPS por defecto");
		app.listen(constants.httpPort, () => {
			console.log("Servidor escuchando en puerto:", constants.httpPort);
		});
	}

	return app;
}

module.exports = get_app_server;

