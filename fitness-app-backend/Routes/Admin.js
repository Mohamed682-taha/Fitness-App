const express = require('express');
const router = express.Router();
const Admin = require('../Models/AdminSchema'); // Import the Admin model
const bcrypt = require('bcrypt');
const errorHandler = require('../Middlewares/errorMiddleware');
const adminTokenHandler = require('../Middlewares/checkAdminToken');

const jwt = require('jsonwebtoken');

function createResponse(ok, message, data) {
  return {
    ok,
    message,
    data,
  };
}

router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    const existingAdmin = await Admin.findOne({ email });

    if (existingAdmin) {
      return res.status(409).json(createResponse(false, 'Admin with this email already exists'));
    }

    const newAdmin = new Admin({
      name,
      email,
      password
    });

    await newAdmin.save();

    res.status(201).json(createResponse(true, 'Admin registered successfully'));
  } catch (err) {
    next(err);
  }
});


router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const admin = await Admin.findOne({ email });

    if (!admin) {
      return res.status(400).json(createResponse(false, 'Invalid admin email'));
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(400).json(createResponse(false, 'Invalid admin password'));
    }

    const adminAuthToken = jwt.sign({ adminId: admin._id }, process.env.JWT_ADMIN_SECRET_KEY, { expiresIn: '10m' });
    res.cookie('adminAuthToken', adminAuthToken, { httpOnly: true });
    res.status(200).json(createResponse(true, 'Admin login successful', { adminAuthToken }));
  } catch (err) {
    next(err);
  }
});


router.use(errorHandler)

module.exports = router;