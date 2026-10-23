/**
 * AMI - Módulo de Gestión de Personal y Planilla Oficial (Recursos Humanos)
 * Cálculos de deducciones de Ley 822 de Nicaragua (INSS 7%, IR Progresivo, INSS Patronal 22.5%)
 */

// ==========================================================================
// ESTADO GLOBAL
// ==========================================================================
let empleadosData = [];
let planillaData = [];
let datosReporteRH = [];
let empleadoSeleccionado = null;

// ==========================================================================
// INICIALIZACIÓN AL CARGAR EL DOM
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
    // 1. Cargar catálogo de colaboradores
    cargarEmpleados();

    // 2. Cargar nómina de planilla
    cargarPlanilla();

    // 3. Listeners de búsqueda y filtrado de colaboradores
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', () => aplicarFiltros());
    }

    const filterDepto = document.getElementById('filterDepto');
    if (filterDepto) {
        filterDepto.addEventListener('change', () => aplicarFiltros());
    }

    const filterEstado = document.getElementById('filterEstado');
    if (filterEstado) {
        filterEstado.addEventListener('change', () => aplicarFiltros());
    }

    // 4. Listeners para filtrado de planilla
    const searchPlanilla = document.getElementById('searchPlanillaInput');
    if (searchPlanilla) {
        searchPlanilla.addEventListener('input', () => filtrarPlanilla());
    }

    const selectMes = document.getElementById('selectPeriodoMes');
    if (selectMes) {
        selectMes.addEventListener('change', () => filtrarPlanilla());
    }

    const selectQuincena = document.getElementById('selectQuincenaPlanilla');
    if (selectQuincena) {
        selectQuincena.addEventListener('change', () => filtrarPlanilla());
    }

    // 5. Botón de reporte salarial individual
    const btnReporteSalarial = document.getElementById('btnReporteSalarial');
    if (btnReporteSalarial) {
        btnReporteSalarial.addEventListener('click', () => {
            if (!empleadoSeleccionado) {
                alert('Seleccione un colaborador de la lista primero.');
                return;
            }
            generarReporte(empleadoSeleccionado);
        });
    }
});

// ==========================================================================
// 1. CARGA Y FILTRADO DE COLABORADORES (VISTA: EMPLEADOS)
// ==========================================================================
async function cargarEmpleados() {
    try {
        const res = await fetch('/api/recursosHumanos');
        empleadosData = await res.json();
        aplicarFiltros();

        // Seleccionar automáticamente al primer empleado si no hay seleccionado
        if (empleadosData.length > 0 && !empleadoSeleccionado) {
            seleccionarEmpleado(empleadosData[0]);
        }
    } catch (e) {
        console.error("Error cargando empleados:", e);
    }
}

