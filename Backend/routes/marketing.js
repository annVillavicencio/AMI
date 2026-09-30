
const express = require('express');
const router = express.Router();
const { getPool } = require('../db');

router.get('/', async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
            SELECT idCampaña, NombreCampaña, FechaInicio, FechaFin, PresupuestoInvertido, EstadoCampana 
            FROM CampañasMarketing ORDER BY idCampaña DESC
        `);
        res.json(result.recordset);
    } catch (err) { res.status(500).json({ error: err.message }); }
});
module.exports = router;
