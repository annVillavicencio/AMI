const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../db');

// Listar todos los costos con nombres de Auto y Categoría
router.get('/', async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
            SELECT 
                c.idCostoEstan,
                c.idAuto,
                c.idCategoria,
                ISNULL(m.NombreMarca, '') + ' ' + ISNULL(mo.NombreModelo, '') + ' (' + ISNULL(a.Placa, 'S/P') + ')' AS Auto,
                cat.NombreCategoria AS Categoria,
                c.Descripcion,
                c.FechaGasto,
                c.Monto
            FROM CostosEstancamientos c
            LEFT JOIN Auto a ON c.idAuto = a.idAuto
            LEFT JOIN Modelos mo ON a.idModelo = mo.idModelo
            LEFT JOIN Marca m ON mo.idMarca = m.idMarca
            LEFT JOIN CategoriasCosto cat ON c.idCategoria = cat.idCategoria
            ORDER BY c.idCostoEstan DESC
        `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Endpoint auxiliar para llenar el select de Autos en el modal
router.get('/autos', async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
            SELECT 
                a.idAuto,
                ISNULL(m.NombreMarca, '') + ' ' + ISNULL(mo.NombreModelo, '') + ' (' + ISNULL(a.Placa, 'S/P') + ')' AS Auto
            FROM Auto a
            LEFT JOIN Modelos mo ON a.idModelo = mo.idModelo
            LEFT JOIN Marca m ON mo.idMarca = m.idMarca
            ORDER BY m.NombreMarca, mo.NombreModelo
        `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Endpoint auxiliar para llenar categorías si se desea
router.get('/categorias', async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
            SELECT idCategoria, NombreCategoria, Descripcion
            FROM CategoriasCosto
            ORDER BY idCategoria ASC
        `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Crear nuevo costo
router.post('/', async (req, res) => {
    try {
        const { idAuto, idCategoria, FechaGasto, Monto, Descripcion } = req.body;

        if (!idAuto || !idCategoria || Monto == null) {
            return res.status(400).json({ error: 'Auto, Categoría y Monto son obligatorios' });
        }

        const pool = await getPool();
        const insertQuery = `
            INSERT INTO CostosEstancamientos (idAuto, idCategoria, FechaGasto, Monto, Descripcion)
            VALUES (@idAuto, @idCategoria, @FechaGasto, @Monto, @Descripcion)
        `;

        await pool.request()
            .input('idAuto', sql.Int, parseInt(idAuto))
            .input('idCategoria', sql.Int, parseInt(idCategoria))
            .input('FechaGasto', sql.Date, FechaGasto || new Date())
            .input('Monto', sql.Decimal(10, 2), parseFloat(Monto))
            .input('Descripcion', sql.VarChar, Descripcion || '')
            .query(insertQuery);

        res.status(201).json({ message: 'Gasto registrado correctamente' });
    } catch (err) {
        console.error('Error al registrar costo:', err);
        res.status(500).json({ error: err.message });
    }
});

// Actualizar costo existente
router.put('/:id', async (req, res) => {
    try {
        const idCostoEstan = parseInt(req.params.id);
        const { idAuto, idCategoria, FechaGasto, Monto, Descripcion } = req.body;

        if (!idAuto || !idCategoria || Monto == null) {
            return res.status(400).json({ error: 'Auto, Categoría y Monto son obligatorios' });
        }

        const pool = await getPool();
        const updateQuery = `
            UPDATE CostosEstancamientos
            SET idAuto = @idAuto,
                idCategoria = @idCategoria,
                FechaGasto = @FechaGasto,
                Monto = @Monto,
                Descripcion = @Descripcion
            WHERE idCostoEstan = @idCostoEstan
        `;

        await pool.request()
            .input('idCostoEstan', sql.Int, idCostoEstan)
            .input('idAuto', sql.Int, parseInt(idAuto))
            .input('idCategoria', sql.Int, parseInt(idCategoria))
            .input('FechaGasto', sql.Date, FechaGasto || new Date())
            .input('Monto', sql.Decimal(10, 2), parseFloat(Monto))
            .input('Descripcion', sql.VarChar, Descripcion || '')
            .query(updateQuery);

        res.json({ message: 'Gasto actualizado correctamente' });
    } catch (err) {
        console.error('Error al actualizar costo:', err);
        res.status(500).json({ error: err.message });
    }
});

// Eliminar costo
router.delete('/:id', async (req, res) => {
    try {
        const idCostoEstan = parseInt(req.params.id);
        const pool = await getPool();

        await pool.request()
            .input('idCostoEstan', sql.Int, idCostoEstan)
            .query('DELETE FROM CostosEstancamientos WHERE idCostoEstan = @idCostoEstan');

        res.json({ message: 'Gasto eliminado correctamente' });
    } catch (err) {
        console.error('Error al eliminar costo:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
