const { getPool } = require('./db.js');
async function check() {
    const pool = await getPool();
    let result = await pool.request().query("SELECT TOP 1 * FROM Modelos");
    console.log("Modelos:", result.recordset);
    process.exit();
}
check();
