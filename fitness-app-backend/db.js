const mongoose = require('mongoose')
require("dotenv").config()

mongoose.connect(process.env.MONGO_URL)
  .then(() => {
    console.log("connected to Database")
  }).catch((err) => {
    console.log("Error connecting to Database" + err)
  });