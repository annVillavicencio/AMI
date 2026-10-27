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
let empleadoPlanillaSeleccionado = null;

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

    // Auto-seleccionar trabajador en la ficha de detalle
    if (filtrados.length > 0) {
        const stillSelected = empleadoPlanillaSeleccionado && filtrados.some(x => x.IdPlanilla == empleadoPlanillaSeleccionado.IdPlanilla);
        if (stillSelected) {
            seleccionarTrabajadorPlanilla(empleadoPlanillaSeleccionado.IdPlanilla);
        } else {
            seleccionarTrabajadorPlanilla(filtrados[0].IdPlanilla);
        }
    } else {
        renderizarDetalleEmpleadoPlanillaVacio();
    }
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

    items.forEach(r => {
        const nombreCompleto = (r.NombreEmpleado || '') + ' ' + (r.ApellidoEmpleado || '');
        const pTr = document.createElement('tr');
        pTr.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
        pTr.className = 'payroll-row' + (empleadoPlanillaSeleccionado && empleadoPlanillaSeleccionado.IdPlanilla == r.IdPlanilla ? ' selected' : '');
        pTr.setAttribute('data-id-planilla', r.IdPlanilla);
        pTr.title = "Haz clic en esta fila para ver la ficha salarial completa de " + nombreCompleto;

        // Click row to select worker
        pTr.onclick = (e) => {
            if (!e.target.closest('.dropdown') && !e.target.closest('button')) {
                seleccionarTrabajadorPlanilla(r.IdPlanilla);
            }
        };

        const esPagada = (r.Estado === 'Pagada');
        const estadoBadge = esPagada
            ? '<span class="badge bg-success bg-opacity-25 text-success rounded-pill px-2"><i class="bi bi-check-circle me-1"></i>Pagada</span>'
            : '<span class="badge bg-warning bg-opacity-25 text-warning rounded-pill px-2"><i class="bi bi-clock me-1"></i>Pendiente</span>';

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

        const accionesRowHTML = `
            <div class="dropdown">
                <button class="btn btn-link text-secondary p-0 border-0" type="button" data-bs-toggle="dropdown" aria-expanded="false" title="Acciones">
                    <i class="bi bi-three-dots-vertical fs-5"></i>
                </button>
                <ul class="dropdown-menu dropdown-menu-dark dropdown-menu-dark-custom shadow-sm dropdown-menu-end">
                    <li><button type="button" class="dropdown-item text-white d-flex align-items-center gap-2" onclick="seleccionarTrabajadorPlanilla(${r.IdPlanilla})"><i class="bi bi-person-lines-fill text-info"></i>Ver Ficha Salarial</button></li>
                    <li><button type="button" class="dropdown-item text-white d-flex align-items-center gap-2" onclick="abrirBoletaPagoPlanilla(${r.IdPlanilla})"><i class="bi bi-printer text-neon-green"></i>Imprimir Boleta</button></li>
                    ${!esPagada ? `
                    <li><hr class="dropdown-divider border-secondary opacity-25 my-1"></li>
                    <li><button type="button" class="dropdown-item text-success fw-bold d-flex align-items-center gap-2" onclick="marcarPlanillaPagadaIndividual(${r.IdPlanilla})"><i class="bi bi-check2-circle"></i>Pagar este Trabajador</button></li>
                    ` : ''}
                </ul>
            </div>
        `;

        pTr.innerHTML = `
            <td class="font-monospace small text-secondary">#PL-${r.IdPlanilla}</td>
            <td class="small text-secondary">${r.FechaInicioPeriodo || 'N/A'}</td>
            <td class="fw-medium text-white">
                <a href="javascript:void(0)" onclick="seleccionarTrabajadorPlanilla(${r.IdPlanilla})" class="text-white text-decoration-none fw-semibold d-flex align-items-center gap-2">
                    <span class="rounded-circle d-inline-flex align-items-center justify-content-center text-dark fw-bold" style="width: 24px; height: 24px; background: var(--neon-green); font-size: 0.7rem;">${((r.NombreEmpleado || 'A')[0]).toUpperCase()}</span>
                    <span>${nombreCompleto}</span>
                </a>
            </td>
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
            <td class="text-warning small" title="Aporte asumido por la empresa ante el INSS: ${fmt(r.INSSPatronal)} (No deducible al trabajador)">${fmt(r.INSSPatronal)}</td>
            <td class="fw-bold text-neon-green fs-6">${fmt(r.TotalAPagar)}</td>
            <td class="small text-secondary">${r.FechaPago || 'N/A'}</td>
            <td class="text-center">${estadoBadge}</td>
            <td class="text-center">${accionesRowHTML}</td>
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



// ==========================================================================
// FUNCIONES GLOBALES DE PLANILLA Y GESTIÓN SALARIAL (EN VENTANA)
// ==========================================================================

function abrirModalPagarPlanilla() {
    const modalEl = document.getElementById('modalPagarPlanilla');
    if (!modalEl) {
        console.error('Modal modalPagarPlanilla no encontrado en el DOM');
        alert('Error: No se encontró la ventana modal de pago de planilla.');
        return;
    }

    // Limpiar backdrops residuales
    document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
    if (document.body) {
        document.body.classList.remove('modal-open');
        document.body.style.removeProperty('overflow');
        document.body.style.removeProperty('padding-right');
    }

    const selectMes = document.getElementById('selectPeriodoMes');
    const selectQuincena = document.getElementById('selectQuincenaPlanilla');
    const modalMes = document.getElementById('modalPagarMes');
    const modalQuincena = document.getElementById('modalPagarQuincena');

    if (modalMes && selectMes && selectMes.value !== 'Todos') {
        modalMes.value = selectMes.value;
    }
    if (modalQuincena && selectQuincena && selectQuincena.value !== 'Todos') {
        modalQuincena.value = selectQuincena.value;
    }

    const badgeCount = document.getElementById('modalPagarTotalEmpleados');
    if (badgeCount) {
        badgeCount.textContent = '19 Colaboradores Activos';
    }

    try {
        const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
        modal.show();
    } catch (err) {
        console.warn('Bootstrap modal error, using direct display:', err);
        modalEl.classList.add('show');
        modalEl.style.display = 'block';
    }
}

async function ejecutarPagoPlanillaCompleta() {
    const mesEl = document.getElementById('modalPagarMes');
    const quincenaEl = document.getElementById('modalPagarQuincena');
    const btn = document.getElementById('btnConfirmarPagarPlanilla');

    const mes = mesEl ? mesEl.value : 'Octubre';
    const quincena = quincenaEl ? quincenaEl.value : 'Mes Completo';
    const anio = 2026;

    try {
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Calculando y pagando nómina...';
        }

        const res = await fetch('/api/recursosHumanos/planilla/pagar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                mes,
                anio,
                quincena,
                factorRecargo: 1.5,
                incluirHorasExtrasEstimadas: true
            })
        });

        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.error || 'Error al procesar pago de planilla');
        }

        // Cerrar modal
        const modalEl = document.getElementById('modalPagarPlanilla');
        if (modalEl) {
            try {
                const modal = bootstrap.Modal.getInstance(modalEl);
                if (modal) modal.hide();
            } catch (_) {
                modalEl.classList.remove('show');
                modalEl.style.display = 'none';
            }
        }
        document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
        document.body.classList.remove('modal-open');

        alert(`✅ ¡PLANILLA PAGADA EXITOSAMENTE!\n\n• Período: ${data.periodo}\n• Colaboradores calculados y pagados: ${data.totalEmpleados}\n• Total Neto Desembolsado: C$ ${Number(data.totalNetoPagado).toLocaleString('en-US', { minimumFractionDigits: 2 })}\n• INSS Laboral (7%): C$ ${Number(data.totalInssLaboral).toLocaleString('en-US', { minimumFractionDigits: 2 })}\n• Retención IR Ley 822: C$ ${Number(data.totalIrRetenido).toLocaleString('en-US', { minimumFractionDigits: 2 })}\n• INSS Patronal (22.5%): C$ ${Number(data.totalInssPatronal).toLocaleString('en-US', { minimumFractionDigits: 2 })}\n\nLos registros de todos los colaboradores quedaron asentados como PAGADOS en la base de datos.`);

        // Recargar planilla
        await cargarPlanilla();

    } catch (err) {
        console.error('Error pagando planilla:', err);
        alert('❌ Error al procesar el pago de la planilla: ' + err.message);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="bi bi-check2-circle fs-5 me-1"></i> Confirmar y Pagar a Todos';
        }
    }
}

function abrirModalGenerarPlanilla() {
    const modalEl = document.getElementById('modalGenerarPlanilla');
    if (!modalEl) {
        console.error('Modal modalGenerarPlanilla no encontrado en el DOM');
        return;
    }

    // Limpiar backdrops residuales
    document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
    if (document.body) {
        document.body.classList.remove('modal-open');
        document.body.style.removeProperty('overflow');
        document.body.style.removeProperty('padding-right');
    }

    const countEmpleados = (empleadosData || []).filter(e => e.EstadoEmpleado === 'Activo' && parseFloat(e.SalarioBase) > 0).length;
    const countEl = document.getElementById('modalPlanillaCountEmpleados');
    if (countEl) {
        countEl.textContent = `${countEmpleados || 19} colaboradores activos listos para cálculo de nómina.`;
    }

    try {
        const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
        modal.show();
    } catch (err) {
        console.warn('Bootstrap modal error, using direct display:', err);
        modalEl.classList.add('show');
        modalEl.style.display = 'block';
    }
}

function seleccionarTrabajadorPlanilla(idPlanilla) {
    const item = (planillaData || []).find(p => p.IdPlanilla == idPlanilla);
    if (!item) {
        console.warn('No se encontró planilla con ID:', idPlanilla);
        return;
    }

    empleadoPlanillaSeleccionado = item;

    // Actualizar clase selected en todas las filas de la tabla
    document.querySelectorAll('.payroll-row').forEach(tr => {
        if (tr.getAttribute('data-id-planilla') == idPlanilla) {
            tr.classList.add('selected');
        } else {
            tr.classList.remove('selected');
        }
    });

    renderizarDetalleEmpleadoPlanilla(item);
}

function renderizarDetalleEmpleadoPlanillaVacio() {
    const placeholder = document.getElementById('detalle-planilla-placeholder');
    const content = document.getElementById('detalle-planilla-content');
    if (placeholder) placeholder.style.display = 'block';
    if (content) content.style.display = 'none';
}

function renderizarDetalleEmpleadoPlanilla(item) {
    const placeholder = document.getElementById('detalle-planilla-placeholder');
    const content = document.getElementById('detalle-planilla-content');
    if (!content) return;

    if (!item) {
        renderizarDetalleEmpleadoPlanillaVacio();
        return;
    }

    if (placeholder) placeholder.style.display = 'none';
    content.style.display = 'block';

    const fmt = (v) => 'C$ ' + Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const fmtUSD = (crd) => '$ ' + (Number(crd || 0) / 36.6243).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' USD';

    const nombreCompleto = (item.NombreEmpleado || '') + ' ' + (item.ApellidoEmpleado || '');
    const iniciales = ((item.NombreEmpleado || 'A')[0] + (item.ApellidoEmpleado || 'M')[0]).toUpperCase();
    const cantHoras = parseInt(item.HorasExtra, 10) || 0;
    const montoHE = parseFloat(item.MontoHorasExtra || 0);
    const salBase = parseFloat(item.SalarioBase) || 0;
    const valorHE = parseFloat(item.ValorHoraExtra || (cantHoras > 0 ? (montoHE / cantHoras) : (salBase / 240 * 1.5)));
    const dias = item.DiasTrabajados || 30;
    const salBruto = parseFloat(item.SalarioBruto || item.TotalIngresos) || 0;
    const inssLab = parseFloat(item.INSS) || 0;
    const irSal = parseFloat(item.IR) || 0;
    const otrasDed = parseFloat(item.OtrasDeducciones) || 0;
    const totDed = parseFloat(item.TotalDeducciones) || (inssLab + irSal + otrasDed);
    const salNeto = parseFloat(item.SalarioNeto || item.TotalAPagar) || (salBruto - totDed);
    const inssPat = parseFloat(item.INSSPatronal) || (salBruto * 0.225);
    const inatec = Math.round(salBruto * 0.02 * 100) / 100;
    const costoTotalEmpresa = Math.round((salBruto + inssPat + inatec) * 100) / 100;

    const esPagada = (item.Estado === 'Pagada');
    const badgeEstado = esPagada 
        ? '<span class="badge bg-success bg-opacity-25 text-success border border-success border-opacity-50 px-2 py-1 rounded-pill"><i class="bi bi-check-circle-fill me-1"></i>Pagada</span>'
        : '<span class="badge bg-warning bg-opacity-25 text-warning border border-warning border-opacity-50 px-2 py-1 rounded-pill"><i class="bi bi-clock-history me-1"></i>Pendiente</span>';

    content.innerHTML = `
        <!-- ENCABEZADO TRABAJADOR -->
        <div class="d-flex align-items-center gap-3 pb-3 border-bottom border-secondary border-opacity-25 mb-3">
            <div class="rounded-circle d-flex align-items-center justify-content-center text-dark fw-bold fs-5 shadow-sm" style="width: 50px; height: 50px; background: linear-gradient(135deg, var(--neon-green) 0%, #38BDF8 100%); flex-shrink: 0;">
                ${iniciales}
            </div>
            <div class="flex-grow-1 overflow-hidden">
                <div class="d-flex align-items-center justify-content-between gap-2">
                    <h6 class="text-white fw-bold mb-0 text-truncate" title="${nombreCompleto}">${nombreCompleto}</h6>
                    ${badgeEstado}
                </div>
                <div class="small text-secondary text-truncate mt-1">
                    <span class="text-neon-green fw-semibold">${item.NombreCargo || 'Colaborador'}</span> • ${item.NombreDepartamento || 'General'}
                </div>
                <div class="small text-muted font-monospace" style="font-size: 0.75rem;">
                    Cód: <span class="text-white">${item.CodigoEmpleado || 'N/A'}</span> | Cédula: <span class="text-white">${item.Cedula || '001-000000-0000X'}</span>
                </div>
            </div>
        </div>

        <!-- PERIODO Y FECHA -->
        <div class="d-flex justify-content-between align-items-center small p-2 rounded-3 mb-3" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);">
            <div>
                <span class="text-muted d-block" style="font-size: 0.72rem;">PERÍODO PLANILLA</span>
                <span class="text-white fw-semibold">${item.FechaInicioPeriodo || ''} al ${item.FechaFinPeriodo || ''}</span>
            </div>
            <div class="text-end">
                <span class="text-muted d-block" style="font-size: 0.72rem;">FECHA DE PAGO</span>
                <span class="text-info fw-semibold">${item.FechaPago || 'Por liquidar'}</span>
            </div>
        </div>

        <!-- 1. HABERES / INGRESOS DEVENGADOS -->
        <div class="detalle-box-ingreso p-3 rounded-3 mb-3">
            <div class="d-flex justify-content-between align-items-center mb-2">
                <span class="small fw-bold text-info text-uppercase"><i class="bi bi-wallet2 me-1"></i> 1. Ingresos Devengados</span>
                <span class="badge bg-info bg-opacity-25 text-info px-2" style="font-size: 0.7rem;">${dias} días</span>
            </div>
            <div class="d-flex justify-content-between small text-secondary mb-1">
                <span>Salario Base del Período:</span>
                <span class="text-white fw-medium">${fmt(salBase)}</span>
            </div>
            ${cantHoras > 0 ? `
            <div class="d-flex justify-content-between small text-secondary mb-1">
                <span>Horas Extra (${cantHoras} hrs @ ${fmt(valorHE)}):</span>
                <span class="text-white fw-medium">${fmt(montoHE)}</span>
            </div>` : ''}
            ${parseFloat(item.Bonificaciones) > 0 ? `
            <div class="d-flex justify-content-between small text-secondary mb-1">
                <span>Bonificaciones por Desempeño:</span>
                <span class="text-white fw-medium">${fmt(item.Bonificaciones)}</span>
            </div>` : ''}
            ${parseFloat(item.Comisiones) > 0 ? `
            <div class="d-flex justify-content-between small text-secondary mb-1">
                <span>Comisiones por Ventas:</span>
                <span class="text-white fw-medium">${fmt(item.Comisiones)}</span>
            </div>` : ''}
            ${parseFloat(item.OtrosIngresos) > 0 ? `
            <div class="d-flex justify-content-between small text-secondary mb-1">
                <span>Otros Ingresos / Viáticos:</span>
                <span class="text-white fw-medium">${fmt(item.OtrosIngresos)}</span>
            </div>` : ''}
            <div class="d-flex justify-content-between small pt-1 border-top border-info border-opacity-25 mt-1 fw-bold">
                <span class="text-white">Salario Bruto (Total Ingresos):</span>
                <span class="text-info">${fmt(salBruto)}</span>
            </div>
        </div>

        <!-- 2. DEDUCCIONES LEGALES (NICARAGUA LEY 822) -->
        <div class="detalle-box-deduccion p-3 rounded-3 mb-3">
            <div class="d-flex justify-content-between align-items-center mb-2">
                <span class="small fw-bold text-danger text-uppercase"><i class="bi bi-shield-x me-1"></i> 2. Deducciones de Ley</span>
                <span class="badge bg-danger bg-opacity-25 text-danger px-2" style="font-size: 0.7rem;">Ley 822</span>
            </div>
            <div class="d-flex justify-content-between small text-secondary mb-1">
                <span>INSS Laboral (7%):</span>
                <span class="text-danger fw-medium">-${fmt(inssLab)}</span>
            </div>
            <div class="d-flex justify-content-between small text-secondary mb-1">
                <span>Retención IR Salarial (Ley 822):</span>
                <span class="text-danger fw-medium">-${fmt(irSal)}</span>
            </div>
            ${otrasDed > 0 ? `
            <div class="d-flex justify-content-between small text-secondary mb-1">
                <span>Otras Deducciones / Préstamos:</span>
                <span class="text-secondary fw-medium">-${fmt(otrasDed)}</span>
            </div>` : ''}
            <div class="d-flex justify-content-between small pt-1 border-top border-danger border-opacity-25 mt-1 fw-bold">
                <span class="text-white">Total Deducciones:</span>
                <span class="text-danger">-${fmt(totDed)}</span>
            </div>
        </div>

        <!-- 3. SALARIO NETO A PAGAR -->
        <div class="detalle-box-neto p-3 rounded-3 mb-3 text-center">
            <span class="small text-secondary text-uppercase fw-bold d-block mb-1">3. Salario Neto a Recibir (Líquido)</span>
            <div class="fs-4 fw-bold text-neon-green mb-1" style="text-shadow: 0 0 12px rgba(219,255,153,0.3);">${fmt(salNeto)}</div>
            <div class="small text-white opacity-75">Equivalente Oficial: <span class="fw-bold">${fmtUSD(salNeto)}</span> (BCN C$ 36.62)</div>
        </div>

        <!-- 4. APORTES PATRONALES (EMPRESA) -->
        <div class="detalle-box-patronal p-3 rounded-3 mb-3">
            <span class="small fw-bold text-warning text-uppercase d-block mb-2"><i class="bi bi-building me-1"></i> 4. Cargas Patronales (Autos AMI S.A.)</span>
            <div class="d-flex justify-content-between small text-secondary mb-1">
                <span>INSS Patronal (22.5%):</span>
                <span class="text-warning fw-medium">${fmt(inssPat)}</span>
            </div>
            <div class="d-flex justify-content-between small text-secondary mb-1">
                <span>Aporte INATEC (2%):</span>
                <span class="text-warning fw-medium">${fmt(inatec)}</span>
            </div>
            <div class="d-flex justify-content-between small pt-1 border-top border-warning border-opacity-25 mt-1 fw-bold">
                <span class="text-white">Costo Total Empresa:</span>
                <span class="text-warning">${fmt(costoTotalEmpresa)}</span>
            </div>
        </div>

        <!-- ACCIONES RÁPIDAS -->
        <div class="d-grid gap-2">
            <button type="button" class="btn btn-outline-info text-white btn-sm fw-bold rounded-pill py-2 d-flex align-items-center justify-content-center gap-2 shadow-sm" onclick="abrirBoletaPagoPlanilla(${item.IdPlanilla})">
                <i class="bi bi-printer text-neon-green fs-5"></i>
                <span>Ver / Imprimir Boleta Oficial</span>
            </button>
            ${!esPagada ? `
            <button type="button" class="btn btn-success text-white btn-sm fw-bold rounded-pill py-2 d-flex align-items-center justify-content-center gap-2 shadow-sm" onclick="marcarPlanillaPagadaIndividual(${item.IdPlanilla})">
                <i class="bi bi-check2-circle fs-5"></i>
                <span>Pagar este Trabajador Ahora</span>
            </button>
            ` : ''}
        </div>
    `;
}

async function marcarPlanillaPagadaIndividual(idPlanilla) {
    if (!confirm(`¿Desea marcar como PAGADA la planilla #PL-${idPlanilla}?`)) return;

    try {
        const res = await fetch(`/api/recursosHumanos/planilla/marcar-pagada/${idPlanilla}`, { method: 'PUT' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error actualizando registro');

        alert('✅ Registro de planilla marcado como PAGADO exitosamente.');
        await cargarPlanilla();
        seleccionarTrabajadorPlanilla(idPlanilla);
    } catch (err) {
        alert('Error: ' + err.message);
    }
}

function abrirBoletaPagoPlanilla(idPlanilla) {
    const item = (planillaData || []).find(p => p.IdPlanilla == idPlanilla);
    if (!item) return;

    const printArea = document.getElementById('boletaPagoPrintArea');
    if (!printArea) return;

    const fmt = (v) => 'C$ ' + Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const fmtUSD = (crd) => '$ ' + (Number(crd || 0) / 36.6243).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' USD';
    const nombreCompleto = (item.NombreEmpleado || '') + ' ' + (item.ApellidoEmpleado || '');
    const cantHoras = parseInt(item.HorasExtra, 10) || 0;
    const montoHE = parseFloat(item.MontoHorasExtra || 0);
    const salBase = parseFloat(item.SalarioBase) || 0;
    const valorHE = parseFloat(item.ValorHoraExtra || (cantHoras > 0 ? (montoHE / cantHoras) : (salBase / 240 * 1.5)));
    const salBruto = parseFloat(item.SalarioBruto || item.TotalIngresos) || 0;
    const inssLab = parseFloat(item.INSS) || 0;
    const irSal = parseFloat(item.IR) || 0;
    const otrasDed = parseFloat(item.OtrasDeducciones) || 0;
    const totDed = parseFloat(item.TotalDeducciones) || (inssLab + irSal + otrasDed);
    const salNeto = parseFloat(item.SalarioNeto || item.TotalAPagar) || (salBruto - totDed);
    const inssPat = parseFloat(item.INSSPatronal) || (salBruto * 0.225);
    const inatec = Math.round(salBruto * 0.02 * 100) / 100;

    printArea.innerHTML = `
        <div class="p-3 bg-dark text-white rounded-3 border border-secondary border-opacity-25" style="background-color: #0d1117;">
            <!-- MEMBRETE EMPRESARIAL -->
            <div class="d-flex justify-content-between align-items-center border-bottom border-secondary border-opacity-50 pb-3 mb-3">
                <div class="d-flex align-items-center gap-3">
                    <div class="rounded-3 d-flex align-items-center justify-content-center text-dark fw-bold fs-4" style="width: 48px; height: 48px; background: var(--neon-green);">
                        AMI
                    </div>
                    <div>
                        <h5 class="fw-bold mb-0 text-white">AUTOS AMI S.A.</h5>
                        <div class="small text-secondary">RUC: J0310000123456 • Distribuidora Automotriz de Nicaragua</div>
                        <div class="small text-muted">Km 4.5 Carretera a Masaya, Managua • Tel: +505 2278-9000</div>
                    </div>
                </div>
                <div class="text-end">
                    <span class="badge bg-success text-white px-3 py-2 fw-bold text-uppercase fs-6">COMPROBANTE DE PAGO</span>
                    <div class="small text-secondary font-monospace mt-1">Nº Planilla: #PL-${item.IdPlanilla}</div>
                    <div class="small text-info">Fecha Pago: ${item.FechaPago || new Date().toISOString().slice(0, 10)}</div>
                </div>
            </div>

            <!-- DATOS DEL COLABORADOR -->
            <div class="row g-2 p-2 rounded-2 mb-3 bg-light-print" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);">
                <div class="col-md-6">
                    <div class="small text-muted">COLABORADOR:</div>
                    <div class="fw-bold text-white fs-6">${nombreCompleto}</div>
                    <div class="small text-secondary">Cód: <span class="text-white">${item.CodigoEmpleado || 'N/A'}</span> | Cédula: <span class="text-white">${item.Cedula || '001-000000-0000X'}</span></div>
                </div>
                <div class="col-md-3">
                    <div class="small text-muted">CARGO & DEPTO:</div>
                    <div class="fw-medium text-white">${item.NombreCargo || 'N/A'}</div>
                    <div class="small text-secondary">${item.NombreDepartamento || 'N/A'}</div>
                </div>
                <div class="col-md-3 text-md-end">
                    <div class="small text-muted">PERÍODO LIQUIDADO:</div>
                    <div class="fw-medium text-white">${item.FechaInicioPeriodo} al ${item.FechaFinPeriodo}</div>
                    <div class="small text-info">${item.DiasTrabajados || 30} Días de Labor</div>
                </div>
            </div>

            <!-- TABLA COMPARATIVA: INGRESOS VS DEDUCCIONES -->
            <div class="row g-3 mb-3">
                <!-- Columna Ingresos -->
                <div class="col-md-6">
                    <div class="p-2 rounded-2" style="background: rgba(56, 189, 248, 0.05); border: 1px solid rgba(56, 189, 248, 0.2);">
                        <div class="fw-bold text-info border-bottom border-info border-opacity-25 pb-1 mb-2 text-uppercase small">
                            <i class="bi bi-plus-circle me-1"></i> Haberes / Ingresos Devengados
                        </div>
                        <table class="table table-sm table-borderless text-white mb-0 small">
                            <tbody>
                                <tr>
                                    <td>Salario Base Período:</td>
                                    <td class="text-end fw-medium">${fmt(salBase)}</td>
                                </tr>
                                ${cantHoras > 0 ? `
                                <tr>
                                    <td>Horas Extras (${cantHoras} hrs @ ${fmt(valorHE)}):</td>
                                    <td class="text-end fw-medium">${fmt(montoHE)}</td>
                                </tr>` : ''}
                                ${parseFloat(item.Bonificaciones) > 0 ? `
                                <tr>
                                    <td>Bonificaciones:</td>
                                    <td class="text-end fw-medium">${fmt(item.Bonificaciones)}</td>
                                </tr>` : ''}
                                ${parseFloat(item.Comisiones) > 0 ? `
                                <tr>
                                    <td>Comisiones por Ventas:</td>
                                    <td class="text-end fw-medium">${fmt(item.Comisiones)}</td>
                                </tr>` : ''}
                                ${parseFloat(item.OtrosIngresos) > 0 ? `
                                <tr>
                                    <td>Otros Ingresos:</td>
                                    <td class="text-end fw-medium">${fmt(item.OtrosIngresos)}</td>
                                </tr>` : ''}
                            </tbody>
                            <tfoot class="border-top border-info border-opacity-25 fw-bold">
                                <tr>
                                    <td class="text-info">TOTAL INGRESOS (BRUTO):</td>
                                    <td class="text-end text-info fs-6">${fmt(salBruto)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>

                <!-- Columna Deducciones -->
                <div class="col-md-6">
                    <div class="p-2 rounded-2" style="background: rgba(239, 68, 68, 0.05); border: 1px solid rgba(239, 68, 68, 0.2);">
                        <div class="fw-bold text-danger border-bottom border-danger border-opacity-25 pb-1 mb-2 text-uppercase small">
                            <i class="bi bi-dash-circle me-1"></i> Deducciones Legales (Nicaragua)
                        </div>
                        <table class="table table-sm table-borderless text-white mb-0 small">
                            <tbody>
                                <tr>
                                    <td>INSS Laboral (7%):</td>
                                    <td class="text-end text-danger fw-medium">-${fmt(inssLab)}</td>
                                </tr>
                                <tr>
                                    <td>Retención IR Salarial (Ley 822):</td>
                                    <td class="text-end text-danger fw-medium">-${fmt(irSal)}</td>
                                </tr>
                                ${otrasDed > 0 ? `
                                <tr>
                                    <td>Otras Deducciones / Préstamos:</td>
                                    <td class="text-end text-secondary fw-medium">-${fmt(otrasDed)}</td>
                                </tr>` : ''}
                            </tbody>
                            <tfoot class="border-top border-danger border-opacity-25 fw-bold">
                                <tr>
                                    <td class="text-danger">TOTAL DEDUCCIONES:</td>
                                    <td class="text-end text-danger fs-6">-${fmt(totDed)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            </div>

            <!-- TOTAL NETO A PAGAR -->
            <div class="p-3 rounded-3 mb-3 d-flex justify-content-between align-items-center" style="background: linear-gradient(135deg, rgba(16,185,129,0.2) 0%, rgba(219,255,153,0.15) 100%); border: 1px solid rgba(16,185,129,0.4);">
                <div>
                    <span class="small text-white text-uppercase fw-bold d-block">SALARIO NETO A PERCIBIR (LÍQUIDO A PAGAR)</span>
                    <span class="small text-secondary">Tasa de cambio oficial BCN C$ 36.6243 = <strong class="text-white">${fmtUSD(salNeto)}</strong></span>
                </div>
                <div class="text-end">
                    <span class="fs-3 fw-bold text-neon-green" style="text-shadow: 0 0 10px rgba(219,255,153,0.4);">${fmt(salNeto)}</span>
                </div>
            </div>

            <!-- APORTES PATRONALES INFORMATIVOS -->
            <div class="p-2 rounded-2 mb-4 small" style="background: rgba(245, 158, 11, 0.05); border: 1px dashed rgba(245, 158, 11, 0.25);">
                <div class="d-flex justify-content-between text-secondary">
                    <span>Aportes Patronales Empresa: INSS Patronal (22.5%): <strong>${fmt(inssPat)}</strong> | INATEC (2%): <strong>${fmt(inatec)}</strong></span>
                    <span class="text-warning fw-bold">Costo Total Empleador: ${fmt(salBruto + inssPat + inatec)}</span>
                </div>
            </div>

            <!-- ESPACIO DE FIRMAS -->
            <div class="row pt-4 mt-2 text-center text-secondary small">
                <div class="col-6">
                    <div class="border-top border-secondary border-opacity-50 pt-2 mx-4">
                        <div class="fw-bold text-white">AUTOS AMI S.A.</div>
                        <div class="text-muted" style="font-size: 0.75rem;">Firma y Sello Recursos Humanos</div>
                    </div>
                </div>
                <div class="col-6">
                    <div class="border-top border-secondary border-opacity-50 pt-2 mx-4">
                        <div class="fw-bold text-white">${nombreCompleto}</div>
                        <div class="text-muted" style="font-size: 0.75rem;">Firma Colaborador (Recibí Conforme)</div>
                    </div>
                </div>
            </div>
        </div>
    `;

    const modalEl = document.getElementById('modalBoletaPagoPlanilla');
    if (modalEl) {
        document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
        document.body.classList.remove('modal-open');
        try {
            const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
            modal.show();
        } catch (_) {
            modalEl.classList.add('show');
            modalEl.style.display = 'block';
        }
    }
}

// ASIGNACIÓN EXPLÍCITA AL OBJETO WINDOW (GLOBAL EN NAVEGADOR)
window.abrirModalPagarPlanilla = abrirModalPagarPlanilla;
window.ejecutarPagoPlanillaCompleta = ejecutarPagoPlanillaCompleta;
window.abrirModalGenerarPlanilla = abrirModalGenerarPlanilla;
window.seleccionarTrabajadorPlanilla = seleccionarTrabajadorPlanilla;
window.renderizarDetalleEmpleadoPlanilla = renderizarDetalleEmpleadoPlanilla;
window.renderizarDetalleEmpleadoPlanillaVacio = renderizarDetalleEmpleadoPlanillaVacio;
window.marcarPlanillaPagadaIndividual = marcarPlanillaPagadaIndividual;
window.abrirBoletaPagoPlanilla = abrirBoletaPagoPlanilla;
window.filtrarPlanilla = filtrarPlanilla;
window.cargarPlanilla = cargarPlanilla;
