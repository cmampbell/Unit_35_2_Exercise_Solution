/** Database setup for BizTime. */

const { Client } = require("pg");
require("dotenv").config();

let DB_URI = (process.env.NODE_ENV === 'test') 
        ? `postgresql://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}/biztime_test` : `postgresql://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}/biztime`;

const db = new Client({connectionString: DB_URI})

db.connect();

module.exports = db;