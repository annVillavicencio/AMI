const express = require('express');
const router = express.Router();
const { sql, getPool } = require('../db');

// Tasa oficial de cambio BCN (Córdobas por USD)
const TIPO_CAMBIO_BCN = 36.6243;
const RESOLUCION_DGI_DEFAULT = 'DGI-RES-2026-98432';
const SERIE_DEFAULT = 'AMI-A';
const RANGO_AUTORIZADO_DEFAULT = '000001 - 010000';

// 1. Listar todas las facturas
router.get('/', async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
            SELECT 
                f.idFactura,
                f.idVenta,
                f.NumeroFactura,
                f.FechaEmision,
                f.TipoCliente,
                f.NombreVendedor,
                f.CodigoEmpleado,
                f.IdEmpleado,
                f.NombreCliente,
                f.IdentificacionCliente,
                f.DireccionCliente,
                f.Subtotal,
                f.Descuento,
                f.Impuesto,
                f.Total,
                f.FormaPago,
                f.EstadoFactura,
                f.Moneda,
                f.TipoCambio,
                f.TotalCordobas,
                f.CondicionVenta,
                f.FechaVencimiento,
                f.PlazoMeses,
                f.NumeroAutorizacionDGI,
                f.SerieFactura,
                f.RangoAutorizado,
                f.FechaLimiteEmision,
                f.SubtotalGravado,
                f.SubtotalExento,
                f.PorcentajeIVA,
                f.MontoIVA,
                f.PorcentajeRetencionDGI,
                f.RetencionDGI,
                f.PorcentajeRetencionAlcaldia,
                f.RetencionAlcaldia,
                f.TotalPagar,
                f.ComisionVendedor,
                f.VIN,
                f.NumeroMotor,
                f.Placa,
                f.Kilometraje,
                f.MesesGarantia,
                -- Datos del auto vendido
                mo.NombreModelo,
                ma.NombreMarca,
                a.Anio,
                a.Descripcion AS AutoDescripcion
            FROM Facturas f
            LEFT JOIN Ventas v ON f.idVenta = v.idVenta
            LEFT JOIN DetalleVenta dv ON v.idVenta = dv.idVenta
            LEFT JOIN Auto a ON COALESCE(f.idAuto, dv.idAuto) = a.idAuto
            LEFT JOIN Modelos mo ON a.idModelo = mo.idModelo
            LEFT JOIN Marca ma ON mo.idMarca = ma.idMarca
            ORDER BY f.idFactura DESC
        `);
        res.json(result.recordset);
    } catch (err) {
        console.error('Error al listar facturas:', err);
        res.status(500).json({ error: err.message });
    }
});

// 2. Obtener lista de ventas que aún no tienen factura emitida
router.get('/ventas-pendientes', async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
            SELECT 
                v.idVenta,
                v.IdClientes,
                c.Nombre + ' ' + c.Apellido AS NombreCliente,
                c.Cedula AS IdentificacionCliente,
                c.Telefono,
                c.Correo,
                v.FechaVenta,
                v.FormaPago,
                v.TotalVenta,
                v.EstadoVenta,
                v.IdEmpleado,
                e.NombreEmpleado + ' ' + e.ApellidoEmpleado AS NombreVendedor,
                e.CodigoEmpleado,
                -- Auto
                a.idAuto,
                ISNULL(ma.NombreMarca, '') + ' ' + ISNULL(mo.NombreModelo, '') + ' (' + CAST(a.Anio AS VARCHAR) + ')' AS Vehiculo,
                a.Placa,
                a.VIN,
                a.NumeroMotor,
                a.Kilometraje
            FROM Ventas v
            INNER JOIN Clientes c ON v.IdClientes = c.IdClientes
            LEFT JOIN Empleado e ON v.IdEmpleado = e.IdEmpleado
            LEFT JOIN DetalleVenta dv ON v.idVenta = dv.idVenta
            LEFT JOIN Auto a ON dv.idAuto = a.idAuto
            LEFT JOIN Modelos mo ON a.idModelo = mo.idModelo
            LEFT JOIN Marca ma ON mo.idMarca = ma.idMarca
            WHERE v.idVenta NOT IN (
                SELECT idVenta FROM Facturas WHERE EstadoFactura != 'Anulada'
            )
            ORDER BY v.idVenta DESC
        `);
        res.json(result.recordset);
    } catch (err) {
        console.error('Error al listar ventas pendientes:', err);
        res.status(500).json({ error: err.message });
    }
});

