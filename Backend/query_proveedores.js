const { getPool } = require('./db.js');
async function check() {
    const pool = await getPool();
    let result = await pool.request().query("SELECT TOP 1 * FROM Proveedores");
    console.log("Proveedores:", result.recordset);
    process.exit();
}
check();
