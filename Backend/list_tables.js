require('dotenv').config();
const { getPool, sql } = require('./db.js');

getPool().then(async pool => {
    try {
        const result = await pool.request().query('SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES');
        console.log(result.recordset);
    } catch(err) {
        console.error(err);
    }
    process.exit(0);
});
