const { getPool } = require('./db.js');
async function check() {
    const pool = await getPool();
    let result = await pool.request().query("SELECT TOP 1 * FROM Compras");
    console.log("Compras:", result.recordset);
    result = await pool.request().query("SELECT TOP 1 * FROM DetalleCompra");
    console.log("DetalleCompra:", result.recordset);
    process.exit();
}
check();
