const mongoose = require('mongoose');

const CodeSchema = new mongoose.Schema({
	sysId: {
		type: String,
	},
	script: {
		type: String,
	},
	name: {
		type: String,
	},
});

const ApplicationDataSchema = new mongoose.Schema({
	appName: {
		type: String,
	},
	releaseLabel: {
		type: String,
	},
	scriptIncludeList: {
		type: [CodeSchema],
	},
	clientScriptList: {
		type: [CodeSchema],
	},
	businessRuleList: {
		type: [CodeSchema],
	},
});

module.exports = ApplicationData = mongoose.model(
	'applicationData',
	ApplicationDataSchema
);
