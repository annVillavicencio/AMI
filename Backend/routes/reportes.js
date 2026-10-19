const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../db');

function getCondition(colName, rango) {
    if (!rango || rango.toLowerCase() === 'todos' || rango.toLowerCase().includes('todos')) {
        return '1=1';
    }
    const r = rango.toLowerCase().trim();
    if (r === 'hoy') {
        return `CAST(${colName} AS DATE) = CAST(GETDATE() AS DATE)`;
    }
    if (r.includes('7')) {
        return `${colName} >= DATEADD(day, -7, GETDATE())`;
    }
    if (r.includes('30')) {
        return `${colName} >= DATEADD(day, -35, GETDATE())`;
    }
    if (r.includes('60') || r.includes('dos meses')) {
        return `${colName} >= DATEADD(day, -60, GETDATE())`;
    }
    if (r.includes('trimestre') || r.includes('90')) {
        return `${colName} >= DATEADD(day, -90, GETDATE())`;
    }
    if (r.includes('6 meses') || r.includes('semestre')) {
        return `${colName} >= DATEADD(month, -6, GETDATE())`;
    }
    if (r.includes('mes')) {
        return `DATEDIFF(month, ${colName}, GETDATE()) = 0 AND DATEDIFF(year, ${colName}, GETDATE()) = 0`;
    }
    if (r.includes('año') || r.includes('anio')) {
        return `DATEDIFF(year, ${colName}, GETDATE()) = 0`;
    }
    return '1=1';
}

