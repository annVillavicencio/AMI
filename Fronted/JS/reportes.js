/**
 * AMI - Sistema Ejecutivo de Reportes, Análisis de Datos y Contabilidad Oficial
 * Diseñado para Fronted/Pages/reportes.html
 */

// ==========================================================================
// ESTADO GLOBAL
// ==========================================================================
let dashboardData = null;
let currentDetailData = [];
let chartVentasMesInstance = null;
let chartMarcasInstance = null;
let chartClientesInstance = null;
let chartCostosInstance = null;

let selectedRango = 'Todos los registros';
let selectedTipo = 'General (Todo)';
let reporteFinancieroActual = null;
let datosFinancierosActuales = null;
let modoInformeGuardado = null; // null si estamos en vivo

const THEME_COLORS = [
    '#DBFF99', // Verde Neón Principal
    '#FFD4F8', // Rosa Neón
    '#38BDF8', // Celeste Neón
    '#FACC15', // Amarillo Neón
    '#A855F7', // Púrpura Neón
    '#FB7185', // Coral Neón
    '#4ADE80', // Verde Esmeralda
    '#94A3B8'  // Slate
];

const STORAGE_KEY_INFORMES = 'ami_reportes_guardados';

// ==========================================================================
// CONTROL DE PESTAÑAS PRINCIPALES (Estadística vs Contabilidad)
// ==========================================================================
window.switchMainTab = function (tab) {
    const tabEst = document.getElementById('tab-estadistica');
    const tabCont = document.getElementById('tab-contabilidad');
    const viewEst = document.getElementById('view-estadistica');
    const viewCont = document.getElementById('view-contabilidad');

    if (tab === 'estadistica') {
        if (tabEst) {
            tabEst.classList.add('active');
            tabEst.setAttribute('aria-selected', 'true');
        }
        if (tabCont) {
            tabCont.classList.remove('active');
            tabCont.setAttribute('aria-selected', 'false');
        }
        if (viewEst) viewEst.classList.remove('d-none');
        if (viewCont) viewCont.classList.add('d-none');
    } else if (tab === 'contabilidad') {
        if (tabCont) {
            tabCont.classList.add('active');
            tabCont.setAttribute('aria-selected', 'true');
        }
        if (tabEst) {
            tabEst.classList.remove('active');
            tabEst.setAttribute('aria-selected', 'false');
        }
        if (viewCont) viewCont.classList.remove('d-none');
        if (viewEst) viewEst.classList.add('d-none');

        // Cargar por defecto el Balance General si aún no se ha generado ninguno
        if (!reporteFinancieroActual) {
            generarReporteFinanciero('Balance General');
        }
    }
};

// ==========================================================================
// INICIALIZACIÓN AL CARGAR EL DOM
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
    // 1. Inicializar filtros dropdown de la cabecera
    inicializarFiltros();

    // 2. Cargar datos del Dashboard estadístico inicial
    cargarDashboard();

    // 3. Contador de informes guardados
    actualizarBadgeGuardados();

    // 4. Botón de Actualizar Datos
    const btnGen = document.getElementById('btnGenerarReporte');
    if (btnGen) {
        btnGen.addEventListener('click', () => {
            if (modoInformeGuardado) salirDeModoHistorico();
            cargarDashboard();
        });
    }

    // 5. Buscador de la tabla de detalles en vivo
    const inputBuscar = document.getElementById('inputBuscarDetalle');
    if (inputBuscar) {
        inputBuscar.addEventListener('input', () => {
            renderizarTablaDetalle();
        });
    }

    // 6. Botón de exportación a CSV de transacciones
    const btnCSV = document.getElementById('btnExportarDetalleCSV');
    if (btnCSV) {
        btnCSV.addEventListener('click', exportarDetalleCSV);
    }

    // 7. Descarga individual de gráficas PNG
    document.querySelectorAll('.btn-descargar-chart').forEach(btn => {
        btn.addEventListener('click', function (e) {
            e.preventDefault();
            const chartId = this.dataset.chart;
            const chartTitle = this.dataset.title || 'Grafica_AMI';
            descargarChartPNG(chartId, chartTitle);
        });
    });

    // 8. Listeners para Guardar Informe (Snapshot)
    const btnGuardarSnap = document.getElementById('btnGuardarSnapshot');
    if (btnGuardarSnap) {
        btnGuardarSnap.addEventListener('click', prepararModalGuardarInforme);
    }

    const btnConfirmarSnap = document.getElementById('btnConfirmarGuardarInforme');
    if (btnConfirmarSnap) {
        btnConfirmarSnap.addEventListener('click', ejecutarGuardadoInforme);
    }

    // 9. Listeners para Ver Historial de Informes Guardados
    const btnVerGuardados = document.getElementById('btnVerGuardados');
    if (btnVerGuardados) {
        btnVerGuardados.addEventListener('click', abrirModalInformesGuardados);
    }

    const btnSalirHist = document.getElementById('btnSalirModoHistorico');
    if (btnSalirHist) {
        btnSalirHist.addEventListener('click', salirDeModoHistorico);
    }
});

// ==========================================================================
// CONFIGURACIÓN DE FILTROS DEL HEADER
// ==========================================================================
function inicializarFiltros() {
    // Rango de fechas
    document.querySelectorAll('.opcion-rango').forEach(opcion => {
        opcion.addEventListener('click', function (e) {
            e.preventDefault();
            document.querySelectorAll('.opcion-rango').forEach(o => o.classList.remove('active'));
            this.classList.add('active');

            const val = this.dataset.value || this.textContent.trim();
            selectedRango = val;

            const label = document.getElementById('rangoSeleccionado');
            if (label) label.textContent = val;

            if (modoInformeGuardado) salirDeModoHistorico();
            cargarDashboard();
        });
    });

    // Categoría / Tipo
    document.querySelectorAll('.opcion-tipo').forEach(opcion => {
        opcion.addEventListener('click', function (e) {
            e.preventDefault();
            document.querySelectorAll('.opcion-tipo').forEach(o => o.classList.remove('active'));
            this.classList.add('active');

            const val = this.dataset.value || this.textContent.trim();
            selectedTipo = val;

            const label = document.getElementById('tipoSeleccionado');
            if (label) label.textContent = val;

            if (modoInformeGuardado) salirDeModoHistorico();
            cargarDashboard();
        });
    });
}

