const { getPool } = require('./db.js');
async function check() {
    const pool = await getPool();
    const result = await pool.request().query("SELECT TOP 1 * FROM v_Ventas_UI");
    console.log(result.recordset);
    process.exit();
}
check();
