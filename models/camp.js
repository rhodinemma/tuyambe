const mongoose = require('mongoose');
const campSchema = new mongoose.Schema({
	name: {
		type: String,
		required: true,
	},
	phone: {
		type: String,
		required: true,
	},
	location: {
		type: String,
		required: true,
	},
	category: {
		type: String,
		required: true,
	},
	title: {
		type: String,
		required: true,
	},
	amount: {
		type: String,
		required: true,
	},
	image: {
		type: String,
		required: true,
	},
	story: {
		type: String,
		required: true,
	},
	created: {
		type: Date,
		required: true,
		default: new Date(),
	},
});

module.exports = mongoose.model('Camp', campSchema);