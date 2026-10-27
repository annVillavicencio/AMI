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
                ISNULL(p.TotalIngresos, 0) AS TotalIngresos,
                ISNULL(p.TotalDeducciones, 0) AS TotalDeducciones,
                ISNULL(p.SalarioNeto, 0) AS SalarioNeto,
                ISNULL(p.INSSPatronal, 0) AS INSSPatronal,
                ISNULL(p.TotalAPagar, 0) AS TotalAPagar,
                ISNULL(p.Estado, 'Pendiente') AS Estado,
                ISNULL(e.NombreEmpleado, '') AS NombreEmpleado,
                ISNULL(e.ApellidoEmpleado, '') AS ApellidoEmpleado,
                ISNULL(e.CodigoEmpleado, '') AS CodigoEmpleado,
                ISNULL(e.Cedula, '001-000000-0000X') AS Cedula,
                CONVERT(VARCHAR(10), e.FechaIngreso, 120) AS FechaIngreso,
                ISNULL(c.NombreCargo, 'Sin Cargo') AS NombreCargo,
                ISNULL(d.NombreDepartamento, 'Sin Departamento') AS NombreDepartamento
            FROM Planilla p
            INNER JOIN Empleado e ON p.IdEmpleado = e.IdEmpleado
            LEFT JOIN Cargo c ON e.IdCargo = c.IdCargo
            LEFT JOIN Departamento d ON e.idDepartamento = d.idDepartamento
            WHERE 1=1
        `;

        if (mes && mes.toLowerCase() !== 'todos') {
            const mesesMap = {
                'enero': 1, 'febrero': 2, 'marzo': 3, 'abril': 4, 'mayo': 5, 'junio': 6,
                'julio': 7, 'agosto': 8, 'septiembre': 9, 'octubre': 10, 'noviembre': 11, 'diciembre': 12,
                'january': 1, 'february': 2, 'march': 3, 'april': 4, 'may': 5, 'june': 6,
                'july': 7, 'august': 8, 'september': 9, 'october': 10, 'november': 11, 'december': 12
            };
            const numMes = mesesMap[mes.toLowerCase().trim()];
            if (numMes) {
                query += ` AND (MONTH(p.FechaInicioPeriodo) = ${numMes} OR MONTH(p.FechaFinPeriodo) = ${numMes})`;
            }
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

        // Totales de resumen con cálculo financiero exacto
        let totalBase = 0;
        let totalCantidadHorasExtra = 0;
        let totalMontoHorasExtra = 0;
        let totalBonificaciones = 0;
        let totalComisiones = 0;
        let totalOtrosIngresos = 0;
        let totalIngresos = 0;
        let totalINSS = 0;
        let totalIR = 0;
        let totalDeducciones = 0;
        let totalNeto = 0;
        let totalPagar = 0;
        let totalPatronal = 0;

        items = items.map(r => {
            const salBase = parseFloat(r.SalarioBase) || 0;
            const salBruto = parseFloat(r.SalarioBruto) || 0;
            const cantHoras = parseInt(r.HorasExtra, 10) || 0;
            const bonif = parseFloat(r.Bonificaciones) || 0;
            const com = parseFloat(r.Comisiones) || 0;
            const otros = parseFloat(r.OtrosIngresos) || 0;

            // Salario por hora ordinaria (30 días * 8 horas = 240 horas estándar)
            const valorHoraOrdinaria = Math.round((salBase / 240) * 100) / 100;
            
            // Si la fila tiene registrado horas extras, calcular su monto exacto
            const diffBruto = salBruto - (salBase + bonif + com + otros);
            let montoHE = 0;
            let valorHE = 0;

            if (diffBruto > 0.01) {
                montoHE = Math.round(diffBruto * 100) / 100;
                valorHE = (cantHoras > 0) ? Math.round((montoHE / cantHoras) * 100) / 100 : Math.round(valorHoraOrdinaria * 1.5 * 100) / 100;
            } else if (cantHoras > 0) {
                valorHE = Math.round(valorHoraOrdinaria * 1.5 * 100) / 100;
                montoHE = Math.round(cantHoras * valorHE * 100) / 100;
            }

            totalBase += salBase;
            totalCantidadHorasExtra += cantHoras;
            totalMontoHorasExtra += montoHE;
            totalBonificaciones += bonif;
            totalComisiones += com;
            totalOtrosIngresos += otros;
            totalIngresos += parseFloat(r.TotalIngresos) || salBruto;
            totalINSS += parseFloat(r.INSS) || 0;
            totalIR += parseFloat(r.IR) || 0;
            totalDeducciones += parseFloat(r.TotalDeducciones) || 0;
            totalNeto += parseFloat(r.SalarioNeto) || 0;
            totalPagar += parseFloat(r.TotalAPagar) || 0;
            totalPatronal += parseFloat(r.INSSPatronal) || 0;

            return {
                ...r,
                MontoHorasExtra: montoHE,
                ValorHoraOrdinaria: valorHoraOrdinaria,
                ValorHoraExtra: valorHE
            };
        });

        res.json({
            totalRegistros: items.length,
            resumen: {
                totalBase: Math.round(totalBase * 100) / 100,
                totalHorasExtra: Math.round(totalMontoHorasExtra * 100) / 100, // MONTO MONETARIO EN C$
                cantidadHorasExtra: totalCantidadHorasExtra, // NÚMERO DE HORAS
                totalBonificaciones: Math.round(totalBonificaciones * 100) / 100,
                totalComisiones: Math.round(totalComisiones * 100) / 100,
                totalOtrosIngresos: Math.round(totalOtrosIngresos * 100) / 100,
                totalIngresos: Math.round(totalIngresos * 100) / 100,
                totalINSS: Math.round(totalINSS * 100) / 100,
                totalIR: Math.round(totalIR * 100) / 100,
                totalDeducciones: Math.round(totalDeducciones * 100) / 100,
                totalNeto: Math.round(totalNeto * 100) / 100,
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
// 3. POST /api/recursosHumanos/planilla/generar: Generar planilla con cálculo de horas extras
// -------------------------------------------------------------
router.post('/planilla/generar', async (req, res) => {
    try {
        const { 
            mes = 'Octubre', 
            anio = 2026, 
            quincena = 'Mes Completo',
            factorRecargo = 1.5, // 1.5x tiempo y medio o 2.0x doble legal
            incluirHorasExtrasEstimadas = true
        } = req.body;
        const pool = await getPool();

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
            fechaInicio = `${anioInt}-${String(numMes).padStart(2, '0')}-01`;
            fechaFin = `${anioInt}-${String(numMes).padStart(2, '0')}-${ultimoDiaMes}`;
            fechaPago = fechaFin;
            factor = 1.0;
            dias = 30;
        }

        // Obtener todos los empleados activos con su cargo y depto
        const qEmps = await pool.request().query(`
            SELECT e.IdEmpleado, e.CodigoEmpleado, e.NombreEmpleado, e.ApellidoEmpleado, e.SalarioBase,
                   ISNULL(c.NombreCargo, '') AS NombreCargo,
                   ISNULL(d.NombreDepartamento, '') AS NombreDepartamento
            FROM Empleado e
            LEFT JOIN Cargo c ON e.IdCargo = c.IdCargo
            LEFT JOIN Departamento d ON e.idDepartamento = d.idDepartamento
            WHERE e.EstadoEmpleado = 'Activo' AND e.SalarioBase > 0
        `);

        const empleados = qEmps.recordset;
        if (empleados.length === 0) {
            return res.status(400).json({ error: 'No hay empleados activos con salario base para procesar.' });
        }

        let insertados = 0;
        for (const emp of empleados) {
            const salBaseMensual = parseFloat(emp.SalarioBase) || 0;
            const salBasePeriodo = Math.round(salBaseMensual * factor * 100) / 100;
            
            // Jornada estándar: 30 días * 8 horas = 240 horas mensuales
            const valorHoraOrdinaria = Math.round((salBaseMensual / 240) * 100) / 100;
            const valorHoraExtra = Math.round((valorHoraOrdinaria * parseFloat(factorRecargo)) * 100) / 100;

            // Determinar horas extras y comisiones según perfil del colaborador
            let horasExtra = 0;
            let bonificaciones = 0;
            let comisiones = 0;
            let otrosIngresos = 0;

            if (incluirHorasExtrasEstimadas) {
                const cargo = emp.NombreCargo.toLowerCase();
                const depto = emp.NombreDepartamento.toLowerCase();

                if (depto.includes('venta') || cargo.includes('asesor') || cargo.includes('vendedor')) {
                    horasExtra = (emp.IdEmpleado % 2 === 0) ? 6 : 4;
                    bonificaciones = 1000;
                    comisiones = 3000;
                } else if (depto.includes('taller') || depto.includes('servicio') || cargo.includes('mecanic') || cargo.includes('bodega')) {
                    horasExtra = (emp.IdEmpleado % 2 === 0) ? 8 : 5;
                    bonificaciones = 1200;
                } else if (cargo.includes('asistente') || cargo.includes('analista') || cargo.includes('auxiliar')) {
                    horasExtra = 3;
                    bonificaciones = 500;
                }
                // Ajustar por periodo quincenal si aplica
                if (factor === 0.5) {
                    horasExtra = Math.floor(horasExtra / 2);
                    bonificaciones = Math.round(bonificaciones * 0.5 * 100) / 100;
                    comisiones = Math.round(comisiones * 0.5 * 100) / 100;
                }
            }

            // Monto de Horas Extras
            const montoHorasExtra = Math.round(horasExtra * valorHoraExtra * 100) / 100;

            // Salario Bruto Devengado Total
            const salarioBruto = Math.round((salBasePeriodo + montoHorasExtra + bonificaciones + comisiones + otrosIngresos) * 100) / 100;

            // 1. INSS Laboral (7%) sobre la totalidad del Salario Bruto
            const inssLaboral = Math.round(salarioBruto * 0.07 * 100) / 100;

            // 2. Retención IR Progresivo de Ley 822 de Nicaragua sobre el Salario Bruto
            const irMensual = calcularIRNicaragua(salarioBruto) * factor;
            const irRedondeado = Math.round(irMensual * 100) / 100;

            // 3. Deducciones
            const otrasDeducciones = (horasExtra > 0) ? 250 : 0;
            const totalIngresos = salarioBruto;
            const totalDeducciones = Math.round((inssLaboral + irRedondeado + otrasDeducciones) * 100) / 100;
            const salarioNeto = Math.round((totalIngresos - totalDeducciones) * 100) / 100;

            // 4. Aporte Patronal al INSS (22.5%)
            const inssPatronal = Math.round(salarioBruto * 0.225 * 100) / 100;

            // 5. Total a Pagar al Empleado = Salario Neto
            const totalAPagar = salarioNeto;
            const estado = 'Pendiente';

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
            mensaje: `Planilla generada con éxito para ${insertados} empleados con cálculo exacto de Horas Extras e IR.`,
            periodo: `${mes} ${anioInt} (${quincena})`,
            factorHorasExtra: factorRecargo,
            insertados
        });

    } catch (err) {
        console.error('Error generando planilla:', err);
        res.status(500).json({ error: 'Error generando planilla: ' + err.message });
    }
});

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
        csv += 'ID Planilla,Empleado,Código,Cargo,Departamento,Periodo Inicio,Periodo Fin,Fecha Pago,Salario Base (C$),Días,Horas Extra (Cant),Monto Horas Extra (C$),Bonificaciones (C$),Comisiones (C$),Otros Ingresos (C$),Salario Bruto (C$),INSS Laboral 7% (C$),IR Retención (C$),Otras Deducciones (C$),Total Deducciones (C$),Salario Neto (C$),INSS Patronal 22.5% (C$),Total a Pagar (C$),Estado\r\n';

        rows.forEach(r => {
            const salBase = parseFloat(r.SalarioBase) || 0;
            const cantHE = parseInt(r.HorasExtra, 10) || 0;
            const bonif = parseFloat(r.Bonificaciones) || 0;
            const com = parseFloat(r.Comisiones) || 0;
            const otros = parseFloat(r.OtrosIngresos) || 0;
            const salBruto = parseFloat(r.SalarioBruto) || 0;
            const diffHE = salBruto - (salBase + bonif + com + otros);
            const montoHE = (diffHE > 0.01) ? Math.round(diffHE * 100) / 100 : (cantHE > 0 ? Math.round(cantHE * (salBase / 240) * 1.5 * 100) / 100 : 0);

            csv += `"${r.IdPlanilla}","${r.Empleado.replace(/"/g, '""')}","${r.CodigoEmpleado}","${r.Cargo.replace(/"/g, '""')}","${r.Departamento.replace(/"/g, '""')}","${r.PeriodoInicio}","${r.PeriodoFin}","${r.FechaPago}",${salBase},${r.DiasTrabajados},${cantHE},${montoHE},${bonif},${com},${otros},${salBruto},${r.INSS},${r.IR},${r.OtrasDeducciones},${r.TotalDeducciones},${r.SalarioNeto},${r.INSSPatronal},${r.TotalAPagar},"${r.Estado}"\r\n`;
        });

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="Planilla_Oficial_AMI_${mes || 'General'}.csv"`);
        return res.send(csv);

    } catch (err) {
        console.error('Error exportando planilla:', err);
        res.status(500).json({ error: 'Error exportando planilla: ' + err.message });
    }
});



// -------------------------------------------------------------
// 7. POST /api/recursosHumanos/planilla/pagar: Realizar cálculos y pagar planilla a todos los trabajadores
// -------------------------------------------------------------
router.post('/planilla/pagar', async (req, res) => {
    try {
        const { 
            mes = 'Octubre', 
            anio = 2026, 
            quincena = 'Mes Completo',
            factorRecargo = 1.5,
            incluirHorasExtrasEstimadas = true
        } = req.body;
        const pool = await getPool();

        const mesesMap = {
            'enero': 1, 'febrero': 2, 'marzo': 3, 'abril': 4, 'mayo': 5, 'junio': 6,
            'julio': 7, 'agosto': 8, 'septiembre': 9, 'octubre': 10, 'noviembre': 11, 'diciembre': 12
        };
        const numMes = mesesMap[mes.toLowerCase().trim()] || (new Date().getMonth() + 1);
        const anioInt = parseInt(anio, 10) || new Date().getFullYear();

        let fechaInicio, fechaFin, fechaPago, factor, dias;
        const ultimoDiaMes = new Date(anioInt, numMes, 0).getDate();
        const hoyStr = new Date().toISOString().slice(0, 10);

        if (quincena.includes('Primera')) {
            fechaInicio = `${anioInt}-${String(numMes).padStart(2, '0')}-01`;
            fechaFin = `${anioInt}-${String(numMes).padStart(2, '0')}-15`;
            fechaPago = hoyStr;
            factor = 0.5;
            dias = 15;
        } else if (quincena.includes('Segunda')) {
            fechaInicio = `${anioInt}-${String(numMes).padStart(2, '0')}-16`;
            fechaFin = `${anioInt}-${String(numMes).padStart(2, '0')}-${ultimoDiaMes}`;
            fechaPago = hoyStr;
            factor = 0.5;
            dias = 15;
        } else {
            fechaInicio = `${anioInt}-${String(numMes).padStart(2, '0')}-01`;
            fechaFin = `${anioInt}-${String(numMes).padStart(2, '0')}-${ultimoDiaMes}`;
            fechaPago = hoyStr;
            factor = 1.0;
            dias = 30;
        }

        // Obtener todos los empleados activos
        const qEmps = await pool.request().query(`
            SELECT e.IdEmpleado, e.CodigoEmpleado, e.NombreEmpleado, e.ApellidoEmpleado, e.SalarioBase,
                   ISNULL(e.Cedula, 'N/A') AS Cedula,
                   CONVERT(VARCHAR(10), e.FechaIngreso, 120) AS FechaIngreso,
                   ISNULL(c.NombreCargo, 'Sin Cargo') AS NombreCargo,
                   ISNULL(d.NombreDepartamento, 'Sin Departamento') AS NombreDepartamento
            FROM Empleado e
            LEFT JOIN Cargo c ON e.IdCargo = c.IdCargo
            LEFT JOIN Departamento d ON e.idDepartamento = d.idDepartamento
            WHERE e.EstadoEmpleado = 'Activo' AND e.SalarioBase > 0
        `);

        const empleados = qEmps.recordset;
        if (empleados.length === 0) {
            return res.status(400).json({ error: 'No hay empleados activos con salario base para procesar.' });
        }

        let procesados = 0;
        let totalNetoPagado = 0;
        let totalInssLaboral = 0;
        let totalIrRetenido = 0;
        let totalInssPatronal = 0;

        for (const emp of empleados) {
            const salBaseMensual = parseFloat(emp.SalarioBase) || 0;
            const salBasePeriodo = Math.round(salBaseMensual * factor * 100) / 100;
            
            const valorHoraOrdinaria = Math.round((salBaseMensual / 240) * 100) / 100;
            const valorHoraExtra = Math.round((valorHoraOrdinaria * parseFloat(factorRecargo)) * 100) / 100;

            let horasExtra = 0;
            let bonificaciones = 0;
            let comisiones = 0;
            let otrosIngresos = 0;

            if (incluirHorasExtrasEstimadas) {
                const cargo = emp.NombreCargo.toLowerCase();
                const depto = emp.NombreDepartamento.toLowerCase();

                if (depto.includes('venta') || cargo.includes('asesor') || cargo.includes('vendedor')) {
                    horasExtra = (emp.IdEmpleado % 2 === 0) ? 6 : 4;
                    bonificaciones = 1000;
                    comisiones = 3000;
                } else if (depto.includes('taller') || depto.includes('servicio') || cargo.includes('mecanic') || cargo.includes('bodega')) {
                    horasExtra = (emp.IdEmpleado % 2 === 0) ? 8 : 5;
                    bonificaciones = 1200;
                } else if (cargo.includes('asistente') || cargo.includes('analista') || cargo.includes('auxiliar')) {
                    horasExtra = 3;
                    bonificaciones = 500;
                }

                if (factor === 0.5) {
                    horasExtra = Math.floor(horasExtra / 2);
                    bonificaciones = Math.round(bonificaciones * 0.5 * 100) / 100;
                    comisiones = Math.round(comisiones * 0.5 * 100) / 100;
                }
            }

            const montoHorasExtra = Math.round(horasExtra * valorHoraExtra * 100) / 100;
            const salarioBruto = Math.round((salBasePeriodo + montoHorasExtra + bonificaciones + comisiones + otrosIngresos) * 100) / 100;

            // 1. INSS Laboral (7%)
            const inssLaboral = Math.round(salarioBruto * 0.07 * 100) / 100;

            // 2. Retención IR Salarial Progresivo Ley 822 de Nicaragua
            const irMensual = calcularIRNicaragua(salarioBruto) * factor;
            const irRedondeado = Math.round(irMensual * 100) / 100;

            // 3. Deducciones
            const otrasDeducciones = (horasExtra > 0) ? 250 : 0;
            const totalIngresos = salarioBruto;
            const totalDeducciones = Math.round((inssLaboral + irRedondeado + otrasDeducciones) * 100) / 100;
            const salarioNeto = Math.round((totalIngresos - totalDeducciones) * 100) / 100;

            // 4. Aporte Patronal (22.5%)
            const inssPatronal = Math.round(salarioBruto * 0.225 * 100) / 100;
            const totalAPagar = salarioNeto;
            const estado = 'Pagada';

            // Verificar si ya existe registro en este período
            const qExiste = await pool.request()
                .input('IdEmpleado', sql.VarChar(20), String(emp.IdEmpleado))
                .input('FechaInicio', sql.Date, fechaInicio)
                .input('FechaFin', sql.Date, fechaFin)
                .query(`
                    SELECT IdPlanilla FROM Planilla 
                    WHERE IdEmpleado = @IdEmpleado 
                      AND FechaInicioPeriodo = @FechaInicio 
                      AND FechaFinPeriodo = @FechaFin
                `);

            if (qExiste.recordset.length > 0) {
                // Actualizar a Pagada
                await pool.request()
                    .input('IdPlanilla', sql.Int, qExiste.recordset[0].IdPlanilla)
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
                        UPDATE Planilla SET
                            FechaPago = @FechaPago,
                            SalarioBase = @SalarioBase,
                            DiasTrabajados = @DiasTrabajados,
                            HorasExtra = @HorasExtra,
                            Bonificaciones = @Bonificaciones,
                            Comisiones = @Comisiones,
                            OtrosIngresos = @OtrosIngresos,
                            SalarioBruto = @SalarioBruto,
                            INSS = @INSS,
                            IR = @IR,
                            OtrasDeducciones = @OtrasDeducciones,
                            TotalIngresos = @TotalIngresos,
                            TotalDeducciones = @TotalDeducciones,
                            SalarioNeto = @SalarioNeto,
                            INSSPatronal = @INSSPatronal,
                            TotalAPagar = @TotalAPagar,
                            Estado = @Estado
                        WHERE IdPlanilla = @IdPlanilla
                    `);
            } else {
                // Insertar nueva planilla pagada
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
            }

            procesados++;
            totalNetoPagado += salarioNeto;
            totalInssLaboral += inssLaboral;
            totalIrRetenido += irRedondeado;
            totalInssPatronal += inssPatronal;
        }

        res.json({
            ok: true,
            mensaje: `Planilla procesada y PAGADA exitosamente para ${procesados} colaboradores.`,
            periodo: `${mes} ${anioInt} (${quincena})`,
            fechaPago: hoyStr,
            totalEmpleados: procesados,
            totalNetoPagado: Math.round(totalNetoPagado * 100) / 100,
            totalInssLaboral: Math.round(totalInssLaboral * 100) / 100,
            totalIrRetenido: Math.round(totalIrRetenido * 100) / 100,
            totalInssPatronal: Math.round(totalInssPatronal * 100) / 100
        });

    } catch (err) {
        console.error('Error pagando planilla:', err);
        res.status(500).json({ error: 'Error pagando planilla: ' + err.message });
    }
});

// -------------------------------------------------------------
// 8. PUT /api/recursosHumanos/planilla/marcar-pagada/:idPlanilla
// -------------------------------------------------------------
router.put('/planilla/marcar-pagada/:idPlanilla', async (req, res) => {
    try {
        const { idPlanilla } = req.params;
        const pool = await getPool();

        await pool.request()
            .input('IdPlanilla', sql.Int, idPlanilla)
            .query(`
                UPDATE Planilla 
                SET Estado = 'Pagada', FechaPago = CONVERT(DATE, GETDATE())
                WHERE IdPlanilla = @IdPlanilla
            `);

        res.json({ ok: true, mensaje: 'Registro de planilla marcado como PAGADO exitosamente.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;