function aplicarFiltros() {
    const inputSearch = document.getElementById('searchInput');
    const selectDepto = document.getElementById('filterDepto');
    const selectEstado = document.getElementById('filterEstado');

    const texto = (inputSearch ? inputSearch.value : '').toLowerCase().trim();
    const depto = (selectDepto ? selectDepto.value : 'Todos').toLowerCase().trim();
    const estado = (selectEstado ? selectEstado.value : 'Todos').toLowerCase().trim();

    // Normalizador de tildes para evitar discrepancias (Administración vs Administracion)
    const norm = (str) => (str || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    const filtrados = empleadosData.filter(e => {
        const nombreCompleto = norm((e.NombreEmpleado || '') + ' ' + (e.ApellidoEmpleado || ''));
        const cod = norm(e.CodigoEmpleado || '');
        const ced = norm(e.Cedula || '');
        const cargo = norm(e.NombreCargo || '');
        const dep = norm(e.NombreDepartamento || '');
        const est = norm(e.EstadoEmpleado || '');

        // Coincidencia de texto
        const matchTexto = !texto || (
            nombreCompleto.includes(norm(texto)) ||
            cod.includes(norm(texto)) ||
            ced.includes(norm(texto)) ||
            cargo.includes(norm(texto)) ||
            dep.includes(norm(texto))
        );

        // Coincidencia de Departamento
        const matchDepto = (depto === 'todos') || dep.includes(norm(depto));

        // Coincidencia de Estado
        const matchEstado = (estado === 'todos') || est === norm(estado);

        return matchTexto && matchDepto && matchEstado;
    });

    renderizarTablaEmpleados(filtrados);
}

function renderizarTablaEmpleados(data) {
    const tbody = document.getElementById('employees-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted py-4"><i class="bi bi-inbox fs-4 d-block mb-1"></i> No se encontraron colaboradores con los filtros seleccionados.</td></tr>`;
        return;
    }

    const accionesHTML = `
        <div class="dropdown">
            <button class="btn btn-link text-secondary p-0 border-0" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                <i class="bi bi-three-dots-vertical fs-5"></i>
            </button>
            <ul class="dropdown-menu dropdown-menu-dark dropdown-menu-dark-custom shadow-sm">
                <li><button type="button" class="dropdown-item text-white btn-editar-empleado"><i class="bi bi-pencil-square me-2 text-neon"></i>Editar</button></li>
                <li><hr class="dropdown-divider border-secondary opacity-25 my-1"></li>
                <li><button type="button" class="dropdown-item text-danger btn-eliminar-empleado"><i class="bi bi-trash me-2"></i>Inactivar</button></li>
            </ul>
        </div>
    `;

    data.forEach(e => {
        const nombreCompleto = (e.NombreEmpleado || '') + ' ' + (e.ApellidoEmpleado || '');
        const salBase = parseFloat(e.SalarioBase || 0);
        const tr = document.createElement('tr');
        tr.style.cursor = 'pointer';
        tr.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
        
        tr.onclick = (ev) => {
            if (!ev.target.closest('.dropdown')) {
                seleccionarEmpleado(e);
            }
        };

        const badgeClass = (e.EstadoEmpleado === 'Activo') 
            ? 'badge bg-success bg-opacity-25 text-success rounded-pill px-2' 
            : 'badge bg-secondary bg-opacity-25 text-white-50 rounded-pill px-2';

        tr.innerHTML = `
            <td class="text-center font-monospace small text-secondary">${e.CodigoEmpleado || 'N/A'}</td>
            <td class="text-center fw-medium text-white">${nombreCompleto}</td>
            <td class="text-center small text-secondary">${e.Cedula || 'N/A'}</td>
            <td class="text-center small text-white-50">${e.NombreCargo || 'N/A'}</td>
            <td class="text-center small text-white-50">${e.NombreDepartamento || 'N/A'}</td>
            <td class="text-center fw-bold text-white">C$ ${salBase.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td class="text-center">
                <span class="${badgeClass}">${e.EstadoEmpleado || 'Activo'}</span>
            </td>
            <td class="text-center">${accionesHTML}</td>
        `;
        tbody.appendChild(tr);
    });
}

function seleccionarEmpleado(e) {
    if (!e) return;
    empleadoSeleccionado = e;

    const nombreCompleto = (e.NombreEmpleado || '') + ' ' + (e.ApellidoEmpleado || '');
    const salBase = parseFloat(e.SalarioBase || 0);

    const elNombre = document.getElementById('p-nombre');
    if (elNombre) elNombre.innerText = nombreCompleto;

    const elCargoHeader = document.getElementById('p-cargo-header');
    if (elCargoHeader) elCargoHeader.innerText = e.NombreCargo || 'N/A';

    const elDeptoHeader = document.getElementById('p-depto-header');
    if (elDeptoHeader) elDeptoHeader.innerText = e.NombreDepartamento || 'N/A';

    const elCorreo = document.getElementById('p-correo');
    if (elCorreo) elCorreo.innerText = e.correo || `${(e.NombreEmpleado || 'empleado').toLowerCase()}@ami.com`;

    const elTel = document.getElementById('p-telefono');
    if (elTel) elTel.innerText = e.telefono || '+505 8888-0000';

    const elDir = document.getElementById('p-direccion');
    if (elDir) elDir.innerText = 'Managua, Nicaragua';

    const elCed = document.getElementById('p-cedula');
    if (elCed) elCed.innerText = e.Cedula || 'N/A';

    const elCod = document.getElementById('p-codigo');
    if (elCod) elCod.innerText = e.CodigoEmpleado || 'N/A';

    const elCargo = document.getElementById('p-cargo');
    if (elCargo) elCargo.innerText = e.NombreCargo || 'N/A';

    const elDepto = document.getElementById('p-depto');
    if (elDepto) elDepto.innerText = e.NombreDepartamento || 'N/A';

    const elFecha = document.getElementById('p-fecha');
    if (elFecha) {
        elFecha.innerText = e.FechaIngreso ? new Date(e.FechaIngreso).toLocaleDateString('es-ES') : 'N/A';
    }

    const elContrato = document.getElementById('p-contrato');
    if (elContrato) elContrato.innerText = 'Indeterminado';

    const elSalario = document.getElementById('p-salario');
    if (elSalario) elSalario.innerText = 'C$ ' + salBase.toLocaleString('en-US', { minimumFractionDigits: 2 });

    const elJornada = document.getElementById('p-jornada');
    if (elJornada) elJornada.innerText = 'Tiempo Completo';

    const elBadge = document.getElementById('p-badge');
    if (elBadge) {
        elBadge.style.display = 'inline-block';
        elBadge.innerText = e.EstadoEmpleado || 'Activo';
        elBadge.className = (e.EstadoEmpleado === 'Activo') ? 'status activo' : 'status inactivo';
    }
}

// ==========================================================================
// 2. CARGA Y FILTRADO DE LA PLANILLA OFICIAL (VISTA: PLANILLA)
// ==========================================================================
async function cargarPlanilla() {
    try {
        const res = await fetch('/api/recursosHumanos/planilla');
        const data = await res.json();
        planillaData = data.items || [];
        filtrarPlanilla();
    } catch (e) {
        console.error("Error cargando planilla:", e);
    }
}

function filtrarPlanilla() {
    const selectMes = document.getElementById('selectPeriodoMes');
    const selectQuincena = document.getElementById('selectQuincenaPlanilla');
    const inputSearch = document.getElementById('searchPlanillaInput');

    const mesVal = (selectMes ? selectMes.value : 'Todos').toLowerCase().trim();
    const quincenaVal = (selectQuincena ? selectQuincena.value : 'Todos').toLowerCase().trim();
    const searchVal = (inputSearch ? inputSearch.value : '').toLowerCase().trim();

    const norm = (str) => (str || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    const filtrados = planillaData.filter(r => {
        // Coincidencia de Mes (revisa FechaInicioPeriodo o nombre del mes)
        let matchMes = true;
        if (mesVal !== 'todos') {
            const fechaStr = (r.FechaInicioPeriodo || '') + ' ' + (r.FechaFinPeriodo || '');
            const mesesEs = {
                'enero': '01', 'febrero': '02', 'marzo': '03', 'abril': '04',
                'mayo': '05', 'junio': '06', 'julio': '07', 'agosto': '08',
                'septiembre': '09', 'octubre': '10', 'noviembre': '11', 'diciembre': '12'
            };
            const numMes = mesesEs[mesVal];
            matchMes = numMes ? fechaStr.includes('-' + numMes + '-') : norm(fechaStr).includes(norm(mesVal));
        }

        // Coincidencia de Quincena
        let matchQuincena = true;
        if (quincenaVal === 'primera quincena') {
            matchQuincena = (r.DiasTrabajados === 15) || (r.FechaFinPeriodo && r.FechaFinPeriodo.endsWith('-15'));
        } else if (quincenaVal === 'segunda quincena') {
            matchQuincena = (r.DiasTrabajados === 15) && (r.FechaInicioPeriodo && r.FechaInicioPeriodo.includes('-16'));
        } else if (quincenaVal === 'mes completo') {
            matchQuincena = (r.DiasTrabajados >= 28);
        }

        // Coincidencia de búsqueda
        const nombreCompleto = norm((r.NombreEmpleado || '') + ' ' + (r.ApellidoEmpleado || ''));
        const cod = norm(r.CodigoEmpleado || '');
        const cargo = norm(r.NombreCargo || '');
        const matchSearch = !searchVal || (
            nombreCompleto.includes(norm(searchVal)) ||
            cod.includes(norm(searchVal)) ||
            cargo.includes(norm(searchVal)) ||
            String(r.IdPlanilla).includes(searchVal)
        );

        return matchMes && matchQuincena && matchSearch;
    });

    renderizarTablaPlanilla(filtrados);
    actualizarResumenPlanilla(filtrados);
}

function renderizarTablaPlanilla(items) {
    const tbody = document.getElementById('payroll-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!items || items.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="21" class="text-center py-4 text-muted">
                    <i class="bi bi-inbox fs-3 d-block mb-2"></i>
                    No se encontraron registros de planilla para el período seleccionado.
                    <div class="mt-2">
                        <button class="btn btn-sm bg-neon-green text-dark rounded-pill fw-bold px-3" onclick="abrirModalGenerarPlanilla()">
                            <i class="fa-solid fa-file-invoice me-1"></i> Generar Planilla para este período
                        </button>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    const fmt = (v) => 'C$ ' + Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const accionesHTML = `
        <div class="dropdown">
            <button class="btn btn-link text-secondary p-0 border-0" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                <i class="bi bi-three-dots-vertical fs-5"></i>
            </button>
            <ul class="dropdown-menu dropdown-menu-dark dropdown-menu-dark-custom shadow-sm">
                <li><button type="button" class="dropdown-item text-white"><i class="bi bi-printer me-2 text-neon"></i>Imprimir Recibo</button></li>
                <li><button type="button" class="dropdown-item text-white"><i class="bi bi-check-circle me-2 text-success"></i>Marcar Pagada</button></li>
            </ul>
        </div>
    `;

    items.forEach(r => {
        const nombreCompleto = (r.NombreEmpleado || '') + ' ' + (r.ApellidoEmpleado || '');
        const pTr = document.createElement('tr');
        pTr.style.borderBottom = '1px solid rgba(255,255,255,0.05)';

        const estadoBadge = (r.Estado === 'Pagada')
            ? '<span class="badge bg-success bg-opacity-25 text-success rounded-pill px-2">Pagada</span>'
            : '<span class="badge bg-warning bg-opacity-25 text-warning rounded-pill px-2">Pendiente</span>';

        // CÁLCULO EXACTO Y TRANSPARENTE DE HORAS EXTRAS:
        const salBase = parseFloat(r.SalarioBase) || 0;
        const cantHoras = parseInt(r.HorasExtra, 10) || 0;
        const montoHE = parseFloat(r.MontoHorasExtra || 0);
        const valorHE = parseFloat(r.ValorHoraExtra || (cantHoras > 0 ? (montoHE / cantHoras) : (salBase / 240 * 1.5)));

        let celdaHE = '';
        if (cantHoras > 0 && montoHE > 0) {
            celdaHE = `
                <div class="fw-bold text-white">${fmt(montoHE)}</div>
                <div class="small text-info opacity-75" title="Tarifa: ${fmt(valorHE)} por hora">${cantHoras} hrs (@${fmt(valorHE)})</div>
            `;
        } else if (cantHoras > 0) {
            celdaHE = `
                <div class="fw-bold text-white">${cantHoras} hrs</div>
                <div class="small text-muted">C$ 0.00</div>
            `;
        } else {
            celdaHE = `<span class="text-secondary small">C$ 0.00 <span class="opacity-50">(0 hrs)</span></span>`;
        }

        pTr.innerHTML = `
            <td class="font-monospace small text-secondary">#PL-${r.IdPlanilla}</td>
            <td class="small text-secondary">${r.FechaInicioPeriodo || 'N/A'}</td>
            <td class="fw-medium text-white">${nombreCompleto}</td>
            <td class="font-monospace small text-secondary">${r.CodigoEmpleado || 'N/A'}</td>
            <td class="text-white">${fmt(r.SalarioBase)}</td>
            <td class="text-center text-secondary">${r.DiasTrabajados}</td>
            <td class="text-end pe-3">${celdaHE}</td>
            <td class="text-secondary">${fmt(r.Bonificaciones)}</td>
            <td class="text-secondary">${fmt(r.Comisiones)}</td>
            <td class="text-secondary">${fmt(r.OtrosIngresos)}</td>
            <td class="fw-bold text-white">${fmt(r.SalarioBruto)}</td>
            <td class="text-danger fw-semibold">-${fmt(r.INSS)}</td>
            <td class="text-danger fw-semibold">-${fmt(r.IR)}</td>
            <td class="text-secondary">-${fmt(r.OtrasDeducciones)}</td>
            <td class="text-danger fw-bold">-${fmt(r.TotalDeducciones)}</td>
            <td class="text-success fw-bold">${fmt(r.SalarioNeto)}</td>
            <td class="text-warning small">${fmt(r.INSSPatronal)}</td>
            <td class="fw-bold text-neon-green fs-6">${fmt(r.TotalAPagar)}</td>
            <td class="small text-secondary">${r.FechaPago || 'N/A'}</td>
            <td class="text-center">${estadoBadge}</td>
            <td class="text-center">${accionesHTML}</td>
        `;
        tbody.appendChild(pTr);
    });
}

function actualizarResumenPlanilla(items) {
    let sumBase = 0;
    let sumMontoHorasExtra = 0;
    let sumCantHorasExtra = 0;
    let sumIngresos = 0;
    let sumDeducciones = 0;
    let sumPatronal = 0;
    let sumPagar = 0;

    (items || []).forEach(r => {
        const salBase = parseFloat(r.SalarioBase) || 0;
        const cantHE = parseInt(r.HorasExtra, 10) || 0;
        const montoHE = parseFloat(r.MontoHorasExtra || 0);

        sumBase += salBase;
        sumCantHorasExtra += cantHE;
        sumMontoHorasExtra += montoHE;
        sumIngresos += parseFloat(r.TotalIngresos || r.SalarioBruto) || 0;
        sumDeducciones += parseFloat(r.TotalDeducciones) || 0;
        sumPatronal += parseFloat(r.INSSPatronal) || 0;
        sumPagar += parseFloat(r.TotalAPagar || r.SalarioNeto) || 0;
    });

    const fmt = (v) => 'C$ ' + Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const elBase = document.getElementById('resumen-total-base');
    if (elBase) elBase.textContent = fmt(sumBase);

    // TOTAL HORAS EXTRA: MONTO EN CÓRDOBAS (NO NÚMERO DE HORAS)
    const elHoras = document.getElementById('resumen-total-horas-extra');
    if (elHoras) elHoras.textContent = fmt(sumMontoHorasExtra);

    const elCantHoras = document.getElementById('resumen-cantidad-horas-extra');
    if (elCantHoras) elCantHoras.textContent = `${sumCantHorasExtra} hrs acumuladas en el período`;

    const elIngresos = document.getElementById('resumen-total-ingresos');
    if (elIngresos) elIngresos.textContent = fmt(sumIngresos);

    const elDeducciones = document.getElementById('resumen-total-deducciones');
    if (elDeducciones) elDeducciones.textContent = fmt(sumDeducciones);

    const elPatronal = document.getElementById('resumen-total-patronal');
    if (elPatronal) elPatronal.textContent = fmt(sumPatronal);

    const elPagar = document.getElementById('resumen-total-pagar');
    if (elPagar) elPagar.textContent = fmt(sumPagar);
}

// ==========================================================================
// 3. GENERAR NUEVA PLANILLA SALARIAL (MODAL Y BACKEND)
// ==========================================================================
window.abrirModalGenerarPlanilla = function () {
    const modalEl = document.getElementById('modalGenerarPlanilla');
    if (!modalEl) return;

    const countEmpleados = empleadosData.filter(e => e.EstadoEmpleado === 'Activo' && parseFloat(e.SalarioBase) > 0).length;
    const countEl = document.getElementById('modalPlanillaCountEmpleados');
    if (countEl) {
        countEl.textContent = `${countEmpleados} colaboradores activos listos para cálculo de nómina.`;
    }

    if (window.bootstrap) {
        bootstrap.Modal.getOrCreateInstance(modalEl).show();
    }
};

window.ejecutarGeneracionPlanilla = async function () {
    const mesEl = document.getElementById('modalPlanillaMes');
    const quincenaEl = document.getElementById('modalPlanillaQuincena');
    const anioEl = document.getElementById('modalPlanillaAnio');
    const btnConfirmar = document.getElementById('btnConfirmarGenerarPlanilla');

    const mes = mesEl ? mesEl.value : 'Octubre';
    const quincena = quincenaEl ? quincenaEl.value : 'Mes Completo';
    const anio = anioEl ? anioEl.value : 2026;

    try {
        if (btnConfirmar) {
            btnConfirmar.disabled = true;
            btnConfirmar.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Calculando ley...';
        }

        const factorEl = document.getElementById('selectFactorHorasExtra');
        const checkEl = document.getElementById('checkHorasExtrasEstimadas');
        const factorRecargo = factorEl ? parseFloat(factorEl.value) : 1.5;
        const incluirHorasExtrasEstimadas = checkEl ? checkEl.checked : true;

        const res = await fetch('/api/recursosHumanos/planilla/generar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                mes, 
                anio, 
                quincena,
                factorRecargo,
                incluirHorasExtrasEstimadas
            })
        });

        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.error || 'Error al generar planilla');
        }

        alert(`¡Planilla generada con éxito! Se procesaron ${data.insertados} colaboradores para el período ${data.periodo}.`);

        // Cerrar modal
        const modalEl = document.getElementById('modalGenerarPlanilla');
        if (modalEl && window.bootstrap) {
            bootstrap.Modal.getOrCreateInstance(modalEl).hide();
        }

        // Sincronizar selector de mes con el mes generado y recargar
        const selectMes = document.getElementById('selectPeriodoMes');
        if (selectMes) selectMes.value = mes;

        await cargarPlanilla();

    } catch (err) {
        alert('Error: ' + err.message);
    } finally {
        if (btnConfirmar) {
            btnConfirmar.disabled = false;
            btnConfirmar.innerHTML = '<i class="bi bi-check-circle-fill me-1"></i> Generar y Guardar en BD';
        }
    }
};

