// ==========================================================================
// AMI - Módulo de Reportes y Análisis Ejecutivo (reportes.js)
// Filtros reactivos, KPIs dinámicos, Gráficos Chart.js, Exportación y Guardado de Informes (Snapshots y PNGs)
// ==========================================================================

let dashboardData = null;
let currentDetailData = [];
let chartMarcasInstance = null;
let chartClientesInstance = null;
let chartCostosInstance = null;
let chartVentasMesInstance = null;
let chartInventarioInstance = null;

let selectedRango = 'Todos';
let selectedTipo = 'Todos';
let modoInformeGuardado = null; // null cuando estamos en vivo

const THEME_COLORS = [
    '#DBFF99', // Verde Neón
    '#FFD4F8', // Rosa Neón
    '#A855F7', // Púrpura Neón
    '#38BDF8', // Celeste Neón
    '#FACC15', // Amarillo Neón
    '#FB7185', // Coral Neón
    '#4ADE80', // Esmeralda
    '#94A3B8'  // Gris Slate
];

const STORAGE_KEY_INFORMES = 'ami_reportes_guardados';

document.addEventListener("DOMContentLoaded", () => {
    // 1. Inicializar selectores de filtros en cabecera
    inicializarFiltros();

    // 2. Cargar Dashboard inicial con datos completos
    cargarDashboard();

    // 3. Inicializar contador de informes guardados
    actualizarBadgeGuardados();

    // 4. Listeners para Guardar Informe (Snapshot)
    const btnAbrirGuardar = document.getElementById('btnGuardarSnapshot');
    if (btnAbrirGuardar) {
        btnAbrirGuardar.addEventListener('click', prepararModalGuardarInforme);
    }

    const btnConfirmarGuardar = document.getElementById('btnConfirmarGuardarInforme');
    if (btnConfirmarGuardar) {
        btnConfirmarGuardar.addEventListener('click', ejecutarGuardadoInforme);
    }

    // 5. Listener para Ver Historial de Informes Guardados
    const btnVerGuardados = document.getElementById('btnVerGuardados');
    if (btnVerGuardados) {
        btnVerGuardados.addEventListener('click', abrirModalInformesGuardados);
    }

    // 6. Listener para botón "Generar reporte" (Modal detallado)
    const btnGen = document.getElementById('btnGenerarReporte');
    if (btnGen) {
        btnGen.addEventListener('click', () => {
            abrirModalReporte();
        });
    }

    // 7. Buscadores de tablas
    const searchDash = document.getElementById('buscador-tabla-dashboard');
    if (searchDash) {
        searchDash.addEventListener('input', () => {
            renderizarTablaDashboard();
        });
    }

    const searchReport = document.getElementById('input-busqueda-reporte');
    if (searchReport) {
        searchReport.addEventListener('input', () => {
            renderizarTablaReporteModal();
        });
    }

    // 8. Botones de exportación a CSV/Excel
    const btnExportDirect = document.getElementById('btnExportarDirectoCSV');
    if (btnExportDirect) {
        btnExportDirect.addEventListener('click', exportarReporteCSV);
    }

    const btnExportModal = document.getElementById('btnExportarReporteCSV');
    if (btnExportModal) {
        btnExportModal.addEventListener('click', exportarReporteCSV);
    }

    // 9. Botón de imprimir
    const btnPrint = document.getElementById('btnImprimirReporte');
    if (btnPrint) {
        btnPrint.addEventListener('click', () => {
            window.print();
        });
    }

    // 10. Listeners para descarga individual de gráficas PNG
    document.querySelectorAll('.btn-descargar-chart').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const chartId = this.dataset.chart;
            const chartName = this.dataset.name || 'Grafica';
            descargarGraficaComoImagen(chartId, chartName);
        });
    });
});

// --------------------------------------------------------------------------
// INICIALIZACIÓN DE FILTROS DEL HEADER
// --------------------------------------------------------------------------
function inicializarFiltros() {
    const opcionesRango = document.querySelectorAll('.opcion-rango');
    const rangoLabel = document.getElementById('rangoSeleccionado');

    opcionesRango.forEach(opcion => {
        opcion.addEventListener('click', function (e) {
            e.preventDefault();
            if (modoInformeGuardado) salirDeModoGuardado();
            const valor = this.dataset.value || this.innerText.trim();
            selectedRango = valor;
            if (rangoLabel) rangoLabel.textContent = valor;
            actualizarPillFiltroActivo();
            cargarDashboard();
        });
    });

    const opcionesTipo = document.querySelectorAll('.opcion-tipo');
    const tipoLabel = document.getElementById('tipoSeleccionado');

    opcionesTipo.forEach(opcion => {
        opcion.addEventListener('click', function (e) {
            e.preventDefault();
            if (modoInformeGuardado) salirDeModoGuardado();
            const valor = this.dataset.value || this.innerText.trim();
            selectedTipo = valor;
            if (tipoLabel) tipoLabel.textContent = valor;
            actualizarPillFiltroActivo();
            cargarDashboard();
        });
    });
}

function actualizarPillFiltroActivo() {
    const pill = document.getElementById('badgeFiltroActivo');
    if (pill) {
        pill.innerHTML = `<i class="bi bi-funnel-fill text-dark me-1"></i> Filtro: <strong>${selectedTipo}</strong> &bull; <span>${selectedRango}</span>`;
    }
}

// --------------------------------------------------------------------------
// CARGAR DATOS DEL DASHBOARD EN VIVO
// --------------------------------------------------------------------------
async function cargarDashboard() {
    try {
        mostrarIndicadorCarga(true);

        const urlDash = `/api/reportes/dashboard?rango=${encodeURIComponent(selectedRango)}&tipo=${encodeURIComponent(selectedTipo)}`;
        const urlData = `/api/reportes/data?rango=${encodeURIComponent(selectedRango)}&tipo=${encodeURIComponent(selectedTipo)}`;

        const [resDash, resData] = await Promise.all([
            fetch(urlDash).then(r => r.json()),
            fetch(urlData).then(r => r.json())
        ]);

        dashboardData = resDash;
        currentDetailData = resData.registros || [];

        // 1. Renderizar KPIs
        renderizarKPIs(dashboardData.kpis, selectedTipo);

        // 2. Gráfico de Marcas (Fila 2 - Card 1)
        renderizarGraficoMarcas(dashboardData.autosPorMarca);

        // 3. Campañas de Marketing (Fila 2 - Card 2)
        renderizarCampanias(dashboardData.campanias);

        // 4. Clientes por Canal (Fila 2 - Card 3)
        renderizarGraficoClientes(dashboardData.clientesPorOrigen);

        // 5. Rotación de Inventario (Fila 3 - Card 1)
        renderizarGraficoInventario(dashboardData.autosPorMarca);

        // 6. Costos por Categoría (Fila 3 - Card 2)
        renderizarGraficoCostos(dashboardData.costosPorCategoria);

        // 7. Ventas por Mes (Fila 3 - Card 3)
        renderizarGraficoVentasMes(dashboardData.ventasPorMes);

        // 8. Resumen General (Fila 4)
        renderizarResumenGeneral(dashboardData.kpis);

        // 9. Tabla detallada interactiva
        renderizarTablaDashboard();

    } catch (err) {
        console.error('Error al actualizar dashboard:', err);
    } finally {
        mostrarIndicadorCarga(false);
    }
}