// 1. Dashboard de Reportes dinámico por Rango y Tipo
router.get('/dashboard', async (req, res) => {
    try {
        const pool = await getPool();
        const rango = req.query.rango || 'Todos';
        const tipo = req.query.tipo || 'Todos';

        const vCond = getCondition('v.FechaVenta', rango);
        const cCond = getCondition('co.FechaCompra', rango);
        const gCond = getCondition('ce.FechaGasto', rango);
        const clCond = getCondition('c.FechaRegistro', rango);
        const mCond = getCondition('cm.FechaInicio', rango);

        // KPIs principales dinámicos según el rango
        const kpiQuery = `
            SELECT 
                (SELECT COUNT(*) FROM Auto WHERE Estado = 'Disponible') AS stockDisponible,
                (SELECT ISNULL(SUM(Precio), 0) FROM Auto WHERE Estado = 'Disponible') AS valorInventario,
                (SELECT ISNULL(SUM(TotalVenta), 0) FROM Ventas v WHERE ${vCond}) AS totalVentas,
                (SELECT COUNT(*) FROM Ventas v WHERE ${vCond}) AS countVentas,
                (SELECT ISNULL(SUM(TotalCompra), 0) FROM Compras co WHERE ${cCond}) AS totalCompras,
                (SELECT COUNT(*) FROM Compras co WHERE ${cCond}) AS countCompras,
                (SELECT ISNULL(SUM(Monto), 0) FROM CostosEstancamientos ce WHERE ${gCond}) AS totalCostos,
                (SELECT COUNT(*) FROM CostosEstancamientos ce WHERE ${gCond}) AS countCostos,
                (SELECT COUNT(*) FROM Clientes c WHERE ${clCond}) AS totalClientes,
                (SELECT COUNT(*) FROM CampañasMarketing cm WHERE ${mCond}) AS totalCampanias
        `;
        const kpiRes = await pool.request().query(kpiQuery);
        const kpis = kpiRes.recordset[0] || {};
        kpis.gananciaNeta = (Number(kpis.totalVentas) || 0) - ((Number(kpis.totalCompras) || 0) + (Number(kpis.totalCostos) || 0));

        // Autos más vendidos por marca
        const marcasQuery = `
            SELECT TOP 6
                ISNULL(m.NombreMarca, 'Otras') AS marca,
                COUNT(dv.idDetalleVen) AS totalVendidos,
                ISNULL(SUM(dv.PrecioRealVendido), 0) AS totalMonto
            FROM DetalleVenta dv
            INNER JOIN Ventas v ON dv.idVenta = v.idVenta
            INNER JOIN Auto a ON dv.idAuto = a.idAuto
            INNER JOIN Modelos mo ON a.idModelo = mo.idModelo
            LEFT JOIN Marca m ON mo.idMarca = m.idMarca
            WHERE ${vCond}
            GROUP BY m.NombreMarca
            ORDER BY totalVendidos DESC, totalMonto DESC
        `;
        let marcasRes = await pool.request().query(marcasQuery);
        if (marcasRes.recordset.length === 0) {
            const fallbackMarcas = await pool.request().query(`
                SELECT TOP 6
                    ISNULL(m.NombreMarca, 'Otras') AS marca,
                    COUNT(a.idAuto) AS totalVendidos,
                    ISNULL(SUM(a.Precio), 0) AS totalMonto
                FROM Auto a
                INNER JOIN Modelos mo ON a.idModelo = mo.idModelo
                LEFT JOIN Marca m ON mo.idMarca = m.idMarca
                GROUP BY m.NombreMarca
                ORDER BY totalVendidos DESC
            `);
            marcasRes = fallbackMarcas;
        }

        // Clientes por canal / origen
        const origenesQuery = `
            SELECT 
                ISNULL(o.NombreCanal, 'Otros') AS canal,
                COUNT(c.IdClientes) AS totalClientes
            FROM Clientes c
            LEFT JOIN OrigenesClientes o ON c.idOrigen = o.idOrigen
            WHERE ${clCond}
            GROUP BY o.NombreCanal
            ORDER BY totalClientes DESC
        `;
        let origenesRes = await pool.request().query(origenesQuery);
        if (origenesRes.recordset.length === 0) {
            const allOrig = await pool.request().query(`
                SELECT ISNULL(o.NombreCanal, 'Otros') AS canal, COUNT(c.IdClientes) AS totalClientes
                FROM Clientes c
                LEFT JOIN OrigenesClientes o ON c.idOrigen = o.idOrigen
                GROUP BY o.NombreCanal
                ORDER BY totalClientes DESC
            `);
            origenesRes = allOrig;
        }

        // Costos más frecuentes por categoría
        const costosCatQuery = `
            SELECT 
                ISNULL(cc.NombreCategoria, 'General') AS categoria,
                COUNT(ce.idCostoEstan) AS cantidad,
                ISNULL(SUM(ce.Monto), 0) AS totalMonto
            FROM CostosEstancamientos ce
            LEFT JOIN CategoriasCosto cc ON ce.idCategoria = cc.idCategoria
            WHERE ${gCond}
            GROUP BY cc.NombreCategoria
            ORDER BY totalMonto DESC
        `;
        let costosCatRes = await pool.request().query(costosCatQuery);
        if (costosCatRes.recordset.length === 0) {
            const allCost = await pool.request().query(`
                SELECT ISNULL(cc.NombreCategoria, 'General') AS categoria, COUNT(ce.idCostoEstan) AS cantidad, ISNULL(SUM(ce.Monto), 0) AS totalMonto
                FROM CostosEstancamientos ce
                LEFT JOIN CategoriasCosto cc ON ce.idCategoria = cc.idCategoria
                GROUP BY cc.NombreCategoria
                ORDER BY totalMonto DESC
            `);
            costosCatRes = allCost;
        }

        // Ventas por mes
        const ventasMesQuery = `
            SELECT 
                FORMAT(v.FechaVenta, 'yyyy-MM') AS periodo,
                COUNT(v.idVenta) AS cantidadVentas,
                ISNULL(SUM(v.TotalVenta), 0) AS totalIngresos
            FROM Ventas v
            WHERE ${vCond}
            GROUP BY FORMAT(v.FechaVenta, 'yyyy-MM')
            ORDER BY periodo ASC
        `;
        let ventasMesRes = await pool.request().query(ventasMesQuery);
        if (ventasMesRes.recordset.length === 0) {
            const allVentasMes = await pool.request().query(`
                SELECT FORMAT(FechaVenta, 'yyyy-MM') AS periodo, COUNT(idVenta) AS cantidadVentas, ISNULL(SUM(TotalVenta), 0) AS totalIngresos
                FROM Ventas
                GROUP BY FORMAT(FechaVenta, 'yyyy-MM')
                ORDER BY periodo ASC
            `);
            ventasMesRes = allVentasMes;
        }

        // Campañas de marketing
        const campaniasQuery = `
            SELECT TOP 6
                cm.idCampaña,
                cm.NombreCampaña AS nombre,
                cm.PresupuestoInvertido AS presupuesto,
                cm.EstadoCampana AS estado,
                cm.FechaInicio,
                cm.FechaFin
            FROM CampañasMarketing cm
            ORDER BY cm.PresupuestoInvertido DESC
        `;
        const campaniasRes = await pool.request().query(campaniasQuery);

        res.json({
            rango,
            tipo,
            kpis,
            autosPorMarca: marcasRes.recordset,
            clientesPorOrigen: origenesRes.recordset,
            costosPorCategoria: costosCatRes.recordset,
            ventasPorMes: ventasMesRes.recordset,
            campanias: campaniasRes.recordset
        });
    } catch (err) {
        console.error('Error al obtener dashboard de reportes:', err);
        res.status(500).json({ error: err.message });
    }
});

