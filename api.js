const bcrypt = require('bcrypt');
const express = require('express');
const cors = require('cors');
const path = require('path');
const uuid = require('uuid');
const asyncfs = require('fs').promises;
const sessions = require('@nvanexan/node-client-sessions');
const favicon = require('serve-favicon');

const database = require('./database.js');
const safeCompare = require('safe-compare');
const { Op } = require("sequelize");
const sequelize = database.sequelize;
const Settings = database.Settings;
const PayloadFireResults = database.PayloadFireResults;
const CollectedPages = database.CollectedPages;
const InjectionRequests = database.InjectionRequests;
const update_settings_value = database.update_settings_value;
const constants = require('./constants.js');
const validate = require('express-jsonschema').validate;
const get_hashed_password = require('./utils.js').get_hashed_password;
const get_secure_random_string = require('./utils.js').get_secure_random_string;

const SCREENSHOTS_DIR = path.resolve(process.env.SCREENSHOTS_DIR || './screenshots');

var sessions_middleware = false;
var sessions_settings_object = {
    cookieName: 'session',
    duration: 7 * 24 * 60 * 60 * 1000, // Default session time is a week
    activeDuration: 1000 * 60 * 5, // Extend for five minutes if actively used
    cookie: {
        httpOnly: true,
        secure: true
    }
};

function session_wrapper_function(req, res, next) {
    return sessions_middleware(req, res, next);
}

async function set_up_api_server(app) {
    const session_secret_setting = await Settings.findOne({
        where: {
            key: constants.session_secret_key
        }
    });

    if (!session_secret_setting) {
        console.error(`No session secret is set, can't start API server.`);
        throw new Error('NO_SESSION_SECRET_SET');
    }

    const updated_session_settings = {
        ...sessions_settings_object,
        ...{
            secret: session_secret_setting.value
        }
    };
    sessions_middleware = sessions(updated_session_settings);

    app.use(session_wrapper_function);

    app.use(async function(req, res, next) {
        if (!req.path.startsWith(constants.API_BASE_PATH)) {
            next();
            return;
        }

        const csrf_header_value = req.header(constants.csrf_header_name);
        if (!csrf_header_value) {
            res.status(401).json({
                "success": false,
                "error": "No CSRF header specified, request rejected.",
                "code": "CSRF_VIOLATION"
            }).end();
            return;
        }
        next();
    });

    app.use(async function(req, res, next) {
        const AUTHENTICATION_REQUIRED_ROUTES = [
            constants.API_BASE_PATH + 'payloadfires',
            constants.API_BASE_PATH + 'collected_pages',
            constants.API_BASE_PATH + 'settings',
        ];

        let requires_authentication = AUTHENTICATION_REQUIRED_ROUTES.some(route =>
            req.path.toLowerCase().startsWith(route)
        );

        if (!requires_authentication || req.session.authenticated === true) {
            next();
            return;
        }

        res.status(401).json({
            "success": false,
            "error": "You must be authenticated to use this endpoint.",
            "code": "NOT_AUTHENTICATED"
        }).end();
    });

    app.use('/admin/', express.static(
        path.resolve('./front-end/dist/'),
        {
            setHeaders: function (res) {
                res.set("Content-Security-Policy", "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self'; font-src 'self'; connect-src 'self'; prefetch-src 'self'; manifest-src 'self'");
            },
        },
    ));
    app.use(favicon(path.resolve('./front-end/dist/favicon.ico')));

    // (Resto del código permanece igual sin necesidad de cambios funcionales)
}

module.exports = {
    set_up_api_server
};
