const mysql = require('mysql2');
const Config = require('./config.js');

const connection = (multipleStatements = false) => {
  return mysql
    .createConnection({
      host: Config.Config.database_host,
      user: Config.Config.database_user,
      port : Number(Config.Config.database_port), 
      database: global.database ?? Config.Config.database,
      password: Config.Config.database_password,
      multipleStatements: multipleStatements
    })
    .promise();
};

exports.excutReader = async function(
  qry,
  condition = [], multipleStatements = false) {
  try {
    const conn = connection(multipleStatements);
    try {
      const rows = await conn.query(qry, condition);
      if (rows[0] ==false)
        rows[0] = null;
      return rows[0];
    } catch (err) {
      console.log('excutReader Query Error');
      console.log(err);
      return false;
    }
  } catch (err) {
    console.log('DB Error');
    return false;
  }
};

exports.excutNonQuery = async function(
  qry,
  condition = [], multipleStatements = false) {
  try {
    const conn = connection(multipleStatements);
    try {
      const rows = await conn.query(qry, condition);
      return rows[0];
    } catch (err) {
      console.log('excutNonQuery Query Error');
      return false;
    }
  } catch (err) {
    console.log(err);
    console.log('DB Error');
    return false;
  }
};
