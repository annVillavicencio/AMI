require('dotenv').config();
const { getPool } = require('./db.js');

async function check() {
    const pool = await getPool();
    const result = await pool.request().query("SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME LIKE '%Origen%'");
    console.log(result.recordset);
    
    // Also fetch the data from the origenes table
    const tables = result.recordset;
    if (tables.length > 0) {
        const tName = tables[0].TABLE_NAME;
        const res2 = await pool.request().query(`SELECT * FROM ${tName}`);
        console.log("Data from", tName, ":", res2.recordset);
    }
    process.exit();
}
check();
