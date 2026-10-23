const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../db');

// Listar todas las ventas con detalles
router.get('/', async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
            SELECT 
                v.idVenta, 
                v.IdClientes,
                c.Nombre + ' ' + c.Apellido AS Cliente, 
                dv.idAuto,
                ISNULL(m.NombreMarca, '') + ' ' + ISNULL(mo.NombreModelo, '') + ' (' + ISNULL(CAST(a.Anio AS VARCHAR), '') + ')' AS Vehiculo,
                v.TotalVenta as Monto, 
                v.FechaVenta, 
                v.FormaPago, 
                v.EstadoVenta,
                f.idFactura,
                f.NumeroFactura,
                f.EstadoFactura AS EstadoFacturaFiscal
            FROM Ventas v
            LEFT JOIN Facturas f ON v.idVenta = f.idVenta AND f.EstadoFactura != 'Anulada'
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

// Listar clientes para select
router.get('/clientes', async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
            SELECT IdClientes, Nombre + ' ' + Apellido AS NombreCompleto, Cedula, Telefono
            FROM Clientes
            ORDER BY Nombre ASC
        `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Listar autos para select
router.get('/autos', async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
            SELECT 
                a.idAuto,
                ISNULL(m.NombreMarca, '') + ' ' + ISNULL(mo.NombreModelo, '') + ' (' + ISNULL(a.Placa, 'S/P') + ')' AS Auto,
                a.Precio,
                a.Estado
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

// Registrar nueva venta
router.post('/', async (req, res) => {
    try {
        let { IdClientes, idAuto, FechaVenta, FormaPago, TotalVenta, EstadoVenta } = req.body;

        if (!TotalVenta) {
            return res.status(400).json({ error: 'El monto total de la venta es obligatorio' });
        }

        const pool = await getPool();

        // Si no se especificó cliente, tomar el primero existente
        if (!IdClientes) {
            const defC = await pool.request().query('SELECT TOP 1 IdClientes FROM Clientes');
            IdClientes = defC.recordset.length > 0 ? defC.recordset[0].IdClientes : 1;
        }

        const insertVentaQuery = `
            INSERT INTO Ventas (IdClientes, FechaVenta, FormaPago, TotalVenta, EstadoVenta)
            OUTPUT INSERTED.idVenta
            VALUES (@IdClientes, @FechaVenta, @FormaPago, @TotalVenta, @EstadoVenta)
        `;

        const ventaRes = await pool.request()
            .input('IdClientes', sql.Int, parseInt(IdClientes))
            .input('FechaVenta', sql.Date, FechaVenta || new Date())
            .input('FormaPago', sql.VarChar, FormaPago || 'Efectivo')
            .input('TotalVenta', sql.Decimal(18, 2), parseFloat(TotalVenta))
            .input('EstadoVenta', sql.VarChar, EstadoVenta || 'Finalizada')
            .query(insertVentaQuery);

        const newIdVenta = ventaRes.recordset[0].idVenta;

        // Si se vinculó a un auto, registrar en DetalleVenta y actualizar estado del auto a Vendido
        if (idAuto) {
            await pool.request()
                .input('idVenta', sql.Int, newIdVenta)
                .input('idAuto', sql.Int, parseInt(idAuto))
                .input('PrecioRealVendido', sql.Decimal(18, 2), parseFloat(TotalVenta))
                .query(`
                    INSERT INTO DetalleVenta (idVenta, idAuto, PrecioRealVendido)
                    VALUES (@idVenta, @idAuto, @PrecioRealVendido);

                    UPDATE Auto SET Estado = 'Vendido' WHERE idAuto = @idAuto;
                `);
        }

        res.status(201).json({ message: 'Venta registrada correctamente', idVenta: newIdVenta });
    } catch (err) {
        console.error('Error al registrar venta:', err);
        res.status(500).json({ error: err.message });
    }
});

// Actualizar venta
router.put('/:id', async (req, res) => {
    try {
        const idVenta = parseInt(req.params.id);
        const { IdClientes, idAuto, FechaVenta, FormaPago, TotalVenta, EstadoVenta } = req.body;

        const pool = await getPool();

        const updateVentaQuery = `
            UPDATE Ventas SET
                IdClientes = COALESCE(@IdClientes, IdClientes),
                FechaVenta = @FechaVenta,
                FormaPago = @FormaPago,
                TotalVenta = @TotalVenta,
                EstadoVenta = @EstadoVenta
            WHERE idVenta = @idVenta
        `;

        await pool.request()
            .input('idVenta', sql.Int, idVenta)
            .input('IdClientes', sql.Int, IdClientes ? parseInt(IdClientes) : null)
            .input('FechaVenta', sql.Date, FechaVenta || new Date())
            .input('FormaPago', sql.VarChar, FormaPago || 'Efectivo')
            .input('TotalVenta', sql.Decimal(18, 2), parseFloat(TotalVenta || 0))
            .input('EstadoVenta', sql.VarChar, EstadoVenta || 'Finalizada')
            .query(updateVentaQuery);

        if (idAuto) {
            // Actualizar o insertar en DetalleVenta
            const dvCheck = await pool.request()
                .input('idVenta', sql.Int, idVenta)
                .query('SELECT idDetalleVen FROM DetalleVenta WHERE idVenta = @idVenta');

            if (dvCheck.recordset.length > 0) {
                await pool.request()
                    .input('idVenta', sql.Int, idVenta)
                    .input('idAuto', sql.Int, parseInt(idAuto))
                    .input('PrecioRealVendido', sql.Decimal(18, 2), parseFloat(TotalVenta || 0))
                    .query(`
                        UPDATE DetalleVenta 
                        SET idAuto = @idAuto, PrecioRealVendido = @PrecioRealVendido 
                        WHERE idVenta = @idVenta;

                        UPDATE Auto SET Estado = 'Vendido' WHERE idAuto = @idAuto;
                    `);
            } else {
                await pool.request()
                    .input('idVenta', sql.Int, idVenta)
                    .input('idAuto', sql.Int, parseInt(idAuto))
                    .input('PrecioRealVendido', sql.Decimal(18, 2), parseFloat(TotalVenta || 0))
                    .query(`
                        INSERT INTO DetalleVenta (idVenta, idAuto, PrecioRealVendido) 
                        VALUES (@idVenta, @idAuto, @PrecioRealVendido);

                        UPDATE Auto SET Estado = 'Vendido' WHERE idAuto = @idAuto;
                    `);
            }
        }

        res.json({ message: 'Venta actualizada correctamente' });
    } catch (err) {
        console.error('Error al actualizar venta:', err);
        res.status(500).json({ error: err.message });
    }
});

// Eliminar venta
router.delete('/:id', async (req, res) => {
    try {
        const idVenta = parseInt(req.params.id);
        const pool = await getPool();

        // Buscar auto vendido para liberar su estado a Disponible
        const dvRes = await pool.request()
            .input('idVenta', sql.Int, idVenta)
            .query('SELECT idAuto FROM DetalleVenta WHERE idVenta = @idVenta');

        if (dvRes.recordset.length > 0) {
            const idAuto = dvRes.recordset[0].idAuto;
            await pool.request()
                .input('idAuto', sql.Int, idAuto)
                .query("UPDATE Auto SET Estado = 'Disponible' WHERE idAuto = @idAuto");
        }

        // Eliminar detalle y venta
        await pool.request()
            .input('idVenta', sql.Int, idVenta)
            .query(`
                DELETE FROM DetalleVenta WHERE idVenta = @idVenta;
                DELETE FROM Ventas WHERE idVenta = @idVenta;
            `);

        res.json({ message: 'Venta eliminada correctamente' });
    } catch (err) {
        console.error('Error al eliminar venta:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
