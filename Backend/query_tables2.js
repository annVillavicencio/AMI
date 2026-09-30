const { getPool } = require('./db.js');
async function check() {
    const pool = await getPool();
    const result = await pool.request().query("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES");
    console.log(result.recordset);
    process.exit();
}
check();
