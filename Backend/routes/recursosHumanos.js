const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../db');

// Función oficial de cálculo de retención IR según Ley 822 de Concertación Tributaria (Nicaragua)
function calcularIRNicaragua(salarioBrutoMensual) {
    const inssLaboral = salarioBrutoMensual * 0.07;
    const ingresoNetoMensual = salarioBrutoMensual - inssLaboral;
    const ingresoAnual = ingresoNetoMensual * 12;

    let impuestoBase = 0;
    let porcentaje = 0;
    let sobreExceso = 0;

    if (ingresoAnual <= 100000) {
        return 0;
    } else if (ingresoAnual <= 200000) {
        impuestoBase = 0;
        porcentaje = 0.15;
        sobreExceso = 100000;
    } else if (ingresoAnual <= 350000) {
        impuestoBase = 15000;
        porcentaje = 0.20;
        sobreExceso = 200000;
    } else if (ingresoAnual <= 500000) {
        impuestoBase = 45000;
        porcentaje = 0.25;
        sobreExceso = 350000;
    } else {
        impuestoBase = 82500;
        porcentaje = 0.30;
        sobreExceso = 500000;
    }

    const irAnual = impuestoBase + ((ingresoAnual - sobreExceso) * porcentaje);
    return Math.round((irAnual / 12) * 100) / 100;
}