function mostrarIndicadorCarga(cargando) {
    const pill = document.getElementById('badgeFiltroActivo');
    if (pill && cargando) {
        pill.classList.add('opacity-75');
    } else if (pill) {
        pill.classList.remove('opacity-75');
    }
}

// --------------------------------------------------------------------------
// 1. RENDERIZAR KPIs DINÁMICOS
// --------------------------------------------------------------------------
function renderizarKPIs(kpis, tipo) {
    if (!kpis) return;

    const fmtMoney = (val) => '$' + Number(val || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    const tipoLower = (tipo || 'todos').toLowerCase();

    const tBox1 = document.getElementById('kpi-title-1');
    const vBox1 = document.getElementById('kpi-stock-disponible');
    const sBox1 = document.getElementById('kpi-valor-inventario');

    const tBox2 = document.getElementById('kpi-title-2');
    const vBox2 = document.getElementById('kpi-total-ventas');
    const sBox2 = document.getElementById('kpi-count-ventas');

    const tBox3 = document.getElementById('kpi-title-3');
    const vBox3 = document.getElementById('kpi-total-compras');
    const sBox3 = document.getElementById('kpi-count-compras');

    const tBox4 = document.getElementById('kpi-title-4');
    const vBox4 = document.getElementById('kpi-total-costos');
    const sBox4 = document.getElementById('kpi-ganancia-neta');

    if (tipoLower === 'ventas') {
        if (tBox1) tBox1.innerText = 'Autos Vendidos';
        if (vBox1) vBox1.innerText = `${kpis.countVentas || 0} Unidades`;
        if (sBox1) sBox1.innerText = `En el período: ${selectedRango}`;

        if (tBox2) tBox2.innerText = 'Total Facturado';
        if (vBox2) vBox2.innerText = fmtMoney(kpis.totalVentas);
        if (sBox2) sBox2.innerText = `${kpis.countVentas || 0} Ventas registradas`;

        const ticketProm = (Number(kpis.countVentas) || 0) > 0 ? (Number(kpis.totalVentas) / Number(kpis.countVentas)) : 0;
        if (tBox3) tBox3.innerText = 'Ticket Promedio';
        if (vBox3) vBox3.innerText = fmtMoney(ticketProm);
        if (sBox3) sBox3.innerText = 'Por venta cerrada';

        if (tBox4) tBox4.innerText = 'Margen Operativo';
        if (vBox4) vBox4.innerText = fmtMoney(kpis.gananciaNeta);
        if (sBox4) {
            sBox4.innerText = `Utilidad neta: ${kpis.gananciaNeta >= 0 ? '+' : ''}${fmtMoney(kpis.gananciaNeta)}`;
            sBox4.style.color = kpis.gananciaNeta >= 0 ? '#0B1009' : '#DC2626';
        }
    } else if (tipoLower === 'inventario') {
        if (tBox1) tBox1.innerText = 'Stock Disponible';
        if (vBox1) vBox1.innerText = `${kpis.stockDisponible || 0} Autos`;
        if (sBox1) sBox1.innerText = 'Listos para la venta';

        if (tBox2) tBox2.innerText = 'Valor de Inventario';
        if (vBox2) vBox2.innerText = fmtMoney(kpis.valorInventario);
        if (sBox2) sBox2.innerText = 'Capital activo';

        if (tBox3) tBox3.innerText = 'Adquisiciones';
        if (vBox3) vBox3.innerText = fmtMoney(kpis.totalCompras);
        if (sBox3) sBox3.innerText = `${kpis.countCompras || 0} Compras registradas`;

        if (tBox4) tBox4.innerText = 'Autos Vendidos';
        if (vBox4) vBox4.innerText = `${kpis.countVentas || 0} Autos`;
        if (sBox4) {
            sBox4.innerText = `Total generado: ${fmtMoney(kpis.totalVentas)}`;
            sBox4.style.color = '#0B1009';
        }
    } else if (tipoLower === 'costos') {
        if (tBox1) tBox1.innerText = 'Total Gastos';
        if (vBox1) vBox1.innerText = fmtMoney(kpis.totalCostos);
        if (sBox1) sBox1.innerText = `${kpis.countCostos || 0} Registros en ${selectedRango}`;

        const costoProm = (Number(kpis.countCostos) || 0) > 0 ? (Number(kpis.totalCostos) / Number(kpis.countCostos)) : 0;
        if (tBox2) tBox2.innerText = 'Gasto Promedio';
        if (vBox2) vBox2.innerText = fmtMoney(costoProm);
        if (sBox2) sBox2.innerText = 'Por concepto de costo';

        if (tBox3) tBox3.innerText = 'Inversión Compras';
        if (vBox3) vBox3.innerText = fmtMoney(kpis.totalCompras);
        if (sBox3) sBox3.innerText = `${kpis.countCompras || 0} Compras`;

        if (tBox4) tBox4.innerText = 'Balance Neto';
        if (vBox4) vBox4.innerText = fmtMoney(kpis.gananciaNeta);
        if (sBox4) {
            sBox4.innerText = `Margen: ${kpis.gananciaNeta >= 0 ? '+' : ''}${fmtMoney(kpis.gananciaNeta)}`;
            sBox4.style.color = kpis.gananciaNeta >= 0 ? '#0B1009' : '#DC2626';
        }
    } else if (tipoLower === 'clientes') {
        if (tBox1) tBox1.innerText = 'Clientes Registrados';
        if (vBox1) vBox1.innerText = `${kpis.totalClientes || 0} Clientes`;
        if (sBox1) sBox1.innerText = `En el período: ${selectedRango}`;

        if (tBox2) tBox2.innerText = 'Ventas a Clientes';
        if (vBox2) vBox2.innerText = `${kpis.countVentas || 0} Ventas`;
        if (sBox2) sBox2.innerText = `Ingresos: ${fmtMoney(kpis.totalVentas)}`;

        if (tBox3) tBox3.innerText = 'Campañas Activas';
        if (vBox3) vBox3.innerText = `${kpis.totalCampanias || 0} Campañas`;
        if (sBox3) sBox3.innerText = 'Generando prospectos';

        if (tBox4) tBox4.innerText = 'Ingreso Promedio';
        const promCli = (Number(kpis.totalClientes) || 0) > 0 ? (Number(kpis.totalVentas) / Number(kpis.totalClientes)) : 0;
        if (vBox4) vBox4.innerText = fmtMoney(promCli);
        if (sBox4) {
            sBox4.innerText = 'Por cliente registrado';
            sBox4.style.color = '#0B1009';
        }
    } else if (tipoLower === 'marketing') {
        if (tBox1) tBox1.innerText = 'Campañas Registradas';
        if (vBox1) vBox1.innerText = `${kpis.totalCampanias || 0} Campañas`;
        if (sBox1) sBox1.innerText = 'Difusión comercial';

        if (tBox2) tBox2.innerText = 'Clientes Captados';
        if (vBox2) vBox2.innerText = `${kpis.totalClientes || 0} Clientes`;
        if (sBox2) sBox2.innerText = 'Vía canales digitales';

        if (tBox3) tBox3.innerText = 'Ventas Concretadas';
        if (vBox3) vBox3.innerText = `${kpis.countVentas || 0} Ventas`;
        if (sBox3) sBox3.innerText = fmtMoney(kpis.totalVentas);

        if (tBox4) tBox4.innerText = 'Retorno Comercial';
        if (vBox4) vBox4.innerText = fmtMoney(kpis.gananciaNeta);
        if (sBox4) {
            sBox4.innerText = 'Margen neto generado';
            sBox4.style.color = '#0B1009';
        }
    } else {
        if (tBox1) tBox1.innerText = 'Inventario Disponible';
        if (vBox1) vBox1.innerText = `${kpis.stockDisponible || 0} Autos`;
        if (sBox1) sBox1.innerText = `Valor: ${fmtMoney(kpis.valorInventario)}`;

        if (tBox2) tBox2.innerText = 'Ingresos por Ventas';
        if (vBox2) vBox2.innerText = fmtMoney(kpis.totalVentas);
        if (sBox2) sBox2.innerText = `${kpis.countVentas || 0} Ventas realizadas (${selectedRango})`;

        if (tBox3) tBox3.innerText = 'Inversión en Compras';
        if (vBox3) vBox3.innerText = fmtMoney(kpis.totalCompras);
        if (sBox3) sBox3.innerText = `${kpis.countCompras || 0} Adquisiciones (${selectedRango})`;

        if (tBox4) tBox4.innerText = 'Costos Operativos';
        if (vBox4) vBox4.innerText = fmtMoney(kpis.totalCostos);
        if (sBox4) {
            const util = kpis.gananciaNeta || 0;
            sBox4.innerText = `Margen: ${util >= 0 ? '+' : ''}${fmtMoney(util)}`;
            sBox4.style.color = util >= 0 ? '#0B1009' : '#DC2626';
        }
    }
}

// --------------------------------------------------------------------------
// 2. GRÁFICOS INTERACTIVOS (CHART.JS)
// --------------------------------------------------------------------------
function renderizarGraficoMarcas(marcas) {
    const canvas = document.getElementById('chartMarcas');
    const legendContainer = document.getElementById('legendMarcas');
    if (!canvas || !marcas) return;

    if (marcas.length === 0) {
        if (legendContainer) legendContainer.innerHTML = '<div class="text-muted small py-2">Sin registros en este rango</div>';
        return;
    }

    const labels = marcas.map(m => m.marca);
    const dataVals = marcas.map(m => m.totalVendidos);
    const colors = THEME_COLORS.slice(0, marcas.length);

    if (chartMarcasInstance) chartMarcasInstance.destroy();

    if (window.Chart) {
        chartMarcasInstance = new Chart(canvas, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: dataVals,
                    backgroundColor: colors,
                    borderColor: '#0F1019',
                    borderWidth: 2,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: { display: false }
                }
            }
        });
    }

    if (legendContainer) {
        legendContainer.innerHTML = '';
        marcas.forEach((m, idx) => {
            const item = document.createElement('div');
            item.className = 'legend-item d-flex align-items-center justify-content-between mb-1';
            item.innerHTML = `
                <div class="d-flex align-items-center gap-2">
                    <div class="legend-dot" style="background: ${colors[idx % colors.length]}; width: 8px; height: 8px; border-radius: 50%;"></div>
                    <span class="small text-secondary" style="font-size: 0.78rem;">${m.marca}</span>
                </div>
                <span class="small fw-bold text-white" style="font-size: 0.78rem;">${m.totalVendidos}</span>
            `;
            legendContainer.appendChild(item);
        });
    }
}

