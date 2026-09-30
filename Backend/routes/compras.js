
const express = require('express');
const router = express.Router();
const { getPool } = require('../db');

router.get('/', async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
            SELECT 
                c.idCompra,
                ISNULL(p.NomProveedor, 'Desconocido') AS Proveedor,
                c.Descripcion,
                c.NumFactura,
                c.FechaCompra,
                c.TotalCompra,
                c.EstadoCompra
            FROM Compras c
            LEFT JOIN Proveedores p ON c.idProveedor = p.idProveedor
            ORDER BY c.idCompra DESC
        `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