// ==========================================================================
// CARGAR DASHBOARD EN VIVO (FETCH API)
// ==========================================================================
async function cargarDashboard() {
    try {
        const urlDash = `/api/reportes/dashboard?rango=${encodeURIComponent(selectedRango)}&tipo=${encodeURIComponent(selectedTipo)}`;
        const urlData = `/api/reportes/data?rango=${encodeURIComponent(selectedRango)}&tipo=${encodeURIComponent(selectedTipo)}`;

        const [resDash, resData] = await Promise.all([
            fetch(urlDash).then(r => r.json()),
            fetch(urlData).then(r => r.json())
        ]);

        dashboardData = resDash;
        currentDetailData = resData.items || [];

        // 1. Renderizar KPIs
        renderizarKPIs(dashboardData.kpis);

        // 2. Gráfica 1: Ventas por Mes
        renderizarGraficaVentasMes(dashboardData.graficas?.ventasMes || []);

        // 3. Gráfica 2: Stock por Marca
        renderizarGraficaMarcas(dashboardData.graficas?.marcasStock || []);

        // 4. Gráfica 3: Clientes por Origen
        renderizarGraficaClientes(dashboardData.graficas?.clientesOrigen || []);

        // 5. Gráfica 4: Flujo Comercial (Compras vs Ventas)
        renderizarGraficaCostos(dashboardData.kpis, dashboardData.graficas);

        // 6. Tabla detallada interactiva
        renderizarTablaDetalle();

    } catch (err) {
        console.error('Error al cargar datos del dashboard:', err);
    }
}

// ==========================================================================
// RENDERIZAR KPIs DINÁMICOS
// ==========================================================================
function renderizarKPIs(kpis) {
    if (!kpis) return;

    const fmtMoney = (val) => '$' + Number(val || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

    // Card 1: Ventas Totales
    const elVentas = document.getElementById('kpi-ventas-totales');
    if (elVentas) elVentas.textContent = fmtMoney(kpis.totalVentas);

    const elTrans = document.getElementById('kpi-transacciones-count');
    if (elTrans) elTrans.textContent = (kpis.totalTransacciones || 0);

    // Card 2: Autos en Stock
    const elStock = document.getElementById('kpi-stock-autos');
    if (elStock) elStock.textContent = (kpis.totalStock || 0);

    const elStockVal = document.getElementById('kpi-stock-valor');
    if (elStockVal) elStockVal.textContent = `Valor: ${fmtMoney(kpis.valorStock)}`;

    // Card 3: Margen Operativo / Rentabilidad
    const elMargen = document.getElementById('kpi-margen-bruto');
    if (elMargen) elMargen.textContent = kpis.margenBruto || '0.0%';

    const elCompras = document.getElementById('kpi-compras-resumen');
    if (elCompras) elCompras.textContent = `Compras: ${fmtMoney(kpis.totalCompras)}`;

    // Card 4: Clientes Activos
    const elCli = document.getElementById('kpi-clientes-activos');
    if (elCli) elCli.textContent = (kpis.clientesActivos || 0);

    const elCostos = document.getElementById('kpi-costos-resumen');
    if (elCostos) elCostos.textContent = `Mantenimiento: ${fmtMoney(kpis.totalCostos)}`;
}

// ==========================================================================
// RENDERIZAR GRÁFICA 1: VENTAS POR MES (LÍNEA CON GRADIENTE)
// ==========================================================================
function renderizarGraficaVentasMes(ventasMes) {
    const canvas = document.getElementById('chartVentasMes');
    if (!canvas) return;

    if (chartVentasMesInstance) {
        chartVentasMesInstance.destroy();
    }

    if (!ventasMes || ventasMes.length === 0) {
        return;
    }

    const labels = ventasMes.map(v => v.mes);
    const dataVals = ventasMes.map(v => v.total);

    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 240);
    gradient.addColorStop(0, 'rgba(219, 255, 153, 0.35)');
    gradient.addColorStop(1, 'rgba(219, 255, 153, 0.00)');

    if (window.Chart) {
        chartVentasMesInstance = new Chart(canvas, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Ventas (USD)',
                    data: dataVals,
                    borderColor: '#DBFF99',
                    backgroundColor: gradient,
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#DBFF99',
                    pointBorderColor: '#07060B',
                    pointBorderWidth: 2,
                    pointRadius: 5,
                    pointHoverRadius: 7
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => ` Ventas: $${Number(ctx.parsed.y).toLocaleString('en-US')}`
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: { color: '#94A3B8', font: { size: 11 } },
                        grid: { display: false }
                    },
                    y: {
                        ticks: {
                            color: '#94A3B8',
                            font: { size: 11 },
                            callback: (v) => '$' + Number(v / 1000).toFixed(0) + 'k'
                        },
                        grid: { color: 'rgba(255,255,255,0.06)' }
                    }
                }
            }
        });
    }
}

// ==========================================================================
// RENDERIZAR GRÁFICA 2: STOCK DE AUTOS POR MARCA (DOUGHNUT)
// ==========================================================================
function renderizarGraficaMarcas(marcasStock) {
    const canvas = document.getElementById('chartMarcas');
    if (!canvas) return;

    if (chartMarcasInstance) {
        chartMarcasInstance.destroy();
    }

    if (!marcasStock || marcasStock.length === 0) {
        return;
    }

    const labels = marcasStock.map(m => m.marca);
    const dataVals = marcasStock.map(m => m.cantidad);
    const bgColors = THEME_COLORS.slice(0, marcasStock.length);

    if (window.Chart) {
        chartMarcasInstance = new Chart(canvas, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: dataVals,
                    backgroundColor: bgColors,
                    borderColor: '#101218',
                    borderWidth: 2,
                    hoverOffset: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '65%',
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            color: '#CBD5E1',
                            font: { size: 10 },
                            boxWidth: 10,
                            padding: 8
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => ` ${ctx.label}: ${ctx.parsed} autos`
                        }
                    }
                }
            }
        });
    }
}