// ==========================================================================
// 4. REPORTE SALARIAL Y NAVEGACIÓN
// ==========================================================================
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

function generarReporte(empleadoUnico = null) {
    const lista = empleadoUnico ? [empleadoUnico] : empleadosData;
    if (lista.length === 0) return alert('No hay colaboradores para mostrar.');

    datosReporteRH = lista.map(e => {
        const salBase = parseFloat(e.SalarioBase) || 0;
        const inss = Math.round(salBase * 0.07 * 100) / 100;
        const ir = calcularIRNicaragua(salBase);
        const salNeto = Math.round((salBase - inss - ir) * 100) / 100;
        return {
            id: e.IdEmpleado,
            nombre: (e.NombreEmpleado || '') + ' ' + (e.ApellidoEmpleado || ''),
            salarioBase: salBase,
            inss: inss,
            ir: ir,
            salarioNeto: salNeto
        };
    });

    const tbody = document.getElementById('cuerpo-tabla-reporte-rh');
    if (tbody) {
        tbody.innerHTML = datosReporteRH.map(r => `
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                <td class="font-monospace small ps-3">#${r.id}</td>
                <td class="text-white fw-medium">${r.nombre}</td>
                <td class="text-white">C$ ${r.salarioBase.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                <td class="text-danger fw-semibold">-C$ ${r.inss.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                <td class="text-danger fw-semibold">-C$ ${r.ir.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                <td class="text-success fw-bold pe-3">C$ ${r.salarioNeto.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
            </tr>
        `).join('');
    }

    const modalEl = document.getElementById('modalReporteRH');
    if (modalEl && window.bootstrap) {
        bootstrap.Modal.getOrCreateInstance(modalEl).show();
    }
}