// 3. Listar vendedores de la empresa para selección
router.get('/vendedores', async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
            SELECT 
                e.IdEmpleado,
                e.CodigoEmpleado,
                e.NombreEmpleado + ' ' + e.ApellidoEmpleado AS NombreCompleto,
                c.NombreCargo,
                d.NombreDepartamento
            FROM Empleado e
            INNER JOIN Cargo c ON e.IdCargo = c.IdCargo
            INNER JOIN Departamento d ON e.idDepartamento = d.idDepartamento
            WHERE e.EstadoEmpleado = 'Activo'
            ORDER BY e.NombreEmpleado ASC
        `);
        res.json(result.recordset);
    } catch (err) {
        console.error('Error al listar vendedores:', err);
        res.status(500).json({ error: err.message });
    }
});

// 4. Apartado Fiscal DGI - Resumen Mensual y Libro de Ventas Fiscales
router.get('/dgi/resumen', async (req, res) => {
    try {
        const pool = await getPool();
        const facturasRes = await pool.request().query(`
            SELECT 
                f.idFactura,
                f.NumeroFactura,
                f.FechaEmision,
                f.TipoCliente,
                f.Subtotal,
                f.Impuesto,
                f.Total,
                f.NumeroAutorizacionDGI,
                f.SerieFactura,
                f.RangoAutorizado,
                f.NombreCliente,
                f.IdentificacionCliente,
                f.NombreVendedor,
                f.CondicionVenta,
                f.Moneda,
                f.TipoCambio,
                f.SubtotalGravado,
                f.SubtotalExento,
                f.PorcentajeIVA,
                f.MontoIVA,
                f.PorcentajeRetencionDGI,
                f.RetencionDGI,
                f.PorcentajeRetencionAlcaldia,
                f.RetencionAlcaldia,
                f.TotalPagar,
                f.TotalCordobas,
                f.EstadoFactura,
                f.VIN,
                f.Placa
            FROM Facturas f
            ORDER BY f.idFactura DESC
        `);

        const facturas = facturasRes.recordset;
        const validas = facturas.filter(f => f.EstadoFactura !== 'Anulada');

        const kpis = {
            totalFacturasEmitidas: validas.length,
            totalFacturasAnuladas: facturas.filter(f => f.EstadoFactura === 'Anulada').length,
            subtotalGravadoUSD: validas.reduce((acc, f) => acc + (parseFloat(f.SubtotalGravado) || 0), 0),
            iva15RecaudadoUSD: validas.reduce((acc, f) => acc + (parseFloat(f.MontoIVA) || 0), 0),
            totalFacturadoBrutoUSD: validas.reduce((acc, f) => acc + (parseFloat(f.Total) || 0), 0),
            retencionDgi2USD: validas.reduce((acc, f) => acc + (parseFloat(f.RetencionDGI) || 0), 0),
            retencionAlcaldia1USD: validas.reduce((acc, f) => acc + (parseFloat(f.RetencionAlcaldia) || 0), 0),
            totalPagarUSD: validas.reduce((acc, f) => acc + (parseFloat(f.TotalPagar) || 0), 0),
            totalPagarCordobas: validas.reduce((acc, f) => acc + (parseFloat(f.TotalCordobas) || 0), 0),
            totalClientesNaturales: validas.filter(f => (f.TipoCliente || 'Natural') === 'Natural').length,
            totalClientesJuridicos: validas.filter(f => f.TipoCliente === 'Jurídica').length,
            tipoCambioOficialBCN: TIPO_CAMBIO_BCN,
            resolucionDGI: RESOLUCION_DGI_DEFAULT,
            serieFiscal: SERIE_DEFAULT,
            rucEmisor: 'J0310000123456',
            razonSocial: 'AUTOS AMI S.A.'
        };

        res.json({
            kpis,
            libroVentasFiscales: facturas
        });
    } catch (err) {
        console.error('Error al generar resumen DGI:', err);
        res.status(500).json({ error: err.message });
    }
});

// 5. Obtener una factura específica con detalle
router.get('/:id', async (req, res) => {
    try {
        const idFactura = parseInt(req.params.id);
        const pool = await getPool();

        const factRes = await pool.request()
            .input('idFactura', sql.Int, idFactura)
            .query(`
                SELECT 
                    f.*,
                    c.Telefono AS TelefonoCliente,
                    c.Correo AS CorreoCliente,
                    -- Auto
                    a.idAuto,
                    ISNULL(ma.NombreMarca, '') + ' ' + ISNULL(mo.NombreModelo, '') AS NombreVehiculo,
                    a.Anio,
                    a.Descripcion AS DescripcionAuto
                FROM Facturas f
                LEFT JOIN Ventas v ON f.idVenta = v.idVenta
                LEFT JOIN Clientes c ON v.IdClientes = c.IdClientes
                LEFT JOIN DetalleVenta dv ON v.idVenta = dv.idVenta
                LEFT JOIN Auto a ON COALESCE(f.idAuto, dv.idAuto) = a.idAuto
                LEFT JOIN Modelos mo ON a.idModelo = mo.idModelo
                LEFT JOIN Marca ma ON mo.idMarca = ma.idMarca
                WHERE f.idFactura = @idFactura
            `);

        if (factRes.recordset.length === 0) {
            return res.status(404).json({ error: 'Factura no encontrada' });
        }

        const factura = factRes.recordset[0];

        // Obtener líneas de DetalleFactura
        const detRes = await pool.request()
            .input('idFactura', sql.Int, idFactura)
            .query('SELECT * FROM DetalleFactura WHERE idFactura = @idFactura');

        factura.detalles = detRes.recordset;

        res.json(factura);
    } catch (err) {
        console.error('Error al consultar factura:', err);
        res.status(500).json({ error: err.message });
    }
});

// 6. Generar / Emitir nueva factura
router.post('/', async (req, res) => {
    try {
        const {
            idVenta,
            idEmpleado,
            tipoCliente, // 'Natural' o 'Jurídica'
            esAgenteRetenedor,
            moneda = 'USD',
            tipoCambio = TIPO_CAMBIO_BCN,
            condicionVenta = 'Contado',
            plazoMeses = 0,
            aplicaRetencionDGI = false,
            aplicaRetencionAlcaldia = false,
            mesesGarantia = 12
        } = req.body;

        if (!idVenta) {
            return res.status(400).json({ error: 'El idVenta es obligatorio para generar la factura' });
        }

        const pool = await getPool();

        // 1. Obtener la venta, cliente y auto vendido
        const ventaRes = await pool.request()
            .input('idVenta', sql.Int, parseInt(idVenta))
            .query(`
                SELECT 
                    v.idVenta,
                    v.IdClientes,
                    v.FechaVenta,
                    v.FormaPago,
                    v.TotalVenta,
                    v.IdEmpleado AS IdEmpleadoVenta,
                    c.Nombre + ' ' + c.Apellido AS NombreCliente,
                    COALESCE(c.Cedula, '001-000000-0000A') AS IdentificacionCliente,
                    COALESCE(c.Telefono, 'N/D') AS TelefonoCliente,
                    -- Auto
                    dv.idDetalleVen,
                    dv.idAuto,
                    dv.PrecioRealVendido,
                    a.Placa,
                    a.VIN,
                    a.NumeroMotor,
                    a.Kilometraje,
                    a.Anio,
                    ISNULL(ma.NombreMarca, '') + ' ' + ISNULL(mo.NombreModelo, '') AS NombreVehiculo,
                    a.Descripcion AS DescripcionAuto
                FROM Ventas v
                INNER JOIN Clientes c ON v.IdClientes = c.IdClientes
                LEFT JOIN DetalleVenta dv ON v.idVenta = dv.idVenta
                LEFT JOIN Auto a ON dv.idAuto = a.idAuto
                LEFT JOIN Modelos mo ON a.idModelo = mo.idModelo
                LEFT JOIN Marca ma ON mo.idMarca = ma.idMarca
                WHERE v.idVenta = @idVenta
            `);

        if (ventaRes.recordset.length === 0) {
            return res.status(404).json({ error: 'La venta especificada no existe' });
        }

        const venta = ventaRes.recordset[0];

        // 2. Verificar que la venta no tenga ya una factura activa
        const checkFac = await pool.request()
            .input('idVenta', sql.Int, parseInt(idVenta))
            .query("SELECT idFactura, NumeroFactura FROM Facturas WHERE idVenta = @idVenta AND EstadoFactura != 'Anulada'");

        if (checkFac.recordset.length > 0) {
            return res.status(400).json({ 
                error: `Esta venta ya tiene la factura ${checkFac.recordset[0].NumeroFactura} emitida.` 
            });
        }

        // 3. Resolver datos del vendedor
        const targetEmpleadoId = idEmpleado || venta.IdEmpleadoVenta || '3';
        const empRes = await pool.request()
            .input('idEmp', sql.VarChar, String(targetEmpleadoId))
            .query("SELECT IdEmpleado, CodigoEmpleado, NombreEmpleado + ' ' + ApellidoEmpleado AS NombreCompleto FROM Empleado WHERE IdEmpleado = @idEmp");

        const vendedor = empRes.recordset.length > 0 
            ? empRes.recordset[0] 
            : { IdEmpleado: '3', CodigoEmpleado: 'EMP003', NombreCompleto: 'Fernando Amador Morales' };

        // 4. Calcular correlativo
        const countRes = await pool.request().query("SELECT ISNULL(MAX(idFactura), 0) + 1 AS NextId FROM Facturas");
        const nextId = countRes.recordset[0].NextId;
        const numeroFactura = `AMI-FAC-${String(nextId).padStart(4, '0')}`;

        // 5. Cálculos Fiscales DGI (Ley 822 de Concertación Tributaria de Nicaragua)
        const subtotal = parseFloat(venta.TotalVenta) || 0;
        const subtotalGravado = subtotal;
        const subtotalExento = 0.00;
        const pctIVA = 15.00;
        const montoIVA = Math.round((subtotalGravado * (pctIVA / 100)) * 100) / 100;
        const totalConImpuesto = subtotal + montoIVA;

        // Retenciones en la fuente
        // Clasificación fiscal según Ley 822 y Plan de Arbitrios Municipal:
        // - Persona Natural (Consumidor Final): NO es agente retenedor. Retenciones = 0. Total a Pagar = Total con IVA.
        // - Persona Jurídica (Empresa con RUC / Agente Retenedor): Retiene 2% DGI (IR Fuente) y 1% IMI Alcaldía previa constancia.
        let tipoClienteFinal = tipoCliente;
        if (!tipoClienteFinal) {
            const idCli = (venta.IdentificacionCliente || '').trim().toUpperCase();
            tipoClienteFinal = idCli.startsWith('J') ? 'Jurídica' : 'Natural';
        }

        const esRetenedor = (tipoClienteFinal === 'Jurídica') || (esAgenteRetenedor === true || esAgenteRetenedor === 'true');

        let pctRetDGI = 0.00;
        let montoRetDGI = 0.00;
        let pctRetAlcaldia = 0.00;
        let montoRetAlcaldia = 0.00;

        if (esRetenedor) {
            if (aplicaRetencionDGI === true || aplicaRetencionDGI === 'true') {
                pctRetDGI = 2.00;
                montoRetDGI = Math.round((subtotalGravado * (pctRetDGI / 100)) * 100) / 100;
            }
            if (aplicaRetencionAlcaldia === true || aplicaRetencionAlcaldia === 'true') {
                pctRetAlcaldia = 1.00;
                montoRetAlcaldia = Math.round((subtotalGravado * (pctRetAlcaldia / 100)) * 100) / 100;
            }
        }

        const totalPagar = Math.round((totalConImpuesto - montoRetDGI - montoRetAlcaldia) * 100) / 100;

        const tc = parseFloat(tipoCambio) || TIPO_CAMBIO_BCN;
        const totalCordobas = moneda === 'USD' 
            ? Math.round(totalPagar * tc * 100) / 100 
            : totalPagar;

        // Comisión del vendedor (2% del valor de venta)
        const comisionVendedor = Math.round(subtotal * 0.02 * 100) / 100;

        // Fecha de vencimiento
        const fechaEmision = new Date();
        const diasCredito = condicionVenta === 'Crédito' ? (parseInt(plazoMeses) || 24) * 30 : 0;
        const fechaVencimiento = new Date(fechaEmision.getTime() + diasCredito * 24 * 60 * 60 * 1000);

        // 6. Insertar en Facturas
        const insertRes = await pool.request()
            .input('idVenta', sql.Int, venta.idVenta)
            .input('NumeroFactura', sql.VarChar(30), numeroFactura)
            .input('FechaEmision', sql.DateTime2(0), fechaEmision)
            .input('NombreVendedor', sql.NVarChar(150), vendedor.NombreCompleto)
            .input('RUCVendedor', sql.VarChar(20), 'J0310000123456')
            .input('CedulaVendedor', sql.VarChar(30), '001-100290-0001X')
            .input('IdEmpleado', sql.VarChar(20), vendedor.IdEmpleado)
            .input('CodigoEmpleado', sql.VarChar(20), vendedor.CodigoEmpleado)
            .input('ComisionVendedor', sql.Decimal(18, 2), comisionVendedor)
            .input('NombreCliente', sql.NVarChar(150), venta.NombreCliente)
            .input('IdentificacionCliente', sql.VarChar(30), venta.IdentificacionCliente)
            .input('DireccionCliente', sql.NVarChar(250), 'Managua, Nicaragua')
            .input('Subtotal', sql.Decimal(18, 2), subtotal)
            .input('Descuento', sql.Decimal(18, 2), 0.00)
            .input('Impuesto', sql.Decimal(18, 2), montoIVA)
            .input('Total', sql.Decimal(18, 2), totalConImpuesto)
            .input('FormaPago', sql.NVarChar(50), venta.FormaPago)
            .input('EstadoFactura', sql.VarChar(15), 'Emitida')
            .input('Moneda', sql.VarChar(10), moneda)
            .input('TipoCambio', sql.Decimal(10, 4), tc)
            .input('TotalCordobas', sql.Decimal(18, 2), totalCordobas)
            .input('CondicionVenta', sql.VarChar(20), condicionVenta)
            .input('FechaVencimiento', sql.Date, fechaVencimiento)
            .input('PlazoMeses', sql.Int, parseInt(plazoMeses) || 0)
            .input('NumeroAutorizacionDGI', sql.VarChar(50), RESOLUCION_DGI_DEFAULT)
            .input('SerieFactura', sql.VarChar(10), SERIE_DEFAULT)
            .input('RangoAutorizado', sql.VarChar(50), RANGO_AUTORIZADO_DEFAULT)
            .input('FechaLimiteEmision', sql.Date, new Date('2026-12-31'))
            .input('SubtotalGravado', sql.Decimal(18, 2), subtotalGravado)
            .input('SubtotalExento', sql.Decimal(18, 2), subtotalExento)
            .input('PorcentajeIVA', sql.Decimal(5, 2), pctIVA)
            .input('MontoIVA', sql.Decimal(18, 2), montoIVA)
            .input('PorcentajeRetencionDGI', sql.Decimal(5, 2), pctRetDGI)
            .input('RetencionDGI', sql.Decimal(18, 2), montoRetDGI)
            .input('PorcentajeRetencionAlcaldia', sql.Decimal(5, 2), pctRetAlcaldia)
            .input('RetencionAlcaldia', sql.Decimal(18, 2), montoRetAlcaldia)
            .input('TotalPagar', sql.Decimal(18, 2), totalPagar)
            .input('idAuto', sql.Int, venta.idAuto || null)
            .input('VIN', sql.VarChar(50), venta.VIN || '3N1AB7AP9KY104829')
            .input('NumeroMotor', sql.VarChar(50), venta.NumeroMotor || 'ENG-2049')
            .input('Placa', sql.VarChar(20), venta.Placa || 'S/P')
            .input('Kilometraje', sql.Int, venta.Kilometraje || 12000)
            .input('MesesGarantia', sql.Int, parseInt(mesesGarantia) || 12)
            .input('TipoCliente', sql.VarChar(30), tipoClienteFinal)
            .query(`
                INSERT INTO Facturas (
                    idVenta, NumeroFactura, FechaEmision, NombreVendedor, RUCVendedor, CedulaVendedor,
                    IdEmpleado, CodigoEmpleado, ComisionVendedor,
                    NombreCliente, IdentificacionCliente, DireccionCliente,
                    Subtotal, Descuento, Impuesto, Total, FormaPago, EstadoFactura,
                    Moneda, TipoCambio, TotalCordobas, CondicionVenta, FechaVencimiento, PlazoMeses,
                    NumeroAutorizacionDGI, SerieFactura, RangoAutorizado, FechaLimiteEmision,
                    SubtotalGravado, SubtotalExento, PorcentajeIVA, MontoIVA,
                    PorcentajeRetencionDGI, RetencionDGI, PorcentajeRetencionAlcaldia, RetencionAlcaldia, TotalPagar,
                    idAuto, VIN, NumeroMotor, Placa, Kilometraje, MesesGarantia, TipoCliente
                )
                OUTPUT INSERTED.idFactura
                VALUES (
                    @idVenta, @NumeroFactura, @FechaEmision, @NombreVendedor, @RUCVendedor, @CedulaVendedor,
                    @IdEmpleado, @CodigoEmpleado, @ComisionVendedor,
                    @NombreCliente, @IdentificacionCliente, @DireccionCliente,
                    @Subtotal, @Descuento, @Impuesto, @Total, @FormaPago, @EstadoFactura,
                    @Moneda, @TipoCambio, @TotalCordobas, @CondicionVenta, @FechaVencimiento, @PlazoMeses,
                    @NumeroAutorizacionDGI, @SerieFactura, @RangoAutorizado, @FechaLimiteEmision,
                    @SubtotalGravado, @SubtotalExento, @PorcentajeIVA, @MontoIVA,
                    @PorcentajeRetencionDGI, @RetencionDGI, @PorcentajeRetencionAlcaldia, @RetencionAlcaldia, @TotalPagar,
                    @idAuto, @VIN, @NumeroMotor, @Placa, @Kilometraje, @MesesGarantia, @TipoCliente
                )
            `);

        const newIdFactura = insertRes.recordset[0].idFactura;

        // 7. Insertar en DetalleFactura
        const descLinea = `Vehículo ${venta.NombreVehiculo || 'Automotor'} (Año ${venta.Anio || 2024}) - Placa: ${venta.Placa || 'S/P'} - VIN: ${venta.VIN || '3N1AB7AP9KY104829'}`;
        await pool.request()
            .input('idFactura', sql.Int, newIdFactura)
            .input('idDetalleVenta', sql.Int, venta.idDetalleVen || 1)
            .input('Descripcion', sql.NVarChar(300), descLinea)
            .input('Cantidad', sql.Int, 1)
            .input('PrecioUnitario', sql.Decimal(18, 2), subtotal)
            .input('Descuento', sql.Decimal(18, 2), 0.00)
            .input('Impuesto', sql.Decimal(18, 2), montoIVA)
            .query(`
                INSERT INTO DetalleFactura (idFactura, idDetalleVenta, Descripcion, Cantidad, PrecioUnitario, Descuento, Impuesto)
                VALUES (@idFactura, @idDetalleVenta, @Descripcion, @Cantidad, @PrecioUnitario, @Descuento, @Impuesto)
            `);

        res.status(201).json({
            mensaje: 'Factura emitida correctamente con autorización DGI',
            idFactura: newIdFactura,
            numeroFactura,
            totalPagar,
            totalCordobas
        });

    } catch (err) {
        console.error('Error al emitir factura:', err);
        res.status(500).json({ error: err.message });
    }
});

// 7. Anular factura
router.put('/:id/anular', async (req, res) => {
    try {
        const idFactura = parseInt(req.params.id);
        const { motivoAnulacion } = req.body;
        const pool = await getPool();

        await pool.request()
            .input('idFactura', sql.Int, idFactura)
            .input('motivo', sql.NVarChar(300), motivoAnulacion || 'Anulación fiscal solicitada por el usuario')
            .query(`
                UPDATE Facturas 
                SET EstadoFactura = 'Anulada', MotivoAnulacion = @motivo 
                WHERE idFactura = @idFactura
            `);

        res.json({ mensaje: 'Factura anulada correctamente ante el registro fiscal' });
    } catch (err) {
        console.error('Error al anular factura:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
