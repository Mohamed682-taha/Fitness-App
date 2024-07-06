const express = require('express');
const router = express.Router();
const User = require('../Models/UserSchema')
const errorHandler = require('../Middlewares/errorMiddleware');
const authTokenHandler = require('../Middlewares/checkAuthToken');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');

//ynql krwk lxpn mpht
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'medotaha804@gmail.com',
    pass: 'ynqlkrwklxpnmpht'
  }
})


function createResponse(ok, message, data) {
  return {
    ok,
    message,
    data,
  };
}

router.post("/register", async (req, res, next) => {
  console.log(req.body);
  try {
    const { name, email, password, weightInKg, heightInCm, gender, dob, goal, activityLevel } = req.body;
    const existingUser = await User.findOne({ email: email });

    if (existingUser) {
      return res.status(409).json(createResponse(false, 'Email already exists'));
    }
    const newUser = new User({
      name,
      password,
      email,
      weight: [
        {
          weight: weightInKg,
          unit: "kg",
          date: Date.now()
        }
      ],
      height: [
        {
          height: heightInCm,
          date: Date.now(),
          unit: "cm"
        }
      ],
      gender,
      dob,
      goal,
      activityLevel
    });
    await newUser.save();

    res.status(201).json(createResponse(true, 'User registered successfully'));

  }
  catch (err) {
    next(err);
  }
})

router.post("/login", async (req, res, next) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json(createResponse(false, 'Invalid Email'));
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json(createResponse(false, 'Invalid Password'));
    }
    const authToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET_KEY, { expiresIn: '50m' });

    res.cookie('authToken', authToken, { httpOnly: true });
    res.status(200).json(createResponse(true, 'Login successful', {
      authToken,
    }));
  }
  catch (err) {
    next(err);
  }
})

router.post("/sendotp", async (req, res,) => {
  try {
    const { email } = req.body;
    // one time password
    const otp = Math.floor(100000 + Math.random() * 900000);

    const mailOptions = {
      from: 'medotaha804@gmail.com',
      to: email,
      subject: 'OTP for verification',
      text: `Your OTP is ${otp}`
    }

    transporter.sendMail(mailOptions, async (err, info) => {
      if (err) {
        console.log(err);
        res.status(500).json(createResponse(false, err.message));
      } else {
        res.json(createResponse(true, 'OTP sent successfully', { otp }));
      }
    });
  }
  catch (err) {
    next(err);
  }
})


router.use(errorHandler)

module.exports = router