const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../db');

// Listar todas las compras
router.get('/', async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
            SELECT 
                c.idCompra,
                c.idProveedor,
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

// Listar proveedores para el select del formulario
router.get('/proveedores', async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
            SELECT idProveedor, NomProveedor, Telefono
            FROM Proveedores
            ORDER BY NomProveedor ASC
        `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Registrar nueva compra
router.post('/', async (req, res) => {
    try {
        let { idProveedor, NomProveedor, Descripcion, FechaCompra, NumFactura, TotalCompra, EstadoCompra } = req.body;

        if (!TotalCompra) {
            return res.status(400).json({ error: 'El monto total de la compra es obligatorio' });
        }

        const pool = await getPool();

        // Si no enviaron idProveedor pero sí el nombre, buscarlo o crearlo
        if (!idProveedor && NomProveedor) {
            const provCheck = await pool.request()
                .input('NomProveedor', sql.VarChar, NomProveedor.trim())
                .query('SELECT idProveedor FROM Proveedores WHERE NomProveedor = @NomProveedor');

            if (provCheck.recordset.length > 0) {
                idProveedor = provCheck.recordset[0].idProveedor;
            } else {
                const newProv = await pool.request()
                    .input('NomProveedor', sql.VarChar, NomProveedor.trim())
                    .query('INSERT INTO Proveedores (NomProveedor) OUTPUT INSERTED.idProveedor VALUES (@NomProveedor)');
                idProveedor = newProv.recordset[0].idProveedor;
            }
        }

        if (!idProveedor) {
            // Asignar primer proveedor por defecto si no se especificó ninguno
            const defProv = await pool.request().query('SELECT TOP 1 idProveedor FROM Proveedores');
            idProveedor = defProv.recordset.length > 0 ? defProv.recordset[0].idProveedor : 1;
        }

        const insertQuery = `
            INSERT INTO Compras (idProveedor, FechaCompra, Descripcion, EstadoCompra, NumFactura, TotalCompra)
            VALUES (@idProveedor, @FechaCompra, @Descripcion, @EstadoCompra, @NumFactura, @TotalCompra)
        `;

        await pool.request()
            .input('idProveedor', sql.Int, parseInt(idProveedor))
            .input('FechaCompra', sql.Date, FechaCompra || new Date())
            .input('Descripcion', sql.VarChar, Descripcion || 'Compra de inventario')
            .input('EstadoCompra', sql.VarChar, EstadoCompra || 'Completado')
            .input('NumFactura', sql.VarChar, NumFactura || `F-${Math.floor(1000 + Math.random() * 9000)}`)
            .input('TotalCompra', sql.Decimal(18, 2), parseFloat(TotalCompra))
            .query(insertQuery);

        res.status(201).json({ message: 'Compra registrada correctamente' });
    } catch (err) {
        console.error('Error al registrar compra:', err);
        res.status(500).json({ error: err.message });
    }
});

// Actualizar compra
router.put('/:id', async (req, res) => {
    try {
        const idCompra = parseInt(req.params.id);
        let { idProveedor, NomProveedor, Descripcion, FechaCompra, NumFactura, TotalCompra, EstadoCompra } = req.body;

        const pool = await getPool();

        if (!idProveedor && NomProveedor) {
            const provCheck = await pool.request()
                .input('NomProveedor', sql.VarChar, NomProveedor.trim())
                .query('SELECT idProveedor FROM Proveedores WHERE NomProveedor = @NomProveedor');

            if (provCheck.recordset.length > 0) {
                idProveedor = provCheck.recordset[0].idProveedor;
            } else {
                const newProv = await pool.request()
                    .input('NomProveedor', sql.VarChar, NomProveedor.trim())
                    .query('INSERT INTO Proveedores (NomProveedor) OUTPUT INSERTED.idProveedor VALUES (@NomProveedor)');
                idProveedor = newProv.recordset[0].idProveedor;
            }
        }

        const updateQuery = `
            UPDATE Compras SET
                idProveedor = COALESCE(@idProveedor, idProveedor),
                FechaCompra = @FechaCompra,
                Descripcion = @Descripcion,
                EstadoCompra = @EstadoCompra,
                NumFactura = @NumFactura,
                TotalCompra = @TotalCompra
            WHERE idCompra = @idCompra
        `;

        await pool.request()
            .input('idCompra', sql.Int, idCompra)
            .input('idProveedor', sql.Int, idProveedor ? parseInt(idProveedor) : null)
            .input('FechaCompra', sql.Date, FechaCompra || new Date())
            .input('Descripcion', sql.VarChar, Descripcion || '')
            .input('EstadoCompra', sql.VarChar, EstadoCompra || 'Completado')
            .input('NumFactura', sql.VarChar, NumFactura || '')
            .input('TotalCompra', sql.Decimal(18, 2), parseFloat(TotalCompra || 0))
            .query(updateQuery);

        res.json({ message: 'Compra actualizada correctamente' });
    } catch (err) {
        console.error('Error al actualizar compra:', err);
        res.status(500).json({ error: err.message });
    }
});

// Eliminar compra
router.delete('/:id', async (req, res) => {
    try {
        const idCompra = parseInt(req.params.id);
        const pool = await getPool();

        // Borrar dependencias en DetalleCompra primero
        await pool.request()
            .input('idCompra', sql.Int, idCompra)
            .query('DELETE FROM DetalleCompra WHERE idCompra = @idCompra');

        // Borrar compra
        await pool.request()
            .input('idCompra', sql.Int, idCompra)
            .query('DELETE FROM Compras WHERE idCompra = @idCompra');

        res.json({ message: 'Compra eliminada correctamente' });
    } catch (err) {
        console.error('Error al eliminar compra:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
