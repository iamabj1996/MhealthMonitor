const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { SHA256 } = require('crypto-js');
const jwt = require('jsonwebtoken');
const { check, validationResult } = require('express-validator');
const config = require('config');
const auth = require('../../middleware/auth');

const Customer = require('../../models/Customer');
const ApplicationData = require('../../models/ApplicationData');
const CompareResultData = require('../../models/CompareResultData');

function ignoringSpaces(code) {
	const codeWithoutSpaces = code.replace(/\s/g, ''); // Remove spaces
	return codeWithoutSpaces;
}

function compareArrays(arr1, arr2) {
	// console.log('this ran');
	let totalRecords;
	let totalRecordsMessage;
	let sysIdChanges;
	let scriptChangeAts;

	// console.log('arr1', arr1);
	// console.log('arr2', arr2);

	// check the length
	if (arr1.length != arr2.length) {
		totalRecords = false;
		totalRecordsMessage = arr2.length;
	} else {
		// console.log('this ran2');
		totalRecords = true;
		totalRecordsMessage = arr2.length;

		console.log(totalRecords);

		// comparing each element of array
		let sysIdChange = [];
		let scriptChangeAt = [];
		for (let i = 0; i < arr1.length; i++) {
			// console.log('this ran 3', JSON.parse(arr1[i]).sysId);
			// console.log('objects', arr1[i].sysId);
			if (arr1[i].sysId !== arr2[i].sysId) {
				console.log('change in this sys_id', arr1[i].sysId, arr2[i].sysId);
				// sysIdChange.push(JSON.parse(arr1[i]).sysId);
			}
			sysIdChanges = sysIdChange;

			if (arr1[i].script !== arr2[i].script) {
				console.log('change in the script for sysId with', arr1[i].sysId);
				scriptChangeAt.push(arr1[i].sysId);
			}
			scriptChangeAts = scriptChangeAt;
		}
	}
	return {
		totalRecords,
		totalRecordsMessage,
		sysIdChanges,
		scriptChangeAts,
	};
}

// @route POST api/customers
// @desc register customer
// @access Public
router.post(
	'/',

	//validation
	[
		check('name', 'Name is required').not().isEmpty(),
		check('email', 'Please include a valide email').isEmail(),
		check(
			'password',
			'Please enter a password with 6 or more characters'
		).isLength({ min: 6 }),
	],

	//request response
	async (req, res) => {
		//checking if validation error
		const errors = validationResult(req);

		//if validation error exists
		if (!errors.isEmpty()) {
			return res.status(400).json({
				errors: errors.array(),
			});
		}

		const { name, email, password } = req.body;

		try {
			//check if customer exists
			let customer = await Customer.findOne({ email });

			if (customer) {
				return res.status(400).json({
					errors: [{ msg: 'Customer already exists' }],
				});
			}

			customer = new Customer({
				name,
				email,
				password,
			});

			//encrypt password using bcrypt
			const salt = await bcrypt.genSalt(10);

			customer.password = await bcrypt.hash(password, salt);

			await customer.save();

			//return jsonwebtoken
			const payload = {
				customer: {
					id: customer.id,
					isAdmin: customer.isAdmin,
				},
			};

			jwt.sign(
				payload,
				config.get('jwtSecret'),
				{ expiresIn: 3600 },
				(err, token) => {
					if (err) throw err;
					res.json({ token });
				}
			);
		} catch (err) {
			console.log(err.message);
			res.status(500).send('Server Error');
		}
	}
);

// @route POST api/customers/perform-health-check
// @desc Perform health check for customer
// @access Private (only customer and admin of the application)
router.post('/perform-health-check', auth, async (req, res) => {
	const {
		appName,
		releaseLabel,
		scriptIncludeList,
		clientScriptList,
		businessRuleList,
	} = req.body;

	// console.log('req.body');
	//Build application data object
	const applicationDataField = {};
	if (appName) applicationDataField.appName = appName;
	if (releaseLabel) applicationDataField.releaseLabel = releaseLabel;
	if (scriptIncludeList) {
		//creating encrypted scriptInclude
		const finalEncryptedSI = [];
		scriptIncludeList.map((data) => {
			const removeSpaceFromCode = ignoringSpaces(data.script);
			let newData = {
				sysId: data.sysId,
				script: SHA256(removeSpaceFromCode).toString(),
			};
			finalEncryptedSI.push(newData);
		});

		applicationDataField.scriptIncludeList = finalEncryptedSI;
	}
	if (clientScriptList) {
		//creating encrypted clientscripts
		const finalEncryptedCS = [];
		clientScriptList.map((data) => {
			const removeSpaceFromCode = ignoringSpaces(data.script);
			let newData = {
				sysId: data.sysId,
				script: SHA256(removeSpaceFromCode).toString(),
			};
			finalEncryptedCS.push(newData);
		});

		applicationDataField.clientScriptList = finalEncryptedCS;
	}
	if (businessRuleList) {
		const finalEncryptedBR = [];
		businessRuleList.map((data) => {
			const removeSpaceFromCode = ignoringSpaces(data.script);
			let newData = {
				sysId: data.sysId,
				script: SHA256(removeSpaceFromCode).toString(),
			};
			finalEncryptedBR.push(newData);
		});

		applicationDataField.businessRuleList = finalEncryptedBR;
	}

	try {
		let customer = await Customer.findById(req.customer.id);
		console.log('customer', customer.name);
		//checking if application data exist with given appName & releaseLabel
		let applicationData = await ApplicationData.findOne({
			appName,
			releaseLabel,
		});

		if (applicationData) {
			const { scriptIncludeList, businessRuleList, clientScriptList } =
				applicationData;
			console.log(
				'applicationDataFieldSc',
				applicationDataField.scriptIncludeList
			);

			//compare each table

			const comparedResultForSi = compareArrays(
				applicationDataField.scriptIncludeList,
				scriptIncludeList
			);
			const comparedResultForCs = compareArrays(
				applicationDataField.clientScriptList,
				clientScriptList
			);
			const comparedResultForBr = compareArrays(
				applicationDataField.businessRuleList,
				businessRuleList
			);
			console.log('scriptInclude', comparedResultForSi);
			console.log('clientScript', comparedResultForCs);
			console.log('businessRule', comparedResultForBr);

			const finalComparedResult = new CompareResultData({
				appName,
				releaseLabel,
				companyName: customer.name,
				scriptIncludeList: comparedResultForSi.scriptChangeAts,
				clientScriptList: comparedResultForCs.scriptChangeAts,
				businessRuleList: comparedResultForBr.scriptChangeAts,
			});

			await finalComparedResult.save();

			return res.json(finalComparedResult);
		} else {
			return res.status(400).json({
				msg: 'App with given name and release version does not exist',
			});
		}
	} catch (err) {
		console.error(err.message);
		res.status(500).json({ msg: 'Server Error' });
	}
});

module.exports = router;
