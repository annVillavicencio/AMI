
const express = require('express');
const router = express.Router();
const { getPool } = require('../db');

router.get('/', async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
            SELECT 
                c.idCostoEstan,
                ISNULL(m.NombreMarca, '') + ' ' + ISNULL(mo.NombreModelo, '') AS Auto,
                cat.NombreCategoria AS Categoria,
                c.Descripcion,
                c.FechaGasto,
                c.Monto
            FROM CostosEstancamientos c
            LEFT JOIN Auto a ON c.idAuto = a.idAuto
            LEFT JOIN Modelos mo ON a.idModelo = mo.idModelo
            LEFT JOIN Marca m ON mo.idMarca = m.idMarca
            LEFT JOIN CategoriasCosto cat ON c.idCategoria = cat.idCategoria
            ORDER BY c.Monto DESC
        `);
        res.json(result.recordset);
    } catch (err) { res.status(500).json({ error: err.message }); }
});
module.exports = router;