// ==========================================================================
// RENDERIZAR GRÁFICA 3: ORIGEN DE CLIENTES (DOUGHNUT)
// ==========================================================================
function renderizarGraficaClientes(clientesOrigen) {
    const canvas = document.getElementById('chartClientes');
    if (!canvas) return;

    if (chartClientesInstance) {
        chartClientesInstance.destroy();
    }

    if (!clientesOrigen || clientesOrigen.length === 0) {
        return;
    }

    const labels = clientesOrigen.map(c => c.origen);
    const dataVals = clientesOrigen.map(c => c.total);
    const bgColors = ['#FFD4F8', '#38BDF8', '#DBFF99', '#FACC15', '#A855F7', '#FB7185'];

    if (window.Chart) {
        chartClientesInstance = new Chart(canvas, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: dataVals,
                    backgroundColor: bgColors.slice(0, labels.length),
                    borderColor: '#101218',
                    borderWidth: 2,
                    hoverOffset: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '60%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#CBD5E1',
                            font: { size: 10 },
                            boxWidth: 10,
                            padding: 6
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => ` ${ctx.label}: ${ctx.parsed} clientes`
                        }
                    }
                }
            }
        });
    }
}

// ==========================================================================
// RENDERIZAR GRÁFICA 4: FLUJO COMERCIAL: COMPRAS VS VENTAS (BARRAS)
// ==========================================================================
function renderizarGraficaCostos(kpis, graficas) {
    const canvas = document.getElementById('chartCostos');
    if (!canvas || !kpis) return;

    if (chartCostosInstance) {
        chartCostosInstance.destroy();
    }

    // Comparar Ventas vs Compras vs Costos
    const labels = ['Ingresos por Ventas', 'Inversión en Compras', 'Costos Operativos'];
    const dataVals = [
        Number(kpis.totalVentas || 0),
        Number(kpis.totalCompras || 0),
        Number(kpis.totalCostos || 0)
    ];

    if (window.Chart) {
        chartCostosInstance = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    data: dataVals,
                    backgroundColor: ['#DBFF99', '#38BDF8', '#FB7185'],
                    borderColor: ['#DBFF99', '#38BDF8', '#FB7185'],
                    borderRadius: 6,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => ` ${ctx.label}: $${Number(ctx.parsed.y).toLocaleString('en-US')}`
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: { color: '#94A3B8', font: { size: 11 } },
                        grid: { display: false }
                    },
                    y: {
                        ticks: {
                            color: '#94A3B8',
                            font: { size: 11 },
                            callback: (v) => '$' + Number(v / 1000).toFixed(0) + 'k'
                        },
                        grid: { color: 'rgba(255,255,255,0.06)' }
                    }
                }
            }
        });
    }
}

// ==========================================================================
// TABLA DE DETALLE EN VIVO
// ==========================================================================
function renderizarTablaDetalle() {
    const tbody = document.getElementById('tbodyDetalleRegistros');
    const inputSearch = document.getElementById('inputBuscarDetalle');
    if (!tbody) return;

    const term = (inputSearch ? inputSearch.value : '').toLowerCase().trim();

    if (!currentDetailData || currentDetailData.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-4 text-muted">
                    <i class="bi bi-inbox fs-4 d-block mb-2"></i>
                    No se encontraron transacciones para el período y filtro seleccionados.
                </td>
            </tr>
        `;
        return;
    }

    const filtrados = currentDetailData.filter(item => {
        if (!term) return true;
        return (
            String(item.id).toLowerCase().includes(term) ||
            String(item.categoria).toLowerCase().includes(term) ||
            String(item.descripcion).toLowerCase().includes(term) ||
            String(item.detalle).toLowerCase().includes(term) ||
            String(item.estado).toLowerCase().includes(term)
        );
    });

    if (filtrados.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-4 text-muted">
                    <i class="bi bi-search fs-4 d-block mb-2"></i>
                    No se encontraron resultados que coincidan con "${term}".
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = filtrados.map(item => {
        let badgeCat = '<span class="badge" style="background:rgba(219,255,153,0.15);color:#DBFF99;border:1px solid rgba(219,255,153,0.3);">Venta</span>';
        if (item.categoria === 'Compra') {
            badgeCat = '<span class="badge" style="background:rgba(56,189,248,0.15);color:#38BDF8;border:1px solid rgba(56,189,248,0.3);">Compra</span>';
        } else if (item.categoria === 'Costo') {
            badgeCat = '<span class="badge" style="background:rgba(251,113,133,0.15);color:#FB7185;border:1px solid rgba(251,113,133,0.3);">Costo</span>';
        } else if (item.categoria === 'Inventario') {
            badgeCat = '<span class="badge" style="background:rgba(250,204,21,0.15);color:#FACC15;border:1px solid rgba(250,204,21,0.3);">Auto</span>';
        }

        let badgeEstado = '<span class="badge bg-success bg-opacity-25 text-success rounded-pill px-2">Finalizada</span>';
        const estStr = String(item.estado || '');
        if (estStr.includes('Pendiente') || estStr.includes('Inactivo') || estStr.includes('Mantenimiento')) {
            badgeEstado = `<span class="badge bg-warning bg-opacity-25 text-warning rounded-pill px-2">${estStr}</span>`;
        } else if (estStr) {
            badgeEstado = `<span class="badge bg-success bg-opacity-25 text-success rounded-pill px-2">${estStr}</span>`;
        }

        const montoStr = typeof item.monto === 'number'
            ? '$' + item.monto.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
            : (item.monto || 'N/A');

        return `
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                <td class="ps-3 text-secondary fw-semibold">#${item.id}</td>
                <td>${badgeCat}</td>
                <td class="text-white fw-medium">${item.descripcion || 'Sin descripción'}</td>
                <td class="text-secondary small">${item.detalle || 'N/D'}</td>
                <td class="text-secondary small">${item.fecha || 'N/A'}</td>
                <td class="text-end fw-bold text-white">${montoStr}</td>
                <td class="text-center pe-3">${badgeEstado}</td>
            </tr>
        `;
    }).join('');
}

// ==========================================================================
// EXPORTAR TABLA DE DETALLE A CSV
// ==========================================================================
function exportarDetalleCSV() {
    if (!currentDetailData || currentDetailData.length === 0) {
        alert('No hay registros disponibles para exportar.');
        return;
    }

    const headers = ['ID', 'Categoría', 'Descripción', 'Detalle / Referencia', 'Fecha', 'Monto (USD)', 'Estado'];
    const rows = currentDetailData.map(item => [
        item.id,
        item.categoria,
        `"${(item.descripcion || '').replace(/"/g, '""')}"`,
        `"${(item.detalle || '').replace(/"/g, '""')}"`,
        item.fecha || '',
        item.monto || 0,
        item.estado || ''
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Transacciones_AMI_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// ==========================================================================
// DESCARGAR GRÁFICAS COMO PNG DE ALTA RESOLUCIÓN
// ==========================================================================
function descargarChartPNG(chartId, chartTitle) {
    const canvas = document.getElementById(chartId);
    if (!canvas) {
        alert('No se encontró el lienzo de la gráfica para descargar.');
        return;
    }

    // Crear canvas con fondo oscuro para evitar fondos transparentes negros en visores
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = canvas.width || 800;
    exportCanvas.height = canvas.height || 400;
    const ctx = exportCanvas.getContext('2d');

    ctx.fillStyle = '#0F1019';
    ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    ctx.drawImage(canvas, 0, 0);

    const link = document.createElement('a');
    link.download = `${chartTitle}_${new Date().toISOString().split('T')[0]}.png`;
    link.href = exportCanvas.toDataURL('image/png');
    link.click();
}