function renderizarCampanias(campanias) {
    const container = document.getElementById('containerCampanias');
    if (!container || !campanias) return;

    container.innerHTML = '';
    if (campanias.length === 0) {
        container.innerHTML = '<div class="text-muted small py-2">Sin campañas en este período</div>';
        return;
    }

    const maxPresupuesto = Math.max(...campanias.map(c => Number(c.presupuesto) || 0), 1000);

    campanias.slice(0, 5).forEach((c, idx) => {
        const pres = Number(c.presupuesto) || 0;
        const pct = Math.min(Math.round((pres / maxPresupuesto) * 100), 100);
        const color = THEME_COLORS[idx % THEME_COLORS.length];

        const row = document.createElement('div');
        row.className = 'mb-2';
        row.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-1">
                <span class="small text-truncate text-secondary" style="max-width: 160px; font-size: 0.75rem;" title="${c.nombre}">${c.nombre}</span>
                <span class="small text-white fw-bold" style="font-size: 0.75rem;">$${pres.toLocaleString()}</span>
            </div>
            <div class="progress" style="height: 6px; background-color: rgba(255,255,255,0.06); border-radius: 4px;">
                <div class="progress-bar" style="width: ${pct}%; background-color: ${color}; border-radius: 4px;"></div>
            </div>
        `;
        container.appendChild(row);
    });
}

function renderizarGraficoClientes(canales) {
    const canvas = document.getElementById('chartClientes');
    const legendContainer = document.getElementById('legendClientes');
    if (!canvas || !canales) return;

    if (canales.length === 0) {
        if (legendContainer) legendContainer.innerHTML = '<div class="text-muted small py-2">Sin registros en este rango</div>';
        return;
    }

    const labels = canales.map(c => c.canal);
    const dataVals = canales.map(c => c.totalClientes);
    const colors = THEME_COLORS.slice(0, canales.length);

    if (chartClientesInstance) chartClientesInstance.destroy();

    if (window.Chart) {
        chartClientesInstance = new Chart(canvas, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: dataVals,
                    backgroundColor: colors,
                    borderColor: '#0F1019',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: { display: false }
                }
            }
        });
    }

    if (legendContainer) {
        legendContainer.innerHTML = '';
        canales.forEach((c, idx) => {
            const item = document.createElement('div');
            item.className = 'legend-item d-flex align-items-center justify-content-between mb-1';
            item.innerHTML = `
                <div class="d-flex align-items-center gap-2">
                    <div class="legend-dot" style="background: ${colors[idx % colors.length]}; width: 8px; height: 8px; border-radius: 50%;"></div>
                    <span class="small text-secondary" style="font-size: 0.78rem;">${c.canal}</span>
                </div>
                <span class="small fw-bold text-white" style="font-size: 0.78rem;">${c.totalClientes}</span>
            `;
            legendContainer.appendChild(item);
        });
    }
}

function renderizarGraficoInventario(marcas) {
    const canvas = document.getElementById('chartInventario');
    if (!canvas || !marcas || marcas.length === 0) return;

    const labels = marcas.map(m => m.marca);
    const dataVals = marcas.map(m => m.totalVendidos);

    if (chartInventarioInstance) chartInventarioInstance.destroy();

    if (window.Chart) {
        chartInventarioInstance = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Unidades',
                    data: dataVals,
                    backgroundColor: '#DBFF99',
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        ticks: { color: '#A1A1AA', font: { size: 10 } },
                        grid: { display: false }
                    },
                    y: {
                        ticks: { color: '#A1A1AA', font: { size: 10 }, stepSize: 1 },
                        grid: { color: 'rgba(255,255,255,0.05)' }
                    }
                },
                plugins: {
                    legend: { display: false }
                }
            }
        });
    }
}

function renderizarGraficoCostos(costos) {
    const canvas = document.getElementById('chartCostos');
    const legendContainer = document.getElementById('legendCostos');
    if (!canvas || !costos) return;

    if (costos.length === 0) {
        if (legendContainer) legendContainer.innerHTML = '<div class="text-muted small py-2">Sin costos en este período</div>';
        return;
    }

    const labels = costos.map(c => c.categoria);
    const dataVals = costos.map(c => c.totalMonto);
    const colors = THEME_COLORS.slice(0, costos.length);

    if (chartCostosInstance) chartCostosInstance.destroy();

    if (window.Chart) {
        chartCostosInstance = new Chart(canvas, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: dataVals,
                    backgroundColor: colors,
                    borderColor: '#0F1019',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: { display: false }
                }
            }
        });
    }

    if (legendContainer) {
        legendContainer.innerHTML = '';
        costos.forEach((c, idx) => {
            const item = document.createElement('div');
            item.className = 'legend-item d-flex align-items-center justify-content-between mb-1';
            item.innerHTML = `
                <div class="d-flex align-items-center gap-2">
                    <div class="legend-dot" style="background: ${colors[idx % colors.length]}; width: 8px; height: 8px; border-radius: 50%;"></div>
                    <span class="small text-secondary" style="font-size: 0.78rem;">${c.categoria}</span>
                </div>
                <span class="small fw-bold text-white" style="font-size: 0.78rem;">$${Number(c.totalMonto).toLocaleString()}</span>
            `;
            legendContainer.appendChild(item);
        });
    }
}

function renderizarGraficoVentasMes(ventasMes) {
    const canvas = document.getElementById('chartVentasMes');
    if (!canvas || !ventasMes || ventasMes.length === 0) return;

    const labels = ventasMes.map(v => v.periodo);
    const dataVals = ventasMes.map(v => v.totalIngresos);

    if (chartVentasMesInstance) chartVentasMesInstance.destroy();

    if (window.Chart) {
        chartVentasMesInstance = new Chart(canvas, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Ingresos Mensuales',
                    data: dataVals,
                    borderColor: '#FFD4F8',
                    backgroundColor: 'rgba(255, 212, 248, 0.15)',
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#DBFF99',
                    pointBorderColor: '#0F1019',
                    pointRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        ticks: { color: '#A1A1AA', font: { size: 10 } },
                        grid: { display: false }
                    },
                    y: {
                        ticks: {
                            color: '#A1A1AA',
                            font: { size: 10 },
                            callback: (v) => '$' + Number(v / 1000).toFixed(0) + 'k'
                        },
                        grid: { color: 'rgba(255,255,255,0.05)' }
                    }
                },
                plugins: {
                    legend: { display: false }
                }
            }
        });
    }
}

function renderizarResumenGeneral(kpis) {
    if (!kpis) return;

    const elAutos = document.getElementById('resumen-total-autos');
    if (elAutos) elAutos.innerText = `${kpis.stockDisponible || 0} Disponibles`;

    const elCli = document.getElementById('resumen-total-clientes');
    if (elCli) elCli.innerText = `${kpis.totalClientes || 0} Registrados`;

    const elMkt = document.getElementById('resumen-total-campanias');
    if (elMkt) elMkt.innerText = `${kpis.totalCampanias || 0} Campañas`;

    const elGan = document.getElementById('resumen-total-ganancia');
    if (elGan) {
        const util = kpis.gananciaNeta || 0;
        elGan.innerText = `$${Number(util).toLocaleString()}`;
        elGan.style.color = util >= 0 ? '#DBFF99' : '#FB7185';
    }

    const totalIngresos = Number(kpis.totalVentas) || 1;
    const ganancia = Number(kpis.gananciaNeta) || 0;
    const margenPct = Math.round((ganancia / totalIngresos) * 100);

    const elMargenPct = document.getElementById('resumen-margen-pct');
    if (elMargenPct) {
        elMargenPct.innerText = `${margenPct}%`;
    }

    const barIngresos = document.getElementById('bar-financiero-ingresos');
    if (barIngresos) barIngresos.style.height = '100%';

    const barCostos = document.getElementById('bar-financiero-costos');
    if (barCostos) {
        const egresos = (Number(kpis.totalCompras) || 0) + (Number(kpis.totalCostos) || 0);
        const egresosPct = Math.min(Math.round((egresos / totalIngresos) * 100), 100);
        barCostos.style.height = `${egresosPct}%`;
    }
}

// --------------------------------------------------------------------------
// 3. TABLA DE DETALLE EN EL DASHBOARD
// --------------------------------------------------------------------------
function renderizarTablaDashboard() {
    const thead = document.getElementById('dashboard-table-head');
    const tbody = document.getElementById('dashboard-table-body');
    const searchInput = document.getElementById('buscador-tabla-dashboard');
    const titleEl = document.getElementById('tituloTablaDetalle');
    const term = searchInput ? searchInput.value.trim().toLowerCase() : '';

    if (titleEl) {
        titleEl.innerHTML = `<i class="bi bi-table text-neon-green me-2"></i> Desglose en Vivo: <strong>${selectedTipo}</strong> <span class="badge bg-secondary bg-opacity-50 text-white ms-2 small" style="font-size: 0.75rem;">${selectedRango}</span>`;
    }

    if (!tbody || !thead) return;
    tbody.innerHTML = '';
    thead.innerHTML = '';

    if (!currentDetailData || currentDetailData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4"><i class="bi bi-inbox fs-3 d-block mb-1"></i> No se encontraron registros de ${selectedTipo} para el período: ${selectedRango}.</td></tr>`;
        const contador = document.getElementById('contador-tabla-dashboard');
        if (contador) contador.innerText = `0 registros`;
        return;
    }

    const filtrados = currentDetailData.filter(row => {
        if (!term) return true;
        return Object.values(row).some(val =>
            String(val || '').toLowerCase().includes(term)
        );
    });

    const contador = document.getElementById('contador-tabla-dashboard');
    if (contador) {
        contador.innerText = `Mostrando ${filtrados.length} de ${currentDetailData.length} registros`;
    }

    if (filtrados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-4"><i class="bi bi-search fs-3 d-block mb-1"></i> No hay coincidencias con la búsqueda.</td></tr>';
        return;
    }

    const sample = filtrados[0];
    const keys = Object.keys(sample);

    const trHead = document.createElement('tr');
    keys.forEach(k => {
        const th = document.createElement('th');
        th.innerText = formatColumnHeader(k);
        trHead.appendChild(th);
    });
    thead.appendChild(trHead);

    filtrados.forEach(row => {
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid rgba(255,255,255,0.05)';

        keys.forEach(k => {
            const td = document.createElement('td');
            let val = row[k];

            if (k.toLowerCase().includes('fecha') && val) {
                val = new Date(val).toISOString().split('T')[0];
            } else if ((k.toLowerCase().includes('monto') || k.toLowerCase().includes('total') || k.toLowerCase().includes('precio') || k.toLowerCase().includes('presupuesto')) && typeof val === 'number') {
                val = '$' + val.toLocaleString('en-US');
                td.className = 'fw-bold text-white';
            } else if (k.toLowerCase().includes('estado')) {
                const est = String(val || '');
                let colorClass = 'badge-registrado';
                if (est.includes('Inactivo') || est.includes('Cancel') || est.includes('Finaliz')) colorClass = 'badge-pendiente';
                val = `<span class="${colorClass}">${est}</span>`;
                td.innerHTML = val;
                tr.appendChild(td);
                return;
            }

            td.innerText = val !== null && val !== undefined ? val : 'N/A';
            tr.appendChild(td);
        });

        tbody.appendChild(tr);
    });
}

// --------------------------------------------------------------------------
// 4. DESCARGA DIRECTA DE GRÁFICAS INDIVIDUALES COMO IMAGEN (PNG)
// --------------------------------------------------------------------------
function descargarGraficaComoImagen(chartId, nombreGrafica) {
    const canvas = document.getElementById(chartId);
    if (!canvas) {
        alert('No se encontró el elemento de la gráfica para descargar.');
        return;
    }

    // Crear canvas con fondo oscuro #0F1019 para nitidez
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width || 400;
    tempCanvas.height = canvas.height || 300;
    const ctx = tempCanvas.getContext('2d');

    ctx.fillStyle = '#0F1019';
    ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    ctx.drawImage(canvas, 0, 0);

    const link = document.createElement('a');
    link.download = `Grafica_${nombreGrafica}_${selectedTipo}_${new Date().toISOString().split('T')[0]}.png`;
    link.href = tempCanvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// --------------------------------------------------------------------------
// 5. GUARDAR INFORME / SNAPSHOT (KPIS, GRÁFICAS Y TABLAS)
// --------------------------------------------------------------------------
function prepararModalGuardarInforme() {
    const inputNombre = document.getElementById('input-nombre-informe');
    const inputNotas = document.getElementById('input-notas-informe');
    const spanTipo = document.getElementById('guardar-preview-tipo');
    const spanRango = document.getElementById('guardar-preview-rango');
    const spanKpis = document.getElementById('guardar-preview-kpis');

    const ahora = new Date();
    const fechaStr = ahora.toLocaleDateString('es-ES') + ' ' + ahora.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

    if (inputNombre) {
        inputNombre.value = `Informe ${selectedTipo} - ${selectedRango} (${fechaStr})`;
    }
    if (inputNotas) inputNotas.value = '';

    if (spanTipo) spanTipo.innerText = selectedTipo;
    if (spanRango) spanRango.innerText = selectedRango;
    if (spanKpis && dashboardData && dashboardData.kpis) {
        const k = dashboardData.kpis;
        spanKpis.innerText = `Ventas: $${Number(k.totalVentas || 0).toLocaleString()} | Compras: $${Number(k.totalCompras || 0).toLocaleString()} | Stock: ${k.stockDisponible || 0} autos`;
    }

    const modalEl = document.getElementById('modalGuardarInforme');
    if (modalEl && window.bootstrap) {
        bootstrap.Modal.getOrCreateInstance(modalEl).show();
    }
}

function ejecutarGuardadoInforme() {
    const inputNombre = document.getElementById('input-nombre-informe');
    const inputNotas = document.getElementById('input-notas-informe');

    const nombre = inputNombre ? inputNombre.value.trim() : `Informe ${selectedTipo}`;
    if (!nombre) {
        alert('Por favor introduce un nombre para identificar el informe guardado.');
        return;
    }

    // Capturar imágenes base64 de las gráficas
    const imagenesGraficas = {};
    const chartIds = [
        { id: 'chartMarcas', name: 'AutosVendidosPorMarca' },
        { id: 'chartClientes', name: 'ClientesPorCanal' },
        { id: 'chartInventario', name: 'RotacionInventario' },
        { id: 'chartCostos', name: 'CostosPorCategoria' },
        { id: 'chartVentasMes', name: 'VentasMensuales' }
    ];

    chartIds.forEach(c => {
        const el = document.getElementById(c.id);
        if (el) {
            try {
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = el.width || 300;
                tempCanvas.height = el.height || 200;
                const ctx = tempCanvas.getContext('2d');
                ctx.fillStyle = '#0F1019';
                ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
                ctx.drawImage(el, 0, 0);
                imagenesGraficas[c.name] = tempCanvas.toDataURL('image/png');
            } catch (err) {}
        }
    });

    const snapshot = {
        id: 'inf_' + Date.now(),
        titulo: nombre,
        notas: inputNotas ? inputNotas.value.trim() : '',
        fechaGuardado: new Date().toISOString(),
        tipo: selectedTipo,
        rango: selectedRango,
        kpis: dashboardData ? dashboardData.kpis : {},
        graficos: {
            marcas: dashboardData ? dashboardData.autosPorMarca : [],
            campanias: dashboardData ? dashboardData.campanias : [],
            clientes: dashboardData ? dashboardData.clientesPorOrigen : [],
            costos: dashboardData ? dashboardData.costosPorCategoria : [],
            ventasMes: dashboardData ? dashboardData.ventasPorMes : []
        },
        imagenes: imagenesGraficas,
        registros: currentDetailData
    };

    guardarInformeEnStorage(snapshot);

    // Cerrar modal
    const modalEl = document.getElementById('modalGuardarInforme');
    if (modalEl && window.bootstrap) {
        bootstrap.Modal.getInstance(modalEl)?.hide();
    }

    // Notificación elegante
    mostrarToast('¡Informe guardado con éxito! Puedes consultarlo o descargarlo en "Historial".');
}

function obtenerInformesGuardados() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY_INFORMES);
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        return [];
    }
}

