const express = require('express');
const { SHA256 } = require('crypto-js');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const auth = require('../../middleware/auth');

const ApplicationData = require('../../models/ApplicationData');
const CompareResultData = require('../../models/CompareResultData');

function ignoringSpaces(code) {
	const codeWithoutSpaces = code.replace(/\s/g, ''); // Remove spaces
	return codeWithoutSpaces;
}

// @route POST api/owner/add-app-data
// @desc Add data from SN to DB
// @access Private (only admin)
router.post('/add-app-data', auth, async (req, res) => {
	if (!req.customer.isAdmin) {
		return res.json({ msg: 'Not Authorized' });
	}
	const {
		appName,
		releaseLabel,
		scriptIncludeList,
		clientScriptList,
		businessRuleList,
	} = req.body;

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

	console.log('applicationDataField', applicationDataField);

	try {
		//checking if application data exist with given appName & releaseLabel
		let applicationData = await ApplicationData.findOne({
			appName,
			releaseLabel,
		});

		console.log('applicationData', applicationData);

		if (applicationData) {
			//updating the application data in DB
			applicationData = await ApplicationData.findOneAndUpdate(
				{ appName, releaseLabel },
				{ $set: applicationDataField },
				{ new: true }
			);

			return res.json(applicationData);
		}
		//create application data to send to DB
		applicationData = new ApplicationData(applicationDataField);

		await applicationData.save();
		res.json(applicationData);
	} catch (err) {
		console.error(err.message);
		res.status(500).json({ msg: 'Server Error' });
	}
});

// @route GET api/owner/get-app-release-company/:companyName/:releaseLabel/:appName
// @desc Get data from DB (companyName | ReleaseLabel | AppName)
// @access Private (only admin)
router.get(
	'/get-app-release-company/:companyName/:releaseLabel/:appName',
	auth,
	async (req, res) => {
		if (!req.customer.isAdmin) {
			return res.json({ msg: 'Not Authorized' });
		}
		const { companyName, releaseLabel, appName } = req.params;
		try {
			//checking if compare result exist with given appName & releaseLabel & companyName
			let comparedResultData = await CompareResultData.find({
				appName,
				releaseLabel,
				companyName,
			});

			console.log('comparedResultData', comparedResultData);

			res.json(comparedResultData);
		} catch (err) {
			console.error(err.message);
			res.status(500).json({ msg: 'Server Error' });
		}
	}
);

module.exports = router;