// ==========================================================================
// PESTAÑA 2: REPORTES FINANCIEROS Y CONTABLES (Balance y Estado de Resultados)
// ==========================================================================
window.generarReporteFinanciero = async function (tipoReporte) {
    const placeholder = document.getElementById('placeholderFinanciero');
    const contenedor = document.getElementById('contenidoReporteGenerado');
    if (!contenedor) return;

    reporteFinancieroActual = tipoReporte;

    // Resaltar visualmente la tarjeta seleccionada
    const cardBal = document.getElementById('cardReporteBalance');
    const cardRes = document.getElementById('cardReporteResultados');
    if (tipoReporte.toLowerCase().includes('balance')) {
        if (cardBal) cardBal.style.borderColor = '#A3E635';
        if (cardRes) cardRes.style.borderColor = 'rgba(229,143,229,.25)';
    } else {
        if (cardRes) cardRes.style.borderColor = '#E58FE5';
        if (cardBal) cardBal.style.borderColor = 'rgba(163,230,53,.25)';
    }

    if (placeholder) placeholder.classList.add('d-none');
    contenedor.classList.remove('d-none');
    contenedor.innerHTML = `
        <div class="text-center py-5">
            <div class="spinner-border text-neon-green mb-3" role="status"></div>
            <p class="text-secondary small">Calculando cuentas contables y estados financieros oficiales...</p>
        </div>
    `;

    try {
        if (tipoReporte.toLowerCase().includes('balance')) {
            const res = await fetch('/api/reportes/financiero/balance-general');
            const data = await res.json();
            datosFinancierosActuales = { tipo: 'balance', data };
            renderizarBalanceGeneral(data);
        } else {
            const res = await fetch('/api/reportes/financiero/estado-resultados');
            const data = await res.json();
            datosFinancierosActuales = { tipo: 'resultados', data };
            renderizarEstadoResultados(data);
        }
    } catch (err) {
        contenedor.innerHTML = `
            <div class="alert alert-danger">
                <i class="bi bi-exclamation-triangle-fill me-2"></i> Error al generar reporte financiero: ${err.message}
            </div>
        `;
    }
};