function guardarInformeEnStorage(informe) {
    const list = obtenerInformesGuardados();
    list.unshift(informe);
    // Limitar a los 25 más recientes para optimizar almacenamiento
    if (list.length > 25) list.pop();
    localStorage.setItem(STORAGE_KEY_INFORMES, JSON.stringify(list));
    actualizarBadgeGuardados();
}

function actualizarBadgeGuardados() {
    const list = obtenerInformesGuardados();
    const badge = document.getElementById('contadorGuardadosBadge');
    if (badge) badge.innerText = list.length;
}

// --------------------------------------------------------------------------
// 6. HISTORIAL DE INFORMES GUARDADOS (MODAL Y GESTIÓN)
// --------------------------------------------------------------------------
function abrirModalInformesGuardados() {
    renderizarListaInformesGuardados();
    const modalEl = document.getElementById('modalInformesGuardados');
    if (modalEl && window.bootstrap) {
        bootstrap.Modal.getOrCreateInstance(modalEl).show();
    }
}

function renderizarListaInformesGuardados() {
    const container = document.getElementById('listaInformesGuardados');
    if (!container) return;

    const list = obtenerInformesGuardados();
    container.innerHTML = '';

    if (list.length === 0) {
        container.innerHTML = `
            <div class="text-center py-5 text-muted">
                <i class="bi bi-bookmark fs-1 text-secondary opacity-50 d-block mb-2"></i>
                <h6 class="text-white">Aún no tienes informes guardados</h6>
                <p class="small text-secondary mb-3">Haz clic en <strong>"Guardar Informe"</strong> en el panel principal para guardar los KPIs, gráficas y métricas actuales.</p>
            </div>
        `;
        return;
    }

    list.forEach(item => {
        const card = document.createElement('div');
        card.className = 'p-3 mb-3 rounded-3 border border-secondary border-opacity-25';
        card.style.backgroundColor = '#151724';

        const fechaStr = new Date(item.fechaGuardado).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' });
        const k = item.kpis || {};
        const fmtMoney = (val) => '$' + Number(val || 0).toLocaleString('en-US');

        card.innerHTML = `
            <div class="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-2">
                <div>
                    <h6 class="fw-bold text-white mb-1"><i class="bi bi-file-earmark-check text-neon-green me-2"></i>${item.titulo}</h6>
                    <div class="d-flex align-items-center gap-2 small text-secondary">
                        <span><i class="bi bi-clock me-1"></i>${fechaStr}</span>
                        <span>&bull;</span>
                        <span class="badge bg-secondary bg-opacity-50 text-white">${item.tipo}</span>
                        <span>&bull;</span>
                        <span class="badge bg-dark border border-secondary border-opacity-25 text-neon-green">${item.rango}</span>
                    </div>
                    ${item.notas ? `<p class="small text-muted mt-2 mb-0 fst-italic">"${item.notas}"</p>` : ''}
                </div>
                <div class="d-flex gap-2">
                    <button class="btn btn-sm btn-outline-green rounded-pill px-3 btn-cargar-informe" data-id="${item.id}" title="Cargar este informe en el dashboard">
                        <i class="bi bi-eye me-1"></i> Cargar
                    </button>
                    <button class="btn btn-sm btn-outline-secondary rounded-pill px-2 btn-descargar-graficas-informe" data-id="${item.id}" title="Descargar gráficas PNG">
                        <i class="bi bi-images me-1"></i> Gráficas
                    </button>
                    <button class="btn btn-sm btn-outline-danger rounded-pill px-2 btn-eliminar-informe" data-id="${item.id}" title="Eliminar informe guardado">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </div>
            <!-- Snapshot KPIs Resumen -->
            <div class="row g-2 mt-2 pt-2 border-top border-secondary border-opacity-10 small">
                <div class="col-6 col-md-3">
                    <span class="text-secondary d-block" style="font-size: 0.72rem;">Ventas</span>
                    <strong class="text-white">${fmtMoney(k.totalVentas)} (${k.countVentas || 0})</strong>
                </div>
                <div class="col-6 col-md-3">
                    <span class="text-secondary d-block" style="font-size: 0.72rem;">Stock</span>
                    <strong class="text-white">${k.stockDisponible || 0} Autos</strong>
                </div>
                <div class="col-6 col-md-3">
                    <span class="text-secondary d-block" style="font-size: 0.72rem;">Compras</span>
                    <strong class="text-white">${fmtMoney(k.totalCompras)}</strong>
                </div>
                <div class="col-6 col-md-3">
                    <span class="text-secondary d-block" style="font-size: 0.72rem;">Margen Neto</span>
                    <strong style="color: ${k.gananciaNeta >= 0 ? '#DBFF99' : '#FB7185'};">${fmtMoney(k.gananciaNeta)}</strong>
                </div>
            </div>
        `;
        container.appendChild(card);
    });

    // Event listeners en tarjetas
    container.querySelectorAll('.btn-cargar-informe').forEach(b => {
        b.addEventListener('click', function() {
            cargarInformeEnPantalla(this.dataset.id);
        });
    });

    container.querySelectorAll('.btn-descargar-graficas-informe').forEach(b => {
        b.addEventListener('click', function() {
            descargarGraficasDeInforme(this.dataset.id);
        });
    });

    container.querySelectorAll('.btn-eliminar-informe').forEach(b => {
        b.addEventListener('click', function() {
            if (confirm('¿Deseas eliminar este informe guardado?')) {
                eliminarInformeDeStorage(this.dataset.id);
            }
        });
    });
}

