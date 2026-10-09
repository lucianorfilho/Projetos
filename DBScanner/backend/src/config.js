require('dotenv').config();

module.exports = {
  mode: process.env.DBSCANNER_MODE || 'demo',
  port: parseInt(process.env.PORT || '4200', 10),
  oracle: {
    user: process.env.ORACLE_USER,
    password: process.env.ORACLE_PASSWORD,
    connectString: process.env.ORACLE_CONNECT_STRING,
    targetSchema: process.env.ORACLE_TARGET_SCHEMA || null,
  },
};