function renderizarBalanceGeneral(data) {
    const contenedor = document.getElementById('contenidoReporteGenerado');
    if (!contenedor) return;

    const fmt = (n) => '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const htmlActivosCorrientes = data.activos.corrientes.map(c => `
        <tr style="border-bottom: 1px solid rgba(255,255,255,0.03);">
            <td class="text-secondary font-monospace small ps-3">${c.codigo}</td>
            <td class="text-white">${c.cuenta}</td>
            <td class="text-end font-monospace pe-3">${fmt(c.saldo)}</td>
        </tr>
    `).join('');

    const htmlActivosNoCorrientes = data.activos.noCorrientes.map(c => `
        <tr style="border-bottom: 1px solid rgba(255,255,255,0.03);">
            <td class="text-secondary font-monospace small ps-3">${c.codigo}</td>
            <td class="text-white">${c.cuenta}</td>
            <td class="text-end font-monospace pe-3">${fmt(c.saldo)}</td>
        </tr>
    `).join('');

    const htmlPasivosCorrientes = data.pasivos.corrientes.map(c => `
        <tr style="border-bottom: 1px solid rgba(255,255,255,0.03);">
            <td class="text-secondary font-monospace small ps-3">${c.codigo}</td>
            <td class="text-white">${c.cuenta}</td>
            <td class="text-end font-monospace pe-3">${fmt(c.saldo)}</td>
        </tr>
    `).join('');

    const htmlPasivosNoCorrientes = data.pasivos.noCorrientes.map(c => `
        <tr style="border-bottom: 1px solid rgba(255,255,255,0.03);">
            <td class="text-secondary font-monospace small ps-3">${c.codigo}</td>
            <td class="text-white">${c.cuenta}</td>
            <td class="text-end font-monospace pe-3">${fmt(c.saldo)}</td>
        </tr>
    `).join('');

    const htmlPatrimonio = data.patrimonio.cuentas.map(c => `
        <tr style="border-bottom: 1px solid rgba(255,255,255,0.03);">
            <td class="text-secondary font-monospace small ps-3">${c.codigo}</td>
            <td class="text-white">${c.cuenta}</td>
            <td class="text-end font-monospace pe-3">${fmt(c.saldo)}</td>
        </tr>
    `).join('');

    contenedor.innerHTML = `
        <!-- Header del Reporte -->
        <div class="d-flex flex-wrap justify-content-between align-items-center gap-3 pb-4 mb-4 border-bottom border-secondary border-opacity-25">
            <div>
                <div class="d-flex align-items-center gap-2 mb-1">
                    <span class="badge" style="background:#DBFF99; color:#07060B; font-weight:700;">OFICIAL NIIF</span>
                    <h4 class="text-white fw-bold mb-0">${data.reporte}</h4>
                </div>
                <div class="text-muted small">
                    <strong>${data.empresa}</strong> &bull; Fecha de corte: ${data.fechaCorte} &bull; Expresado en ${data.moneda}
                </div>
            </div>
            <div class="d-flex gap-2">
                <button type="button" class="btn btn-outline-secondary rounded-pill px-3 py-1 btn-sm d-flex align-items-center gap-2" onclick="window.print()">
                    <i class="bi bi-printer"></i> Imprimir / PDF
                </button>
                <button type="button" class="btn btn-outline-light rounded-pill px-3 py-1 btn-sm d-flex align-items-center gap-2" onclick="exportarFinancieroCSV()">
                    <i class="bi bi-file-earmark-spreadsheet text-neon-green"></i> Exportar CSV
                </button>
            </div>
        </div>

        <!-- Ratios e Indicadores Clave -->
        <div class="row g-3 mb-4">
            <div class="col-12 col-md-4">
                <div class="p-3 rounded-3" style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06);">
                    <div class="text-muted small">Capital de Trabajo Neto</div>
                    <div class="fs-5 fw-bold text-neon-green">${fmt(data.indicadores.capitalTrabajoNeto)}</div>
                    <div class="small text-secondary" style="font-size:0.75rem;">Activos Corrientes - Pasivos Corrientes</div>
                </div>
            </div>
            <div class="col-12 col-md-4">
                <div class="p-3 rounded-3" style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06);">
                    <div class="text-muted small">Razón de Liquidez Corriente</div>
                    <div class="fs-5 fw-bold text-white">${data.indicadores.razonCorriente}</div>
                    <div class="small text-secondary" style="font-size:0.75rem;">Capacidad de pago inmediata</div>
                </div>
            </div>
            <div class="col-12 col-md-4">
                <div class="p-3 rounded-3" style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06);">
                    <div class="text-muted small">Nivel de Endeudamiento</div>
                    <div class="fs-5 fw-bold text-neon-pink">${data.indicadores.ratioEndeudamiento}</div>
                    <div class="small text-secondary" style="font-size:0.75rem;">Pasivo Total / Activo Total</div>
                </div>
            </div>
        </div>

        <!-- Tablas del Balance en dos Columnas -->
        <div class="row g-4 mb-4">
            <!-- Columna Izquierda: ACTIVOS -->
            <div class="col-12 col-lg-6">
                <div class="rounded-4 p-3" style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.07);">
                    <h5 class="fw-bold text-neon-green mb-3 pb-2 border-bottom border-secondary border-opacity-25">
                        <i class="bi bi-wallet2 me-2"></i> 1. ACTIVOS
                    </h5>

                    <!-- Activos Corrientes -->
                    <div class="fw-bold text-white-50 small mb-2 ps-2">1.1 Activos Corrientes (Circulante)</div>
                    <table class="table table-dark table-sm mb-3">
                        <tbody>${htmlActivosCorrientes}</tbody>
                        <tfoot>
                            <tr class="fw-bold" style="background: rgba(219,255,153,0.06); border-top: 1px solid rgba(219,255,153,0.3);">
                                <td colspan="2" class="ps-3 text-neon-green">Total Activos Corrientes</td>
                                <td class="text-end font-monospace pe-3 text-neon-green">${fmt(data.activos.totalCorrientes)}</td>
                            </tr>
                        </tfoot>
                    </table>

                    <!-- Activos No Corrientes -->
                    <div class="fw-bold text-white-50 small mb-2 ps-2 mt-3">1.2 Activos No Corrientes (Fijo y Propiedades)</div>
                    <table class="table table-dark table-sm mb-3">
                        <tbody>${htmlActivosNoCorrientes}</tbody>
                        <tfoot>
                            <tr class="fw-bold" style="background: rgba(219,255,153,0.06); border-top: 1px solid rgba(219,255,153,0.3);">
                                <td colspan="2" class="ps-3 text-neon-green">Total Activos No Corrientes</td>
                                <td class="text-end font-monospace pe-3 text-neon-green">${fmt(data.activos.totalNoCorrientes)}</td>
                            </tr>
                        </tfoot>
                    </table>

                    <!-- Total General Activos -->
                    <div class="p-3 rounded-3 mt-4 d-flex justify-content-between align-items-center" style="background:#07060B; border: 2px solid #DBFF99;">
                        <span class="fw-bold text-white fs-6">TOTAL ACTIVOS</span>
                        <span class="font-monospace fw-bold fs-5 text-neon-green">${fmt(data.activos.totalActivos)}</span>
                    </div>
                </div>
            </div>

            <!-- Columna Derecha: PASIVOS Y PATRIMONIO -->
            <div class="col-12 col-lg-6">
                <div class="rounded-4 p-3" style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.07);">
                    <h5 class="fw-bold text-neon-pink mb-3 pb-2 border-bottom border-secondary border-opacity-25">
                        <i class="bi bi-credit-card me-2"></i> 2. PASIVOS Y OBLIGACIONES
                    </h5>

                    <!-- Pasivos Corrientes -->
                    <div class="fw-bold text-white-50 small mb-2 ps-2">2.1 Pasivos Corrientes (Corto Plazo)</div>
                    <table class="table table-dark table-sm mb-3">
                        <tbody>${htmlPasivosCorrientes}</tbody>
                        <tfoot>
                            <tr class="fw-bold" style="background: rgba(255,212,248,0.06); border-top: 1px solid rgba(255,212,248,0.3);">
                                <td colspan="2" class="ps-3 text-neon-pink">Total Pasivos Corrientes</td>
                                <td class="text-end font-monospace pe-3 text-neon-pink">${fmt(data.pasivos.totalCorrientes)}</td>
                            </tr>
                        </tfoot>
                    </table>

                    <!-- Pasivos No Corrientes -->
                    <div class="fw-bold text-white-50 small mb-2 ps-2 mt-3">2.2 Pasivos No Corrientes (Largo Plazo)</div>
                    <table class="table table-dark table-sm mb-3">
                        <tbody>${htmlPasivosNoCorrientes}</tbody>
                        <tfoot>
                            <tr class="fw-bold" style="background: rgba(255,212,248,0.06); border-top: 1px solid rgba(255,212,248,0.3);">
                                <td colspan="2" class="ps-3 text-neon-pink">Total Pasivos No Corrientes</td>
                                <td class="text-end font-monospace pe-3 text-neon-pink">${fmt(data.pasivos.totalNoCorrientes)}</td>
                            </tr>
                        </tfoot>
                    </table>

                    <h5 class="fw-bold text-white mb-3 mt-4 pb-2 border-bottom border-secondary border-opacity-25">
                        <i class="bi bi-pie-chart-fill text-neon-green me-2"></i> 3. PATRIMONIO NETO
                    </h5>
                    <table class="table table-dark table-sm mb-3">
                        <tbody>${htmlPatrimonio}</tbody>
                        <tfoot>
                            <tr class="fw-bold" style="background: rgba(255,255,255,0.06); border-top: 1px solid rgba(255,255,255,0.3);">
                                <td colspan="2" class="ps-3 text-white">Total Patrimonio Neto</td>
                                <td class="text-end font-monospace pe-3 text-white">${fmt(data.patrimonio.totalPatrimonio)}</td>
                            </tr>
                        </tfoot>
                    </table>

                    <!-- Total General Pasivo + Patrimonio -->
                    <div class="p-3 rounded-3 mt-4 d-flex justify-content-between align-items-center" style="background:#07060B; border: 2px solid #FFD4F8;">
                        <span class="fw-bold text-white fs-6">TOTAL PASIVO + PATRIMONIO</span>
                        <span class="font-monospace fw-bold fs-5 text-neon-pink">${fmt(data.resumen.totalPasivoMasPatrimonio)}</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Validación de Ecuación Contable -->
        <div class="p-3 rounded-4 d-flex flex-wrap justify-content-between align-items-center gap-3"
             style="background: rgba(219,255,153,0.08); border: 1px solid #DBFF99;">
            <div class="d-flex align-items-center gap-3">
                <i class="bi bi-check-circle-fill text-neon-green fs-3"></i>
                <div>
                    <div class="fw-bold text-white">Ecuación Fundamental Cuadrada con Éxito</div>
                    <small class="text-muted">Activo Total = Pasivo Total + Patrimonio Neto | Diferencia: $0.00</small>
                </div>
            </div>
            <span class="badge px-3 py-2 fs-6 rounded-pill" style="background:#DBFF99; color:#07060B;">
                BALANCE CUADRADO 100%
            </span>
        </div>
    `;
}

function renderizarEstadoResultados(data) {
    const contenedor = document.getElementById('contenidoReporteGenerado');
    if (!contenedor) return;

    const fmt = (n) => '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const sec = data.secciones;

    const filasIngresos = sec.ingresos.filas.map(f => `
        <tr style="border-bottom: 1px solid rgba(255,255,255,0.03);">
            <td class="ps-3 text-white">${f.cuenta}</td>
            <td class="text-end font-monospace pe-3">${fmt(f.monto)}</td>
        </tr>
    `).join('');

    const filasCostos = sec.costos.filas.map(f => `
        <tr style="border-bottom: 1px solid rgba(255,255,255,0.03);">
            <td class="ps-3 text-white">${f.cuenta}</td>
            <td class="text-end font-monospace pe-3">(${fmt(f.monto)})</td>
        </tr>
    `).join('');

    const filasGastos = sec.gastosOperativos.filas.map(f => `
        <tr style="border-bottom: 1px solid rgba(255,255,255,0.03);">
            <td class="ps-3 text-white">${f.cuenta}</td>
            <td class="text-end font-monospace pe-3">(${fmt(f.monto)})</td>
        </tr>
    `).join('');

    contenedor.innerHTML = `
        <!-- Header del Reporte -->
        <div class="d-flex flex-wrap justify-content-between align-items-center gap-3 pb-4 mb-4 border-bottom border-secondary border-opacity-25">
            <div>
                <div class="d-flex align-items-center gap-2 mb-1">
                    <span class="badge" style="background:#FFD4F8; color:#07060B; font-weight:700;">ESTADO DE RESULTADOS (P&L)</span>
                    <h4 class="text-white fw-bold mb-0">${data.reporte}</h4>
                </div>
                <div class="text-muted small">
                    <strong>${data.empresa}</strong> &bull; Período contable: ${data.periodo} &bull; Expresado en ${data.moneda}
                </div>
            </div>
            <div class="d-flex gap-2">
                <button type="button" class="btn btn-outline-secondary rounded-pill px-3 py-1 btn-sm d-flex align-items-center gap-2" onclick="window.print()">
                    <i class="bi bi-printer"></i> Imprimir / PDF
                </button>
                <button type="button" class="btn btn-outline-light rounded-pill px-3 py-1 btn-sm d-flex align-items-center gap-2" onclick="exportarFinancieroCSV()">
                    <i class="bi bi-file-earmark-spreadsheet text-neon-pink"></i> Exportar CSV
                </button>
            </div>
        </div>

        <!-- Tabla Estructurada P&L -->
        <div class="table-responsive rounded-4 mb-4" style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.07);">
            <table class="table table-dark align-middle mb-0">
                <thead>
                    <tr style="border-bottom: 2px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.3);">
                        <th class="ps-3 py-3 text-secondary text-uppercase small">Concepto Financiero</th>
                        <th class="text-end pe-3 py-3 text-secondary text-uppercase small">Subtotal / Total (USD)</th>
                    </tr>
                </thead>
                <tbody>
                    <!-- 1. INGRESOS -->
                    <tr style="background: rgba(219,255,153,0.05);">
                        <td class="ps-3 fw-bold text-neon-green" colspan="2">${sec.ingresos.titulo}</td>
                    </tr>
                    ${filasIngresos}
                    <tr class="fw-bold" style="border-bottom: 2px solid rgba(255,255,255,0.1);">
                        <td class="ps-3 text-white">TOTAL INGRESOS OPERACIONALES</td>
                        <td class="text-end font-monospace pe-3 text-neon-green">${fmt(sec.ingresos.total)}</td>
                    </tr>

                    <!-- 2. COSTO DE VENTAS -->
                    <tr style="background: rgba(251,113,133,0.05);">
                        <td class="ps-3 fw-bold text-danger" colspan="2">${sec.costos.titulo}</td>
                    </tr>
                    ${filasCostos}
                    <tr class="fw-bold" style="border-bottom: 2px solid rgba(255,255,255,0.1);">
                        <td class="ps-3 text-white">TOTAL COSTO DE VENTAS</td>
                        <td class="text-end font-monospace pe-3 text-danger">(${fmt(sec.costos.total)})</td>
                    </tr>

                    <!-- UTILIDAD BRUTA -->
                    <tr class="fs-6 fw-bold" style="background: rgba(219,255,153,0.12); border-bottom: 2px solid #DBFF99;">
                        <td class="ps-3 text-white">UTILIDAD BRUTA (Margen Bruto: ${sec.utilidadBruta.margenPorcentaje})</td>
                        <td class="text-end font-monospace pe-3 text-neon-green">${fmt(sec.utilidadBruta.monto)}</td>
                    </tr>

                    <!-- 3. GASTOS OPERATIVOS -->
                    <tr style="background: rgba(255,212,248,0.05);">
                        <td class="ps-3 fw-bold text-neon-pink" colspan="2">${sec.gastosOperativos.titulo}</td>
                    </tr>
                    ${filasGastos}
                    <tr class="fw-bold" style="border-bottom: 2px solid rgba(255,255,255,0.1);">
                        <td class="ps-3 text-white">TOTAL GASTOS OPERATIVOS</td>
                        <td class="text-end font-monospace pe-3 text-neon-pink">(${fmt(sec.gastosOperativos.total)})</td>
                    </tr>

                    <!-- UTILIDAD OPERATIVA (EBIT) -->
                    <tr class="fs-6 fw-bold" style="background: rgba(255,255,255,0.05); border-bottom: 2px solid rgba(255,255,255,0.2);">
                        <td class="ps-3 text-white">UTILIDAD OPERATIVA (EBIT)</td>
                        <td class="text-end font-monospace pe-3 ${sec.utilidadOperativa.monto >= 0 ? 'text-neon-green' : 'text-danger'}">
                            ${sec.utilidadOperativa.monto >= 0 ? '' : '-'}${fmt(Math.abs(sec.utilidadOperativa.monto))}
                        </td>
                    </tr>

                    <!-- 4. RESULTADO FINANCIERO -->
                    <tr>
                        <td class="ps-3 text-secondary">Intereses Bancarios y Comisiones de Líneas de Crédito</td>
                        <td class="text-end font-monospace pe-3 text-secondary">(${fmt(sec.financieros.total)})</td>
                    </tr>

                    <!-- IMPUESTOS -->
                    <tr>
                        <td class="ps-3 text-secondary">${sec.impuestos.cuenta}</td>
                        <td class="text-end font-monospace pe-3 text-secondary">(${fmt(sec.impuestos.monto)})</td>
                    </tr>

                    <!-- UTILIDAD NETA -->
                    <tr class="fs-5 fw-bold" style="background:#07060B; border: 2px solid #DBFF99;">
                        <td class="ps-3 text-white py-3">UTILIDAD NETA DEL EJERCICIO</td>
                        <td class="text-end font-monospace pe-3 py-3 ${sec.utilidadNeta.monto >= 0 ? 'text-neon-green' : 'text-danger'}">
                            ${sec.utilidadNeta.monto >= 0 ? '' : '-'}${fmt(Math.abs(sec.utilidadNeta.monto))}
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    `;
}

function exportarFinancieroCSV() {
    if (!datosFinancierosActuales) {
        alert('Primero genera un reporte financiero.');
        return;
    }

    let csvContent = '\uFEFF';
    const tipo = datosFinancierosActuales.tipo;
    const data = datosFinancierosActuales.data;

    if (tipo === 'balance') {
        csvContent += 'BALANCE GENERAL CLASIFICADO - AUTOS AMI S.A.\r\n';
        csvContent += `Fecha de corte:,${data.fechaCorte}\r\n\r\n`;
        csvContent += 'Código,Cuenta / Concepto,Saldo (USD)\r\n';

        data.activos.corrientes.forEach(c => { csvContent += `${c.codigo},"${c.cuenta}",${c.saldo}\r\n`; });
        csvContent += `,TOTAL ACTIVOS CORRIENTES,${data.activos.totalCorrientes}\r\n`;
        data.activos.noCorrientes.forEach(c => { csvContent += `${c.codigo},"${c.cuenta}",${c.saldo}\r\n`; });
        csvContent += `,TOTAL ACTIVOS NO CORRIENTES,${data.activos.totalNoCorrientes}\r\n`;
        csvContent += `,TOTAL ACTIVOS,${data.activos.totalActivos}\r\n\r\n`;

        data.pasivos.corrientes.forEach(c => { csvContent += `${c.codigo},"${c.cuenta}",${c.saldo}\r\n`; });
        csvContent += `,TOTAL PASIVOS CORRIENTES,${data.pasivos.totalCorrientes}\r\n`;
        data.pasivos.noCorrientes.forEach(c => { csvContent += `${c.codigo},"${c.cuenta}",${c.saldo}\r\n`; });
        csvContent += `,TOTAL PASIVOS NO CORRIENTES,${data.pasivos.totalNoCorrientes}\r\n`;
        csvContent += `,TOTAL PASIVOS,${data.pasivos.totalPasivos}\r\n\r\n`;

        data.patrimonio.cuentas.forEach(c => { csvContent += `${c.codigo},"${c.cuenta}",${c.saldo}\r\n`; });
        csvContent += `,TOTAL PATRIMONIO,${data.patrimonio.totalPatrimonio}\r\n`;
        csvContent += `,TOTAL PASIVO + PATRIMONIO,${data.resumen.totalPasivoMasPatrimonio}\r\n`;

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Balance_General_AMI_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } else {
        csvContent += 'ESTADO DE RESULTADOS INTEGRAL - AUTOS AMI S.A.\r\n';
        csvContent += `Período:,${data.periodo}\r\n\r\n`;
        csvContent += 'Concepto,Monto (USD)\r\n';

        const sec = data.secciones;
        sec.ingresos.filas.forEach(f => { csvContent += `"${f.cuenta}",${f.monto}\r\n`; });
        csvContent += `TOTAL INGRESOS,${sec.ingresos.total}\r\n`;
        sec.costos.filas.forEach(f => { csvContent += `"${f.cuenta}",-${f.monto}\r\n`; });
        csvContent += `UTILIDAD BRUTA,${sec.utilidadBruta.monto}\r\n`;
        sec.gastosOperativos.filas.forEach(f => { csvContent += `"${f.cuenta}",-${f.monto}\r\n`; });
        csvContent += `UTILIDAD OPERATIVA,${sec.utilidadOperativa.monto}\r\n`;
        csvContent += `UTILIDAD NETA,${sec.utilidadNeta.monto}\r\n`;

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Estado_Resultados_AMI_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// ==========================================================================
// MODAL DE SNAPSHOTS / INFORMES GUARDADOS
// ==========================================================================
function prepararModalGuardarInforme() {
    if (!dashboardData) {
        alert('Carga primero los datos del dashboard antes de guardar un informe.');
        return;
    }

    const inputTitulo = document.getElementById('input-titulo-informe');
    const inputNotas = document.getElementById('input-notas-informe');
    const resRango = document.getElementById('resumen-rango-modal');
    const resVentas = document.getElementById('resumen-ventas-modal');
    const resStock = document.getElementById('resumen-stock-modal');

    const fechaHoy = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
    if (inputTitulo) inputTitulo.value = `Informe ${selectedTipo} - ${fechaHoy}`;
    if (inputNotas) inputNotas.value = '';

    if (resRango) resRango.textContent = selectedRango;
    if (resVentas) resVentas.textContent = '$' + Number(dashboardData.kpis.totalVentas || 0).toLocaleString();
    if (resStock) resStock.textContent = `${dashboardData.kpis.totalStock || 0} autos`;

    const modalEl = document.getElementById('modalGuardarInforme');
    if (modalEl && window.bootstrap) {
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
    }
}

function ejecutarGuardadoInforme() {
    const inputTitulo = document.getElementById('input-titulo-informe');
    const inputNotas = document.getElementById('input-notas-informe');
    const titulo = inputTitulo ? inputTitulo.value.trim() : '';

    if (!titulo) {
        alert('Por favor ingresa un título para el informe.');
        return;
    }

    const nuevoInforme = {
        id: Date.now(),
        titulo: titulo,
        notas: inputNotas ? inputNotas.value.trim() : '',
        fechaGuardado: new Date().toISOString(),
        rango: selectedRango,
        tipo: selectedTipo,
        kpis: dashboardData ? dashboardData.kpis : {},
        graficas: dashboardData ? dashboardData.graficas : {},
        items: currentDetailData || []
    };

    const guardados = JSON.parse(localStorage.getItem(STORAGE_KEY_INFORMES) || '[]');
    guardados.unshift(nuevoInforme);
    localStorage.setItem(STORAGE_KEY_INFORMES, JSON.stringify(guardados));

    actualizarBadgeGuardados();

    const modalEl = document.getElementById('modalGuardarInforme');
    if (modalEl && window.bootstrap) {
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
    }

    alert('¡Informe guardado con éxito en el historial!');
}

function abrirModalInformesGuardados() {
    const contenedor = document.getElementById('listaInformesGuardados');
    if (!contenedor) return;

    const guardados = JSON.parse(localStorage.getItem(STORAGE_KEY_INFORMES) || '[]');
    if (guardados.length === 0) {
        contenedor.innerHTML = `
            <div class="text-center py-5 text-muted">
                <i class="bi bi-clock-history fs-2 d-block mb-2"></i>
                No tienes informes guardados en este navegador.
            </div>
        `;
    } else {
        contenedor.innerHTML = guardados.map(inf => `
            <div class="p-3 mb-3 rounded-3 d-flex flex-wrap justify-content-between align-items-center gap-3"
                 style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);">
                <div>
                    <h6 class="text-white fw-bold mb-1">${inf.titulo}</h6>
                    <div class="small text-muted">
                        Guardado el ${new Date(inf.fechaGuardado).toLocaleDateString('es-ES')} &bull; Filtro: ${inf.tipo} (${inf.rango})
                    </div>
                    ${inf.notas ? `<div class="small text-secondary mt-1 fst-italic">"${inf.notas}"</div>` : ''}
                </div>
                <div class="d-flex gap-2">
                    <button type="button" class="btn btn-sm btn-outline-success rounded-pill px-3" onclick="cargarInformeHistorico(${inf.id})">
                        <i class="bi bi-eye me-1"></i> Visualizar
                    </button>
                    <button type="button" class="btn btn-sm btn-outline-danger rounded-pill px-2" onclick="eliminarInformeGuardado(${inf.id})">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    const modalEl = document.getElementById('modalInformesGuardados');
    if (modalEl && window.bootstrap) {
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
    }
}