// ==========================================================================
// 6. EXPORTACIÓN DE PLANILLA Y REPORTES A EXCEL / CSV
// ==========================================================================
function descargarPlanillaExcel() {
    const lista = (planillaFiltrada && planillaFiltrada.length > 0) ? planillaFiltrada : planillaData;
    if (!lista || lista.length === 0) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'warning',
                title: 'Sin datos',
                text: 'No hay registros de planilla cargados o filtrados para exportar.',
                background: '#1a1d24',
                color: '#fff'
            });
        } else {
            alert('No hay registros de planilla cargados o filtrados para exportar.');
        }
        return;
    }

    const selectMes = document.getElementById('selectPeriodoMes');
    const selectQuincena = document.getElementById('selectQuincenaPlanilla');
    const periodoLabel = `${selectMes ? selectMes.value : 'General'}_${selectQuincena ? selectQuincena.value : ''}`.replace(/\s+/g, '_');

    let csvContent = "\uFEFF";
    csvContent += "ID Planilla,Empleado,Código Empleado,Periodo Inicial,Periodo Final,Fecha Pago,Salario Base (C$),Días Trabajados,Horas Extra (Cant),Monto Horas Extra (C$),Bonificaciones (C$),Comisiones (C$),Otros Ingresos (C$),Salario Bruto (C$),INSS Laboral 7% (C$),IR Retención (C$),Otras Deducciones (C$),Total Deducciones (C$),Salario Neto (C$),INSS Patronal 22.5% (C$),Total a Pagar (C$),Estado\r\n";

    lista.forEach(r => {
        const id = r.id || r.IdPlanilla || '';
        const emp = (r.empleado || r.NombreEmpleado || '').replace(/"/g, '""');
        const cod = r.codigo || r.CodigoEmpleado || '';
        const fIni = r.periodoInicial || r.FechaInicioPeriodo || '';
        const fFin = r.periodoFinal || r.FechaFinPeriodo || '';
        const fPago = r.fechaPago || r.FechaPago || '';
        const salBase = parseFloat(r.salarioBase || r.SalarioBase || 0).toFixed(2);
        const dias = r.diasTrabajados || r.DiasTrabajados || 30;
        const hExtra = r.horasExtra || r.HorasExtra || 0;
        const bonif = parseFloat(r.bonificaciones || r.Bonificaciones || 0).toFixed(2);
        const com = parseFloat(r.comisiones || r.Comisiones || 0).toFixed(2);
        const otros = parseFloat(r.otrosIngresos || r.OtrosIngresos || 0).toFixed(2);
        const salBruto = parseFloat(r.salarioBruto || r.SalarioBruto || 0).toFixed(2);
        const inss = parseFloat(r.inss || r.INSS || 0).toFixed(2);
        const ir = parseFloat(r.ir || r.IR || 0).toFixed(2);
        const otrasDed = parseFloat(r.otrasDeducciones || r.OtrasDeducciones || 0).toFixed(2);
        const totDed = parseFloat(r.totalDeducciones || r.TotalDeducciones || 0).toFixed(2);
        const salNeto = parseFloat(r.salarioNeto || r.SalarioNeto || 0).toFixed(2);
        const inssPat = parseFloat(r.inssPatronal || r.INSSPatronal || 0).toFixed(2);
        const totPagar = parseFloat(r.totalAPagar || r.TotalAPagar || 0).toFixed(2);
        const est = r.estado || r.Estado || 'Pagado';

        const montoHE = parseFloat(r.MontoHorasExtra || 0).toFixed(2);
        csvContent += `"${id}","${emp}","${cod}","${fIni}","${fFin}","${fPago}",${salBase},${dias},${hExtra},${montoHE},${bonif},${com},${otros},${salBruto},${inss},${ir},${otrasDed},${totDed},${salNeto},${inssPat},${totPagar},"${est}"\r\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    const fechaHoy = new Date().toISOString().split('T')[0];
    link.download = `Planilla_Oficial_AMI_${periodoLabel}_${fechaHoy}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function descargarReporteExcel() {
    if (!datosReporteRH || datosReporteRH.length === 0) {
        // Auto-generar datos si no se habían generado antes
        generarReporte();
    }
    if (!datosReporteRH || datosReporteRH.length === 0) {
        alert("No hay datos de colaboradores para exportar el reporte.");
        return;
    }

    let csvContent = "\uFEFFID,Nombre Colaborador,Salario Base (C$),INSS Laboral 7% (C$),Retención IR (C$),Salario Neto (C$)\r\n";
    datosReporteRH.forEach(r => {
        csvContent += `"${r.id}","${r.nombre.replace(/"/g, '""')}",${r.salarioBase},${r.inss},${r.ir},${r.salarioNeto}\r\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Reporte_Salarial_AMI_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

window.descargarPlanillaExcel = descargarPlanillaExcel;
window.descargarReporteExcel = descargarReporteExcel;

window.switchMainTab = function (tabId, element) {
    document.querySelectorAll('.custom-tab').forEach(t => t.classList.remove('active'));
    if (element) element.classList.add('active');

    document.querySelectorAll('.view-section').forEach(v => v.classList.remove('active'));
    const target = document.getElementById('view-' + tabId);
    if (target) target.classList.add('active');

    if (tabId === 'planilla') {
        cargarPlanilla();
    } else if (tabId === 'empleados') {
        cargarEmpleados();
    }
};

// Pestañas secundarias en tarjeta de detalle (Personal vs Laboral)
window.switchInnerTab = function (tabId, element) {
    document.querySelectorAll('.inner-tab').forEach(t => t.classList.remove('active'));
    if (element) element.classList.add('active');

    document.querySelectorAll('.inner-view').forEach(v => v.classList.remove('active'));
    const target = document.getElementById('inner-' + tabId);
    if (target) target.classList.add('active');
};