function eliminarInformeDeStorage(id) {
    let list = obtenerInformesGuardados();
    list = list.filter(item => item.id !== id);
    localStorage.setItem(STORAGE_KEY_INFORMES, JSON.stringify(list));
    actualizarBadgeGuardados();
    renderizarListaInformesGuardados();
}

function descargarGraficasDeInforme(id) {
    const list = obtenerInformesGuardados();
    const item = list.find(i => i.id === id);
    if (!item || !item.imagenes || Object.keys(item.imagenes).length === 0) {
        alert('Este informe no contiene imágenes de gráficas almacenadas.');
        return;
    }

    Object.entries(item.imagenes).forEach(([nombre, base64], idx) => {
        setTimeout(() => {
            const link = document.createElement('a');
            link.download = `${item.titulo.replace(/\s+/g, '_')}_${nombre}.png`;
            link.href = base64;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }, idx * 250);
    });
}

function cargarInformeEnPantalla(id) {
    const list = obtenerInformesGuardados();
    const item = list.find(i => i.id === id);
    if (!item) return;

    modoInformeGuardado = item;

    // Mostrar banner superior de advertencia
    mostrarBannerInformeGuardado(item);

    // Cargar KPIs del informe
    renderizarKPIs(item.kpis, item.tipo);

    // Renderizar gráficos congelados
    if (item.graficos) {
        renderizarGraficoMarcas(item.graficos.marcas);
        renderizarCampanias(item.graficos.campanias);
        renderizarGraficoClientes(item.graficos.clientes);
        renderizarGraficoInventario(item.graficos.marcas);
        renderizarGraficoCostos(item.graficos.costos);
        renderizarGraficoVentasMes(item.graficos.ventasMes);
    }

    renderizarResumenGeneral(item.kpis);

    if (item.registros) {
        currentDetailData = item.registros;
        renderizarTablaDashboard();
    }

    const modalEl = document.getElementById('modalInformesGuardados');
    if (modalEl && window.bootstrap) {
        bootstrap.Modal.getInstance(modalEl)?.hide();
    }
}

