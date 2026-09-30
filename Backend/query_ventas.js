const { getPool } = require('./db.js');
async function check() {
    const pool = await getPool();
    let result = await pool.request().query("SELECT TOP 1 * FROM Ventas");
    console.log("Ventas:", result.recordset);
    result = await pool.request().query("SELECT TOP 1 * FROM DetalleVenta");
    console.log("DetalleVenta:", result.recordset);
    process.exit();
}
check();
