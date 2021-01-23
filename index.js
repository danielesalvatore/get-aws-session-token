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
    const AWS_CLI_HOME = `${HOME_DIR}/.aws`
    var CLIENTS_FILE_PATH = resolve(`${AWS_CLI_HOME}/clients.json`)
    var MY_AWS_CONF_FILE_PATH = resolve(`${AWS_CLI_HOME}/config.template`)
    var MY_TMP_AWS_CONF_FILE_PATH = resolve(`${AWS_CLI_HOME}/tmp_config`)
    var AWS_CONF_FILE_PATH = resolve(`${AWS_CLI_HOME}/config`)
    var clientsFile;

    // Check client exist
    try {
        fs.existsSync(CLIENTS_FILE_PATH)
    } catch (err) {
        console.log(error("Configuration file missing! Create your ~/.aws/clients.json file"))
        return
    }

    // Check clientsFile is a valid json
    try {
        clientsFile = JSON.parse(fs.readFileSync(CLIENTS_FILE_PATH, 'utf8'));
    } catch (err) {
        console.log(fs.readFileSync(CLIENTS_FILE_PATH, 'utf8'))
        console.log(error("~/.aws/clients.json configuration file seems to be an invalid JSON file!"))
        return
    }

    const clients = Object.keys(clientsFile)
    const hasSeverlalClient = clients.length > 1;

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

    const { client = clients[0] } = answers;
    const clientConfig = clientsFile[client];

    // Input validation
    if (!clientConfig.MFASerialNumber || !clientConfig.OutputProfileName) {
        console.log(error(`'${client}' client configuration in ~/.aws/clients.json seems to be invalid! Missing one of the mandatory attributes: 'MFASerialNumber', 'OutputProfileName'`))
        return
    }

    // Select AWS profile, if available
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
    fs.appendFileSync(MY_TMP_AWS_CONF_FILE_PAT H, `aws_secret_access_key = ${SecretAccessKey}\r\n`);
    fs.appendFileSync(MY_TMP_AWS_CONF_FILE_PATH, `aws_session_token = ${SessionToken}\r\n`);

    // Optionally add a default region
    const region = clientConfig.Region
    if (!!region) {
        fs.appendFileSync(MY_TMP_AWS_CONF_FILE_PATH, `region = ${region}\r\n`);
    }

    // Move the newly generated config file to the correct folder
    fs.copyFileSync(MY_TMP_AWS_CONF_FILE_PATH, AWS_CONF_FILE_PATH)

    // Clean up!
    rimraf.sync(MY_TMP_AWS_CONF_FILE_PATH)

    console.log()
    console.log(info(`Successfully created new AWS named profile:`), success(clientConfig.OutputProfileName))
    console.log(info(`Use this profile to interact with AWS`))
    console.log()
    console.log(success("Done!"))
}

init()