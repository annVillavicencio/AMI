require('dotenv').config();
const { getPool, sql } = require('./db.js');

getPool().then(async pool => {
    try {
        const result = await pool.request().query("SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Usuarios'");
        console.log(result.recordset);
    } catch(err) {
        console.error(err);
    }
    process.exit(0);
});