function mostrarBannerInformeGuardado(item) {
    removerBannerInformeGuardado();

    const banner = document.createElement('div');
    banner.id = 'bannerInformeGuardado';
    banner.className = 'alert alert-warning d-flex justify-content-between align-items-center py-2 px-3 mb-4 rounded-3 shadow-sm';
    banner.style.backgroundColor = 'rgba(250, 204, 21, 0.15)';
    banner.style.borderColor = 'rgba(250, 204, 21, 0.4)';
    banner.style.color = '#EFF0EB';

    const fechaStr = new Date(item.fechaGuardado).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' });

    banner.innerHTML = `
        <div class="d-flex align-items-center gap-2">
            <i class="bi bi-bookmark-check-fill text-warning fs-5"></i>
            <div>
                <strong>Visualizando Informe Guardado:</strong> ${item.titulo}
                <span class="small text-secondary ms-2">(${fechaStr})</span>
            </div>
        </div>
        <button class="btn btn-sm bg-neon-green text-dark fw-bold rounded-pill px-3" id="btnSalirModoGuardado">
            <i class="bi bi-arrow-repeat me-1"></i> Volver a Datos en Vivo
        </button>
    `;

    const seccionHeader = document.querySelector('.container-fluid.p-4');
    if (seccionHeader) {
        seccionHeader.insertBefore(banner, seccionHeader.firstChild);
    }

    const btnSalir = document.getElementById('btnSalirModoGuardado');
    if (btnSalir) {
        btnSalir.addEventListener('click', salirDeModoGuardado);
    }
}