// -------------------------------------------------------------
// 1. GET /api/recursosHumanos (o /empleados): Listar todos los colaboradores
// -------------------------------------------------------------
router.get('/', async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
            SELECT 
                e.IdEmpleado, 
                e.CodigoEmpleado, 
                e.NombreEmpleado, 
                e.ApellidoEmpleado, 
                e.Cedula, 
                CONVERT(VARCHAR(10), e.FechaIngreso, 120) AS FechaIngreso, 
                ISNULL(e.SalarioBase, 0) AS SalarioBase, 
                ISNULL(e.EstadoEmpleado, 'Activo') AS EstadoEmpleado, 
                ISNULL(c.NombreCargo, 'Sin Cargo') AS NombreCargo, 
                ISNULL(d.NombreDepartamento, 'Sin Departamento') AS NombreDepartamento,
                u.correo,
                CAST('' AS VARCHAR(20)) AS telefono
            FROM Empleado e 
            LEFT JOIN Cargo c ON e.IdCargo = c.IdCargo 
            LEFT JOIN Departamento d ON e.idDepartamento = d.idDepartamento
            LEFT JOIN Usuarios u ON e.CodigoEmpleado = u.CodigoEmpleado
            ORDER BY TRY_CAST(e.IdEmpleado AS INT), e.IdEmpleado
        `);
        res.json(result.recordset);
    } catch (err) {
        console.error('Error obteniendo empleados:', err);
        res.status(500).json({ error: 'Error obteniendo empleados: ' + err.message });
    }
});

// -------------------------------------------------------------
// 2. GET /api/recursosHumanos/planilla: Listar registros de la planilla oficial
// -------------------------------------------------------------
router.get('/planilla', async (req, res) => {
    try {
        const { mes, quincena, busqueda, estado } = req.query;
        const pool = await getPool();

        let query = `
            SELECT 
                p.IdPlanilla,
                p.IdEmpleado,
                CONVERT(VARCHAR(10), p.FechaInicioPeriodo, 120) AS FechaInicioPeriodo,
                CONVERT(VARCHAR(10), p.FechaFinPeriodo, 120) AS FechaFinPeriodo,
                CONVERT(VARCHAR(10), p.FechaPago, 120) AS FechaPago,
                p.SalarioBase,
                p.DiasTrabajados,
                p.HorasExtra,
                p.Bonificaciones,
                p.Comisiones,
                p.OtrosIngresos,
                p.SalarioBruto,
                p.INSS,
                p.IR,
                p.OtrasDeducciones,
                p.TotalIngresos,
                p.TotalDeducciones,
                p.SalarioNeto,
                p.INSSPatronal,
                p.TotalAPagar,
                p.Estado,
                e.NombreEmpleado,
                e.ApellidoEmpleado,
                e.CodigoEmpleado,
                c.NombreCargo,
                d.NombreDepartamento
            FROM Planilla p
            INNER JOIN Empleado e ON p.IdEmpleado = e.IdEmpleado
            LEFT JOIN Cargo c ON e.IdCargo = c.IdCargo
            LEFT JOIN Departamento d ON e.idDepartamento = d.idDepartamento
            WHERE 1=1
        `;

        if (mes && mes.toLowerCase() !== 'todos') {
            query += ` AND (DATENAME(month, p.FechaInicioPeriodo) LIKE '%${mes}%' OR DATENAME(month, p.FechaFinPeriodo) LIKE '%${mes}%')`;
        }

        if (estado && estado.toLowerCase() !== 'todos') {
            query += ` AND p.Estado = '${estado}'`;
        }

        query += ` ORDER BY p.IdPlanilla DESC`;

        const result = await pool.request().query(query);
        let items = result.recordset;

        if (busqueda && busqueda.trim()) {
            const term = busqueda.trim().toLowerCase();
            items = items.filter(r => 
                (r.NombreEmpleado || '').toLowerCase().includes(term) ||
                (r.ApellidoEmpleado || '').toLowerCase().includes(term) ||
                (r.CodigoEmpleado || '').toLowerCase().includes(term) ||
                (r.NombreCargo || '').toLowerCase().includes(term) ||
                (r.NombreDepartamento || '').toLowerCase().includes(term) ||
                String(r.IdPlanilla).includes(term)
            );
        }

        // Totales de resumen
        let totalBase = 0;
        let totalHorasExtra = 0;
        let totalIngresos = 0;
        let totalDeducciones = 0;
        let totalPagar = 0;
        let totalPatronal = 0;

        items.forEach(r => {
            totalBase += parseFloat(r.SalarioBase) || 0;
            totalHorasExtra += parseFloat(r.HorasExtra) || 0;
            totalIngresos += parseFloat(r.TotalIngresos) || 0;
            totalDeducciones += parseFloat(r.TotalDeducciones) || 0;
            totalPagar += parseFloat(r.TotalAPagar) || 0;
            totalPatronal += parseFloat(r.INSSPatronal) || 0;
        });

        res.json({
            totalRegistros: items.length,
            resumen: {
                totalBase: Math.round(totalBase * 100) / 100,
                totalHorasExtra: Math.round(totalHorasExtra * 100) / 100,
                totalIngresos: Math.round(totalIngresos * 100) / 100,
                totalDeducciones: Math.round(totalDeducciones * 100) / 100,
                totalPagar: Math.round(totalPagar * 100) / 100,
                totalPatronal: Math.round(totalPatronal * 100) / 100
            },
            items
        });

    } catch (err) {
        console.error('Error obteniendo planilla:', err);
        res.status(500).json({ error: 'Error obteniendo planilla: ' + err.message });
    }
});

// -------------------------------------------------------------
// 3. POST /api/recursosHumanos/planilla/generar: Generar planilla automática
// -------------------------------------------------------------
router.post('/planilla/generar', async (req, res) => {
    try {
        const { mes = 'Octubre', anio = 2026, quincena = 'Mes Completo' } = req.body;
        const pool = await getPool();

        // Mapeo del mes a número (1 a 12)
        const mesesMap = {
            'enero': 1, 'febrero': 2, 'marzo': 3, 'abril': 4, 'mayo': 5, 'junio': 6,
            'julio': 7, 'agosto': 8, 'septiembre': 9, 'octubre': 10, 'noviembre': 11, 'diciembre': 12
        };
        const numMes = mesesMap[mes.toLowerCase().trim()] || 10;
        const anioInt = parseInt(anio, 10) || 2026;

        let fechaInicio, fechaFin, fechaPago, factor, dias;
        const ultimoDiaMes = new Date(anioInt, numMes, 0).getDate();

        if (quincena.includes('Primera')) {
            fechaInicio = `${anioInt}-${String(numMes).padStart(2, '0')}-01`;
            fechaFin = `${anioInt}-${String(numMes).padStart(2, '0')}-15`;
            fechaPago = fechaFin;
            factor = 0.5;
            dias = 15;
        } else if (quincena.includes('Segunda')) {
            fechaInicio = `${anioInt}-${String(numMes).padStart(2, '0')}-16`;
            fechaFin = `${anioInt}-${String(numMes).padStart(2, '0')}-${ultimoDiaMes}`;
            fechaPago = fechaFin;
            factor = 0.5;
            dias = 15;
        } else {
            // Mes Completo
            fechaInicio = `${anioInt}-${String(numMes).padStart(2, '0')}-01`;
            fechaFin = `${anioInt}-${String(numMes).padStart(2, '0')}-${ultimoDiaMes}`;
            fechaPago = fechaFin;
            factor = 1.0;
            dias = 30;
        }

        // Obtener todos los empleados activos
        const qEmps = await pool.request().query(`
            SELECT IdEmpleado, CodigoEmpleado, NombreEmpleado, ApellidoEmpleado, SalarioBase
            FROM Empleado
            WHERE EstadoEmpleado = 'Activo' AND SalarioBase > 0
        `);

        const empleados = qEmps.recordset;
        if (empleados.length === 0) {
            return res.status(400).json({ error: 'No hay empleados activos con salario base para procesar.' });
        }

        let insertados = 0;
        for (const emp of empleados) {
            const salBaseMensual = parseFloat(emp.SalarioBase) || 0;
            const salBasePeriodo = Math.round(salBaseMensual * factor * 100) / 100;
            const horasExtra = 0;
            const bonificaciones = 0;
            const comisiones = 0;
            const otrosIngresos = 0;
            const salarioBruto = salBasePeriodo;

            // 1. INSS Laboral (7%)
            const inssLaboral = Math.round(salarioBruto * 0.07 * 100) / 100;

            // 2. IR Nicaragua Progresivo
            const irMensual = calcularIRNicaragua(salBaseMensual) * factor;
            const irRedondeado = Math.round(irMensual * 100) / 100;

            // 3. Deducciones y Neto
            const otrasDeducciones = 0;
            const totalIngresos = salarioBruto;
            const totalDeducciones = Math.round((inssLaboral + irRedondeado + otrasDeducciones) * 100) / 100;
            const salarioNeto = Math.round((totalIngresos - totalDeducciones) * 100) / 100;

            // 4. Aporte Patronal (22.5%)
            const inssPatronal = Math.round(salarioBruto * 0.225 * 100) / 100;

            // 5. Total a pagar al colaborador = Salario Neto
            const totalAPagar = salarioNeto;
            const estado = 'Pendiente';

            // Insertar registro en la tabla Planilla
            await pool.request()
                .input('IdEmpleado', sql.VarChar(20), String(emp.IdEmpleado))
                .input('FechaInicioPeriodo', sql.Date, fechaInicio)
                .input('FechaFinPeriodo', sql.Date, fechaFin)
                .input('FechaPago', sql.Date, fechaPago)
                .input('SalarioBase', sql.Decimal(18, 2), salBasePeriodo)
                .input('DiasTrabajados', sql.Int, dias)
                .input('HorasExtra', sql.Int, horasExtra)
                .input('Bonificaciones', sql.Decimal(18, 2), bonificaciones)
                .input('Comisiones', sql.Decimal(18, 2), comisiones)
                .input('OtrosIngresos', sql.Decimal(18, 2), otrosIngresos)
                .input('SalarioBruto', sql.Decimal(18, 2), salarioBruto)
                .input('INSS', sql.Decimal(18, 2), inssLaboral)
                .input('IR', sql.Decimal(18, 2), irRedondeado)
                .input('OtrasDeducciones', sql.Decimal(18, 2), otrasDeducciones)
                .input('TotalIngresos', sql.Decimal(18, 2), totalIngresos)
                .input('TotalDeducciones', sql.Decimal(18, 2), totalDeducciones)
                .input('SalarioNeto', sql.Decimal(18, 2), salarioNeto)
                .input('INSSPatronal', sql.Decimal(18, 2), inssPatronal)
                .input('TotalAPagar', sql.Decimal(18, 2), totalAPagar)
                .input('Estado', sql.VarChar(10), estado)
                .query(`
                    INSERT INTO Planilla (
                        IdEmpleado, FechaInicioPeriodo, FechaFinPeriodo, FechaPago,
                        SalarioBase, DiasTrabajados, HorasExtra, Bonificaciones, Comisiones,
                        OtrosIngresos, SalarioBruto, INSS, IR, OtrasDeducciones,
                        TotalIngresos, TotalDeducciones, SalarioNeto, INSSPatronal,
                        TotalAPagar, Estado
                    ) VALUES (
                        @IdEmpleado, @FechaInicioPeriodo, @FechaFinPeriodo, @FechaPago,
                        @SalarioBase, @DiasTrabajados, @HorasExtra, @Bonificaciones, @Comisiones,
                        @OtrosIngresos, @SalarioBruto, @INSS, @IR, @OtrasDeducciones,
                        @TotalIngresos, @TotalDeducciones, @SalarioNeto, @INSSPatronal,
                        @TotalAPagar, @Estado
                    )
                `);

            insertados++;
        }

        res.json({
            ok: true,
            mensaje: `Planilla generada con éxito para ${insertados} empleados.`,
            periodo: `${mes} ${anioInt} (${quincena})`,
            insertados
        });

    } catch (err) {
        console.error('Error generando planilla:', err);
        res.status(500).json({ error: 'Error generando planilla: ' + err.message });
    }
});

// -------------------------------------------------------------
// 4. GET /api/recursosHumanos/departamentos
// -------------------------------------------------------------
router.get('/departamentos', async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
            SELECT DISTINCT NombreDepartamento 
            FROM Departamento 
            WHERE NombreDepartamento IS NOT NULL 
            ORDER BY NombreDepartamento
        `);
        res.json(result.recordset.map(r => r.NombreDepartamento));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// -------------------------------------------------------------