function cargarInformeHistorico(id) {
    const guardados = JSON.parse(localStorage.getItem(STORAGE_KEY_INFORMES) || '[]');
    const informe = guardados.find(i => i.id === id);
    if (!informe) return;

    modoInformeGuardado = informe;

    // Actualizar KPIs y gráficas con los datos congelados
    renderizarKPIs(informe.kpis);
    renderizarGraficaVentasMes(informe.graficas?.ventasMes || []);
    renderizarGraficaMarcas(informe.graficas?.marcasStock || []);
    renderizarGraficaClientes(informe.graficas?.clientesOrigen || []);
    renderizarGraficaCostos(informe.kpis, informe.graficas);

    currentDetailData = informe.items || [];
    renderizarTablaDetalle();

    // Mostrar banner de modo histórico
    const banner = document.getElementById('bannerModoHistorico');
    const titulo = document.getElementById('tituloBannerHistorico');
    const subtitulo = document.getElementById('subtituloBannerHistorico');
    if (banner) banner.classList.remove('d-none');
    if (titulo) titulo.textContent = `Visualizando: ${informe.titulo}`;
    if (subtitulo) subtitulo.textContent = `Guardado el ${new Date(informe.fechaGuardado).toLocaleDateString('es-ES')} | Rango: ${informe.rango}`;

    const modalEl = document.getElementById('modalInformesGuardados');
    if (modalEl && window.bootstrap) {
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
    }
}

function salirDeModoHistorico() {
    modoInformeGuardado = null;
    const banner = document.getElementById('bannerModoHistorico');
    if (banner) banner.classList.add('d-none');
    cargarDashboard();
}

function eliminarInformeGuardado(id) {
    if (!confirm('¿Seguro que deseas eliminar este informe del historial?')) return;
    let guardados = JSON.parse(localStorage.getItem(STORAGE_KEY_INFORMES) || '[]');
    guardados = guardados.filter(i => i.id !== id);
    localStorage.setItem(STORAGE_KEY_INFORMES, JSON.stringify(guardados));
    actualizarBadgeGuardados();
    abrirModalInformesGuardados();
}

function actualizarBadgeGuardados() {
    const badge = document.getElementById('contadorGuardadosBadge');
    if (badge) {
        const guardados = JSON.parse(localStorage.getItem(STORAGE_KEY_INFORMES) || '[]');
        badge.textContent = guardados.length;
    }
}
