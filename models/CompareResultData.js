const mongoose = require('mongoose');

const CompareResultDataScehma = new mongoose.Schema({
	appName: {
		type: String,
	},
	releaseLabel: {
		type: String,
	},
	companyName: {
		type: String,
	},
	scriptIncludeList: {
		type: [String],
	},
	clientScriptList: {
		type: [String],
	},
	businessRuleList: {
		type: [String],
	},
	date: {
		type: Date,
		default: Date.now,
	},
});

module.exports = CompareResultData = mongoose.model(
	'compareResult',
	CompareResultDataScehma
);
