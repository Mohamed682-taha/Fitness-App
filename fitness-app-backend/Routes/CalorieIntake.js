const express = require('express');
const router = express.Router();
const authTokenHandler = require('../Middlewares/checkAuthToken');
const jwt = require('jsonwebtoken');
const errorHandler = require('../Middlewares/errorMiddleware');
// to call API
const request = require('request');
const User = require('../Models/UserSchema');
require('dotenv').config();


function createResponse(ok, message, data) {
  return {
    ok,
    message,
    data,
  };
}


router.post('/addcalorieintake', authTokenHandler, async (req, res) => {
  const { item, date, quantity, quantitytype } = req.body;
  if (!item || !date || !quantity || !quantitytype) {
    return res.status(400).json(createResponse(false, 'Please provide all the details'));
  }
  let qtyingrams = 0;  
  if (quantitytype === 'g') {
    qtyingrams = quantity;
  }
  //convert from kg to gm
  else if (quantitytype === 'kg') {
    qtyingrams = quantity * 1000;
  }
  else if (quantitytype === 'ml') {
    qtyingrams = quantity;
  }
  else if (quantitytype === 'l') {
    qtyingrams = quantity * 1000;
  }
  else {
    return res.status(400).json(createResponse(false, 'Invalid quantity type'));
  }

  // i want to get for example details for rice(item which user enters)
  var query = item;
  request.get({
    url: 'https://api.api-ninjas.com/v1/nutrition?query=' + query,
    headers: {
      'X-Api-Key': process.env.NUTRITION_API_KEY,
    },
  }, async function (error, response, body) {
    if (error) return console.error('Request failed:', error);
    else if (response.statusCode != 200) return console.error('Error:', response.statusCode, body.toString('utf8'));
    else {

      // string to object
      body = JSON.parse(body);
      // we are getting calorie for 1 gram then multiplying it with my quantity
      let calorieIntake = (body[0].calories / body[0].serving_size_g) * parseInt(qtyingrams);
      const userId = req.userId;
      const user = await User.findOne({ _id: userId });
      user.calorieIntake.push({
        item,
        date: new Date(date),
        quantity,
        quantitytype,
        calorieIntake: parseInt(calorieIntake)
      })

      await user.save();
      res.json(createResponse(true, 'Calorie intake added successfully'));
    }
  });

})


router.post('/getcalorieintakebydate', authTokenHandler, async (req, res) => {
  const { date } = req.body;
  const userId = req.userId;
  const user = await User.findById({ _id: userId });
  if (!date) {

    let date = new Date();
    user.calorieIntake = filterEntriesByDate(user.calorieIntake, date);

    return res.json(createResponse(true, 'Calorie intake for today', user.calorieIntake));
  }
  user.calorieIntake = filterEntriesByDate(user.calorieIntake, new Date(date));
  res.json(createResponse(true, 'Calorie intake for the date', user.calorieIntake));

})


router.post('/getcalorieintakebylimit', authTokenHandler, async (req, res) => {
  const { limit } = req.body;
  const userId = req.userId;
  const user = await User.findById({ _id: userId });
  if (!limit) {
    return res.status(400).json(createResponse(false, 'Please provide limit'));
  } else if (limit === 'all') {
    return res.json(createResponse(true, 'Calorie intake', user.calorieIntake));
  }
  else {


    let date = new Date();
    // will go 10 days before the current date
    // what date it will be in last seventh day and convert it to milliseconds
    let currentDate = new Date(date.setDate(date.getDate() - parseInt(limit))).getTime();
    // 1678910

    user.calorieIntake = user.calorieIntake.filter((item) => {
      return new Date(item.date).getTime() >= currentDate;
    })

    return res.json(createResponse(true, `Calorie intake for the last ${limit} days`, user.calorieIntake));
  }
})


router.delete('/deletecalorieintake', authTokenHandler, async (req, res) => {
  const { item, date } = req.body;
  if (!item || !date) {
    return res.status(400).json(createResponse(false, 'Please provide all the details'));
  }

  const userId = req.userId;
  const user = await User.findById({ _id: userId });


  user.calorieIntake = user.calorieIntake.filter((entry) => {
    return entry.date.toString() !== new Date(date).toString()
  })
  await user.save();
  res.json(createResponse(true, 'Calorie intake deleted successfully'));

})


router.get('/getgoalcalorieintake', authTokenHandler, async (req, res) => {
  const userId = req.userId;
  const user = await User.findById({ _id: userId });
  let maxCalorieIntake = 0;
  let heightInCm = parseFloat(user.height[user.height.length - 1].height); //latest
  let weightInKg = parseFloat(user.weight[user.weight.length - 1].weight);
  let age = new Date().getFullYear() - new Date(user.dob).getFullYear();
  let BMR = 0;
  let gender = user.gender;
  if (gender == 'male') {
    BMR = 88.362 + (13.397 * weightInKg) + (4.799 * heightInCm) - (5.677 * age)
  }

  else {
    BMR = 447.593 + (9.247 * weightInKg) + (3.098 * heightInCm) - (4.330 * age)

  }
  if (user.goal == 'weightLoss') {
    maxCalorieIntake = BMR - 500;
  }
  else if (user.goal == 'weightGain') {
    maxCalorieIntake = BMR + 500;
  }
  else {
    maxCalorieIntake = BMR;
  }

  res.json(createResponse(true, 'max calorie intake', { maxCalorieIntake }));

})


function filterEntriesByDate(entries, targetDate) {
  return entries.filter(entry => {
    const entryDate = new Date(entry.date);
    return (
      entryDate.getDate() === targetDate.getDate() &&
      entryDate.getMonth() === targetDate.getMonth() &&
      entryDate.getFullYear() === targetDate.getFullYear()
    );
  });
}
module.exports = router;