function removerBannerInformeGuardado() {
    const b = document.getElementById('bannerInformeGuardado');
    if (b) b.remove();
}

function salirDeModoGuardado() {
    modoInformeGuardado = null;
    removerBannerInformeGuardado();
    cargarDashboard();
}

// --------------------------------------------------------------------------
// 7. MODAL DE REPORTE DETALLADO Y EXPORTACIÓN
// --------------------------------------------------------------------------
function abrirModalReporte() {
    const modTitle = document.getElementById('modalReporteTitulo');
    if (modTitle) {
        modTitle.innerHTML = `<i class="bi bi-file-earmark-bar-graph text-neon-green me-2"></i> Reporte de ${selectedTipo} (${selectedRango})`;
    }

    const badgeTipo = document.getElementById('modalReporteBadgeTipo');
    if (badgeTipo) badgeTipo.innerText = selectedTipo;

    const badgeTotal = document.getElementById('modalReporteBadgeTotal');
    if (badgeTotal) badgeTotal.innerText = `${currentDetailData.length} Registros`;

    renderizarTablaReporteModal();

    const modalEl = document.getElementById('modalReporteDetalle');
    if (modalEl && window.bootstrap) {
        const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
        modal.show();
    }
}

function renderizarTablaReporteModal() {
    const thead = document.getElementById('reporte-table-head');
    const tbody = document.getElementById('reporte-table-body');
    const searchInput = document.getElementById('input-busqueda-reporte');
    const term = searchInput ? searchInput.value.trim().toLowerCase() : '';

    if (!tbody || !thead) return;
    tbody.innerHTML = '';
    thead.innerHTML = '';

    if (!currentDetailData || currentDetailData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-4"><i class="bi bi-inbox fs-3 d-block mb-1"></i> No se encontraron registros para este reporte.</td></tr>';
        return;
    }

    const filtrados = currentDetailData.filter(row => {
        if (!term) return true;
        return Object.values(row).some(val =>
            String(val || '').toLowerCase().includes(term)
        );
    });

    const contador = document.getElementById('contador-modal-reporte');
    if (contador) {
        contador.innerText = `Mostrando ${filtrados.length} de ${currentDetailData.length} registros`;
    }

    const sample = filtrados[0] || currentDetailData[0];
    const keys = Object.keys(sample);

    const trHead = document.createElement('tr');
    keys.forEach(k => {
        const th = document.createElement('th');
        th.innerText = formatColumnHeader(k);
        trHead.appendChild(th);
    });
    thead.appendChild(trHead);

    filtrados.forEach(row => {
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid rgba(255,255,255,0.05)';

        keys.forEach(k => {
            const td = document.createElement('td');
            let val = row[k];

            if (k.toLowerCase().includes('fecha') && val) {
                val = new Date(val).toISOString().split('T')[0];
            } else if ((k.toLowerCase().includes('monto') || k.toLowerCase().includes('total') || k.toLowerCase().includes('precio') || k.toLowerCase().includes('presupuesto')) && typeof val === 'number') {
                val = '$' + val.toLocaleString('en-US');
                td.className = 'fw-bold text-white';
            } else if (k.toLowerCase().includes('estado')) {
                const est = String(val || '');
                let colorClass = 'badge-registrado';
                if (est.includes('Inactivo') || est.includes('Cancel') || est.includes('Finaliz')) colorClass = 'badge-pendiente';
                val = `<span class="${colorClass}">${est}</span>`;
                td.innerHTML = val;
                tr.appendChild(td);
                return;
            }

            td.innerText = val !== null && val !== undefined ? val : 'N/A';
            tr.appendChild(td);
        });

        tbody.appendChild(tr);
    });
}

