const { getPool } = require('./db.js');
async function check() {
    const pool = await getPool();
    let r1 = await pool.request().query("SELECT TOP 1 * FROM CampañasMarketing");
    console.log("CampaasMarketing:", r1.recordset);
    let r2 = await pool.request().query("SELECT TOP 1 * FROM CategoriasCosto");
    console.log("CategoriasCosto:", r2.recordset);
    let r3 = await pool.request().query("SELECT TOP 1 * FROM CostosEstancamientos");
    console.log("CostosEstancamientos:", r3.recordset);
    process.exit();
}
check();
