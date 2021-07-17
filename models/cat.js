const  mongoose = require('mongoose');
const catSchema = new mongoose.Schema({
	category: {
		type: String,
		required: true,
	},
	image: {
		type: String,
		required: true,
	},
	created: {
		type: Date,
		required: true,
		default: Date.now,
	},
});

module.exports = mongoose.model('Cat', catSchema);