function formatColumnHeader(key) {
    const map = {
        'idVenta': 'ID Venta',
        'FechaVenta': 'Fecha',
        'Cliente': 'Cliente',
        'Auto': 'Vehículo',
        'FormaPago': 'Método Pago',
        'EstadoVenta': 'Estado',
        'TotalVenta': 'Monto Total',
        'idAuto': 'ID Auto',
        'Marca': 'Marca',
        'Modelo': 'Modelo',
        'Anio': 'Año',
        'Placa': 'Placa',
        'Precio': 'Precio Venta',
        'Estado': 'Estado',
        'idCostoEstan': 'ID Costo',
        'Fecha': 'Fecha',
        'Categoria': 'Categoría',
        'Descripcion': 'Descripción',
        'Monto': 'Monto',
        'IdClientes': 'ID Cliente',
        'Nombre': 'Nombre',
        'Apellido': 'Apellido',
        'Telefono': 'Teléfono',
        'Correo': 'Correo Electrónico',
        'CanalOrigen': 'Canal',
        'FechaRegistro': 'Fecha Reg.',
        'idCampaña': 'ID Campaña',
        'NombreCampaña': 'Nombre Campaña',
        'PresupuestoInvertido': 'Presupuesto',
        'EstadoCampana': 'Estado',
        'TipoRegistro': 'Tipo',
        'Referencia': 'Ref. / ID',
        'Detalle': 'Detalle'
    };
    return map[key] || key;
}

// --------------------------------------------------------------------------
// 8. EXPORTACIÓN A EXCEL / CSV CON BOM UTF-8
// --------------------------------------------------------------------------
function exportarReporteCSV() {
    if (!currentDetailData || currentDetailData.length === 0) {
        alert('No hay datos disponibles para exportar con los filtros actuales.');
        return;
    }

    const headers = Object.keys(currentDetailData[0]);
    const displayHeaders = headers.map(formatColumnHeader);

    let csvContent = '\uFEFF' + displayHeaders.join(';') + '\n';

    currentDetailData.forEach(row => {
        const line = headers.map(h => {
            let val = row[h];
            if (val === null || val === undefined) return '""';
            if (h.toLowerCase().includes('fecha') && val) {
                val = new Date(val).toISOString().split('T')[0];
            }
            const str = String(val).replace(/"/g, '""');
            return `"${str}"`;
        }).join(';');
        csvContent += line + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const cleanTipo = (selectedTipo || 'Reporte').replace(/\s+/g, '_');
    const cleanRango = (selectedRango || 'Todos').replace(/\s+/g, '_');
    link.download = `Reporte_${cleanTipo}_${cleanRango}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// Toast de notificación rápido
function mostrarToast(mensaje) {
    let toast = document.getElementById('toastAMI');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toastAMI';
        toast.className = 'position-fixed bottom-0 end-0 p-3';
        toast.style.zIndex = '9999';
        toast.innerHTML = `
            <div class="toast align-items-center text-white bg-dark border border-secondary border-opacity-50 shadow-lg" role="alert" aria-live="assertive" aria-atomic="true">
                <div class="d-flex">
                    <div class="toast-body d-flex align-items-center gap-2">
                        <i class="bi bi-check-circle-fill text-neon-green fs-5"></i>
                        <span id="toastAMITexto">${mensaje}</span>
                    </div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
                </div>
            </div>
        `;
        document.body.appendChild(toast);
    } else {
        const textEl = document.getElementById('toastAMITexto');
        if (textEl) textEl.innerText = mensaje;
    }

    const toastEl = toast.querySelector('.toast');
    if (toastEl && window.bootstrap) {
        const bsToast = new bootstrap.Toast(toastEl, { delay: 3500 });
        bsToast.show();
    }
}
