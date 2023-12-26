const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { check, validationResult } = require('express-validator');
const config = require('config');
const auth = require('../../middleware/auth');

const Customer = require('../../models/Customer');

// @route GET api/auth
// @desc Get authorized user
// @access Private
router.get('/', auth, async (req, res) => {
	try {
		const customer = await Customer.findById(req.customer.id).select(
			'-password'
		);
		res.json(customer);
	} catch (err) {
		console.error(err.message);
		res.status(500).send('Server Error');
	}
});

// @route POST api/auth
// @desc authenticate customer and get token
// @access Public
router.post(
	'/',

	//validation
	[
		check('email', 'Please include a valide email').isEmail(),
		check('password', 'Password is required').exists(),
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

		const { email, password } = req.body;

		try {
			//check if customer exists
			let customer = await Customer.findOne({ email });

			if (!customer) {
				return res.status(400).json({
					errors: [{ msg: 'Invalid Credentials' }],
				});
			}

			//check if the password matched
			const isMatch = await bcrypt.compare(password, customer.password);

			if (!isMatch) {
				return res.status(400).json({
					errors: [{ msg: 'Invalid Credentials' }],
				});
			}

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
				{ expiresIn: 360000 },
				(err, token) => {
					if (err) throw err;
					res.json({ token, isAdmin: customer.isAdmin });
				}
			);
		} catch (err) {
			console.log(err.message);
			res.status(500).send('Server Error');
		}
	}
);

module.exports = router;
