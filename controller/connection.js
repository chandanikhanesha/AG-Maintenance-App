const { Client } = require("pg");

const client = new Client({
  user: process.env.PRODUCT_DATABASE_USER,
  database: process.env.PRODUCT_DATABASE_NAME,
  host: process.env.PRODUCT_DATABASE_HOST,
  password: process.env.PRODUCT_DATABASE_PASSWORD,
  port: process.env.PRODUCT_DATABASE_PORT || 5432,
  // ssl: {
  //   rejectUnauthorized: false,
  // },
});

// API DB
const client2 = new Client({
  user: process.env.API_DB_DATABASE_USER,
  database: process.env.API_DB_DATABASE_NAME,
  host: process.env.API_DB_DATABASE_HOST,
  password: process.env.API_DB_DATABASE_PASSWORD,
  port: process.env.API_DB_DATABASE_PORT || 5432,
  // ssl: {
  //   rejectUnauthorized: false,
  // },
});

module.exports = { client2, client };
