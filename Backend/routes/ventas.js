const express = require('express');
const router = express.Router();
const { getPool } = require('../db');

router.get('/', async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
            SELECT 
                v.idVenta, 
                c.Nombre + ' ' + c.Apellido AS Cliente, 
                ISNULL(m.NombreMarca, '') + ' ' + ISNULL(mo.NombreModelo, '') + ' (' + ISNULL(CAST(a.Anio AS VARCHAR), '') + ')' AS Vehiculo,
                v.TotalVenta as Monto, 
                v.FechaVenta, 
                v.FormaPago, 
                v.EstadoVenta 
            FROM Ventas v
            LEFT JOIN Clientes c ON v.IdClientes = c.IdClientes
            LEFT JOIN DetalleVenta dv ON v.idVenta = dv.idVenta
            LEFT JOIN Auto a ON dv.idAuto = a.idAuto
            LEFT JOIN Modelos mo ON a.idModelo = mo.idModelo
            LEFT JOIN Marca m ON mo.idMarca = m.idMarca
            ORDER BY v.idVenta DESC
        `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