// 2. Obtener datos tabulares filtrados por Tipo y Rango
router.get('/data', async (req, res) => {
    try {
        const { tipo, rango } = req.query;
        const pool = await getPool();

        const tipoLower = (tipo || 'todos').toLowerCase();
        let data = [];

        const vCond = getCondition('v.FechaVenta', rango);
        const cCond = getCondition('co.FechaCompra', rango);
        const gCond = getCondition('ce.FechaGasto', rango);
        const clCond = getCondition('c.FechaRegistro', rango);
        const mCond = getCondition('cm.FechaInicio', rango);

        if (tipoLower === 'ventas') {
            const result = await pool.request().query(`
                SELECT 
                    v.idVenta,
                    v.FechaVenta,
                    ISNULL(c.Nombre + ' ' + c.Apellido, 'Cliente General') AS Cliente,
                    ISNULL(m.NombreMarca + ' ' + mo.NombreModelo, 'Vehículo') AS Auto,
                    v.FormaPago,
                    v.EstadoVenta,
                    v.TotalVenta
                FROM Ventas v
                LEFT JOIN Clientes c ON v.IdClientes = c.IdClientes
                LEFT JOIN DetalleVenta dv ON v.idVenta = dv.idVenta
                LEFT JOIN Auto a ON dv.idAuto = a.idAuto
                LEFT JOIN Modelos mo ON a.idModelo = mo.idModelo
                LEFT JOIN Marca m ON mo.idMarca = m.idMarca
                WHERE ${vCond}
                ORDER BY v.FechaVenta DESC
            `);
            data = result.recordset;
        } else if (tipoLower === 'inventario') {
            const result = await pool.request().query(`
                SELECT 
                    a.idAuto,
                    m.NombreMarca AS Marca,
                    mo.NombreModelo AS Modelo,
                    a.Anio,
                    a.Placa,
                    a.Precio,
                    a.Estado,
                    a.FechaIngresoInventario
                FROM Auto a
                LEFT JOIN Modelos mo ON a.idModelo = mo.idModelo
                LEFT JOIN Marca m ON mo.idMarca = m.idMarca
                ORDER BY a.idAuto DESC
            `);
            data = result.recordset;
        } else if (tipoLower === 'costos') {
            const result = await pool.request().query(`
                SELECT 
                    ce.idCostoEstan,
                    ce.FechaGasto AS Fecha,
                    cc.NombreCategoria AS Categoria,
                    ce.Descripcion,
                    ce.Monto,
                    ISNULL(m.NombreMarca + ' ' + mo.NombreModelo, 'General') AS Auto
                FROM CostosEstancamientos ce
                LEFT JOIN CategoriasCosto cc ON ce.idCategoria = cc.idCategoria
                LEFT JOIN Auto a ON ce.idAuto = a.idAuto
                LEFT JOIN Modelos mo ON a.idModelo = mo.idModelo
                LEFT JOIN Marca m ON mo.idMarca = m.idMarca
                WHERE ${gCond}
                ORDER BY ce.FechaGasto DESC
            `);
            data = result.recordset;
        } else if (tipoLower === 'clientes') {
            const result = await pool.request().query(`
                SELECT 
                    c.IdClientes,
                    c.Nombre,
                    c.Apellido,
                    c.Telefono,
                    c.Correo,
                    c.Cedula,
                    ISNULL(o.NombreCanal, 'Sin origen') AS CanalOrigen,
                    c.FechaRegistro
                FROM Clientes c
                LEFT JOIN OrigenesClientes o ON c.idOrigen = o.idOrigen
                WHERE ${clCond}
                ORDER BY c.IdClientes DESC
            `);
            data = result.recordset;
        } else if (tipoLower === 'marketing') {
            const result = await pool.request().query(`
                SELECT 
                    cm.idCampaña,
                    cm.NombreCampaña,
                    cm.PresupuestoInvertido,
                    cm.FechaInicio,
                    cm.FechaFin,
                    cm.EstadoCampana
                FROM CampañasMarketing cm
                WHERE ${mCond}
                ORDER BY cm.PresupuestoInvertido DESC
            `);
            data = result.recordset;
        } else {
            // Todos / Resumen Ejecutivo
            const result = await pool.request().query(`
                SELECT 
                    'Venta' AS TipoRegistro,
                    CAST(v.idVenta AS VARCHAR) AS Referencia,
                    v.FechaVenta AS Fecha,
                    v.TotalVenta AS Monto,
                    ISNULL(c.Nombre + ' ' + c.Apellido, 'Cliente') AS Detalle
                FROM Ventas v
                LEFT JOIN Clientes c ON v.IdClientes = c.IdClientes
                WHERE ${vCond}
                UNION ALL
                SELECT 
                    'Compra' AS TipoRegistro,
                    CAST(co.idCompra AS VARCHAR) AS Referencia,
                    co.FechaCompra AS Fecha,
                    co.TotalCompra AS Monto,
                    ISNULL(p.NomProveedor, 'Proveedor') AS Detalle
                FROM Compras co
                LEFT JOIN Proveedores p ON co.idProveedor = p.idProveedor
                WHERE ${cCond}
                UNION ALL
                SELECT 
                    'Costo Operativo' AS TipoRegistro,
                    CAST(ce.idCostoEstan AS VARCHAR) AS Referencia,
                    ce.FechaGasto AS Fecha,
                    ce.Monto AS Monto,
                    ISNULL(cc.NombreCategoria, 'Gasto') AS Detalle
                FROM CostosEstancamientos ce
                LEFT JOIN CategoriasCosto cc ON ce.idCategoria = cc.idCategoria
                WHERE ${gCond}
                ORDER BY Fecha DESC
            `);
            data = result.recordset;
        }

        res.json({
            tipo: tipo || 'Todos',
            rango: rango || 'Todos',
            totalRegistros: data.length,
            registros: data
        });
    } catch (err) {
        console.error('Error al obtener datos detallados para reporte:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
