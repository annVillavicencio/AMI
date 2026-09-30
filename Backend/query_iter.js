const { getPool } = require('./db.js');
async function check() {
    const pool = await getPool();
    let r1 = await pool.request().query("SELECT TOP 1 * FROM Iteracciones");
    console.log("Iteracciones:", r1.recordset);
    process.exit();
}
check();
