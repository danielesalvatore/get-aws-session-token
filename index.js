#!/usr/bin/env node

var fs = require('fs')
var resolve = require('path').resolve
var clear = require('clear');
var inquirer = require('inquirer');
var AWS = require("aws-sdk");
var chalk = require('chalk');
var rimraf = require("rimraf")

const error = chalk.bold.red;
//const warning = chalk.keyword('orange');
const success = chalk.green;
const info = chalk.cyan;

const init = async () => {

    // Clear terminal screen 
    clear();

    // Pre fetch configuration file
    const HOME_DIR = require('os').homedir();
    var CLIENTS_FILE_PATH = resolve(`${HOME_DIR}/clients.json`)
    var MY_AWS_CONF_FILE_PATH = resolve(`${HOME_DIR}/config.template`)
    var MY_TMP_AWS_CONF_FILE_PATH = resolve(`${HOME_DIR}/tmp_config`)
    var AWS_CONF_FILE_PATH = resolve(`${HOME_DIR}/.aws/config`)
    var clientsFile;

    // Check client exist
    try {
        fs.existsSync(CLIENTS_FILE_PATH)
    } catch (err) {
        console.log(error("Configuration file missing! Create your HOME_DIR/clients.json file"))
        return
    }

    // Check clientsFile is a valid json
    try {
        clientsFile = JSON.parse(fs.readFileSync(CLIENTS_FILE_PATH, 'utf8'));
    } catch (err) {
        console.log(error("HOME_DIR/clients.json configuration file seems to be an invalid JSON file!"))
        return
    }

    const clients = Object.keys(clientsFile)
    const hasSeverlalClient = clients.length > 0;

    console.log(info('Hi, let get an AWS session token!'));

    var questions = [
        hasSeverlalClient ?
            {
                type: 'list',
                name: 'client',
                message: 'Which AWS account will you use?',
                choices: clients
            } : null,
        {
            type: 'input',
            name: 'mfa',
            message: 'Insert your MFA code',
            validate: function (value) {
                var valid = !isNaN(parseFloat(value));
                return (valid && String(value).length === 6) || 'Please enter a valid MFA code number (6 digits)';
            }
        }
    ];
    // Remove null steps
    questions = questions.filter(q => !!q)

    // Get info from user
    const answers = await inquirer.prompt(questions);

    const { client } = answers;
    const clientConfig = clientsFile[client];

    const profile = clientConfig.Profile
    if (!!profile) {
        console.log(info(`Using AWS named profile:`), success(profile))
        var credentials = new AWS.SharedIniFileCredentials({ profile });
        AWS.config.credentials = credentials;
    } else {
        console.log(info(`Using AWS named profile:`), success("default"))
    }

    var sts = new AWS.STS();
    var params = {
        DurationSeconds: 12 * 60 * 60, // 12 hours
        SerialNumber: clientConfig.MFASerialNumber,
        TokenCode: String(answers.mfa)
    };

    var result;

    try {
        result = await sts.getSessionToken(params).promise()
    } catch (err) {
        console.log(error(err))
    }

    const { Credentials } = result;
    const { AccessKeyId, SecretAccessKey, SessionToken } = Credentials

    // Create a temp AWS config file
    rimraf.sync(MY_TMP_AWS_CONF_FILE_PATH)
    fs.copyFileSync(MY_AWS_CONF_FILE_PATH, MY_TMP_AWS_CONF_FILE_PATH)

    // Print AWS config file
    fs.appendFileSync(MY_TMP_AWS_CONF_FILE_PATH, '\r\n');
    fs.appendFileSync(MY_TMP_AWS_CONF_FILE_PATH, `[profile ${clientConfig.OutputProfileName}]\r\n`);
    fs.appendFileSync(MY_TMP_AWS_CONF_FILE_PATH, `aws_access_key_id = ${AccessKeyId}\r\n`);
    fs.appendFileSync(MY_TMP_AWS_CONF_FILE_PATH, `aws_secret_access_key = ${SecretAccessKey}\r\n`);
    fs.appendFileSync(MY_TMP_AWS_CONF_FILE_PATH, `aws_session_token = ${SessionToken}\r\n`);

    // Move the newly generated config file to the correct folder
    fs.copyFileSync(MY_TMP_AWS_CONF_FILE_PATH, AWS_CONF_FILE_PATH)

    // Clean up!
    rimraf.sync(MY_TMP_AWS_CONF_FILE_PATH)

    console.log(success("Done!"))
}

init()