// 5. GET /api/recursosHumanos/cargos
// -------------------------------------------------------------
router.get('/cargos', async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
            SELECT DISTINCT NombreCargo 
            FROM Cargo 
            WHERE NombreCargo IS NOT NULL 
            ORDER BY NombreCargo
        `);
        res.json(result.recordset.map(r => r.NombreCargo));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// -------------------------------------------------------------
// 6. GET /api/recursosHumanos/planilla/exportar-excel: Exportar nómina en CSV/Excel
// -------------------------------------------------------------
router.get('/planilla/exportar-excel', async (req, res) => {
    try {
        const { mes, quincena } = req.query;
        const pool = await getPool();

        let query = `
            SELECT 
                p.IdPlanilla,
                CONVERT(VARCHAR(10), p.FechaInicioPeriodo, 120) AS PeriodoInicio,
                CONVERT(VARCHAR(10), p.FechaFinPeriodo, 120) AS PeriodoFin,
                CONVERT(VARCHAR(10), p.FechaPago, 120) AS FechaPago,
                RTRIM(ISNULL(e.NombreEmpleado, '')) + ' ' + RTRIM(ISNULL(e.ApellidoEmpleado, '')) AS Empleado,
                ISNULL(e.CodigoEmpleado, '') AS CodigoEmpleado,
                ISNULL(c.NombreCargo, 'Sin Cargo') AS Cargo,
                ISNULL(d.NombreDepartamento, 'Sin Depto') AS Departamento,
                ISNULL(p.SalarioBase, 0) AS SalarioBase,
                ISNULL(p.DiasTrabajados, 30) AS DiasTrabajados,
                ISNULL(p.HorasExtra, 0) AS HorasExtra,
                ISNULL(p.Bonificaciones, 0) AS Bonificaciones,
                ISNULL(p.Comisiones, 0) AS Comisiones,
                ISNULL(p.OtrosIngresos, 0) AS OtrosIngresos,
                ISNULL(p.SalarioBruto, 0) AS SalarioBruto,
                ISNULL(p.INSS, 0) AS INSS,
                ISNULL(p.IR, 0) AS IR,
                ISNULL(p.OtrasDeducciones, 0) AS OtrasDeducciones,
                ISNULL(p.TotalDeducciones, 0) AS TotalDeducciones,
                ISNULL(p.SalarioNeto, 0) AS SalarioNeto,
                ISNULL(p.INSSPatronal, 0) AS INSSPatronal,
                ISNULL(p.TotalAPagar, 0) AS TotalAPagar,
                ISNULL(p.Estado, 'Pagado') AS Estado
            FROM Planilla p
            INNER JOIN Empleado e ON p.IdEmpleado = e.IdEmpleado
            LEFT JOIN Cargo c ON e.IdCargo = c.IdCargo
            LEFT JOIN Departamento d ON e.idDepartamento = d.idDepartamento
            WHERE 1=1
        `;

        const request = pool.request();
        if (mes && mes !== 'Todos') {
            const mesesMap = {
                'enero': 1, 'febrero': 2, 'marzo': 3, 'abril': 4, 'mayo': 5, 'junio': 6,
                'julio': 7, 'agosto': 8, 'septiembre': 9, 'octubre': 10, 'noviembre': 11, 'diciembre': 12
            };
            const numMes = mesesMap[mes.toLowerCase().trim()];
            if (numMes) {
                query += ` AND MONTH(p.FechaInicioPeriodo) = @numMes `;
                request.input('numMes', sql.Int, numMes);
            }
        }

        query += ` ORDER BY p.FechaInicioPeriodo DESC, TRY_CAST(p.IdEmpleado AS INT), p.IdEmpleado`;

        const result = await request.query(query);
        const rows = result.recordset;

        let csv = '\uFEFF';
        csv += 'ID Planilla,Empleado,Código,Cargo,Departamento,Periodo Inicio,Periodo Fin,Fecha Pago,Salario Base (C$),Días,Horas Extra,Bonificaciones (C$),Comisiones (C$),Otros Ingresos (C$),Salario Bruto (C$),INSS Laboral 7% (C$),IR Retención (C$),Otras Deducciones (C$),Total Deducciones (C$),Salario Neto (C$),INSS Patronal 22.5% (C$),Total a Pagar (C$),Estado\r\n';

        rows.forEach(r => {
            csv += `"${r.IdPlanilla}","${r.Empleado.replace(/"/g, '""')}","${r.CodigoEmpleado}","${r.Cargo.replace(/"/g, '""')}","${r.Departamento.replace(/"/g, '""')}","${r.PeriodoInicio}","${r.PeriodoFin}","${r.FechaPago}",${r.SalarioBase},${r.DiasTrabajados},${r.HorasExtra},${r.Bonificaciones},${r.Comisiones},${r.OtrosIngresos},${r.SalarioBruto},${r.INSS},${r.IR},${r.OtrasDeducciones},${r.TotalDeducciones},${r.SalarioNeto},${r.INSSPatronal},${r.TotalAPagar},"${r.Estado}"\r\n`;
        });

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="Planilla_Oficial_AMI_${mes || 'General'}.csv"`);
        return res.send(csv);

    } catch (err) {
        console.error('Error exportando planilla:', err);
        res.status(500).json({ error: 'Error exportando planilla: ' + err.message });
    }
});

module.exports = router;

