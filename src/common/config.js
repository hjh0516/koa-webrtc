const dotenv = require('dotenv');
dotenv.config();

exports.Config = {
  database_host: process.env.DATABASE_HOST || 'localhost',
  database_port: process.env.DATABASE_PORT || '3306',
  database: process.env.DATABASE || '',
  database_user: process.env.DATABASE_USER || '',
  database_password: process.env.DATABASE_PASSWORD || '',
};
exports.setDomain = function(domain, ismain=false) {
  global.domain = domain;
  if (ismain) global.database = domain;
  else global.database = 'domain_' + domain;
};
