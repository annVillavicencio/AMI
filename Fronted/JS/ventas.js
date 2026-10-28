// ==========================================================================
// AMI - Módulo de Ventas, Facturación Legal y Apartado Fiscal DGI
// Gestión integral de ventas de vehículos, emisión de facturas autorizadas por
// la DGI, retenciones de ley (Ley 822), libro de ventas fiscales y reportes.
// ==========================================================================

let ventasData = [];
let facturasData = [];
let dgiData = null;
let clientesLista = [];
let autosLista = [];
let ventasPendientesFactura = [];
let vendedoresLista = [];
let ventaEnEdicion = null;

const TIPO_CAMBIO_BCN_DEFAULT = 36.6243;

document.addEventListener("DOMContentLoaded", () => {
    cargarDatos();
    cargarFacturas();
    cargarApartadoDGI();
    cargarVendedoresYPendientes();

    // 1. Buscador en tiempo real de ventas
    const searchInput = document.getElementById('input-busqueda-venta') || document.querySelector('input[placeholder*="Buscar"]');
    if (searchInput) {
        searchInput.addEventListener('input', () => { renderizarTabla(); });
        searchInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') renderizarTabla();
        });
    }

    // 2. Filtro por Forma de Pago
    const filtroPago = document.getElementById('filtro-pago-venta');
    if (filtroPago) {
        filtroPago.addEventListener('change', () => { renderizarTabla(); });
    }

    // 3. Botón y formulario para Guardar Venta
    const btnGuardar = document.getElementById('btn-guardar-venta');
    if (btnGuardar) {
        btnGuardar.addEventListener('click', guardarVenta);
    }

    const formVenta = document.getElementById('formVenta');
    if (formVenta) {
        formVenta.addEventListener('submit', (e) => {
            e.preventDefault();
            guardarVenta();
        });
    }

    // 4. Cuando se selecciona un auto en el modal de venta, autocompletar el precio
    const selAuto = document.getElementById('venta-auto');
    if (selAuto) {
        selAuto.addEventListener('change', (e) => {
            const selectedId = parseInt(e.target.value);
            const autoObj = autosLista.find(a => a.idAuto === selectedId);
            const totalInput = document.getElementById('venta-total');
            if (autoObj && totalInput && !totalInput.value) {
                totalInput.value = autoObj.Precio || '';
            }
        });
    }

    // 5. Limpieza del modal de venta al cerrarse
    const modalEl = document.getElementById('modalVenta');
    if (modalEl) {
        modalEl.addEventListener('hidden.bs.modal', () => {
            limpiarFormularioVenta();
        });
    }

    // 6. Configurar eventos interactivos del Modal de Generar Factura
    configurarEventosModalFactura();

    const modalDgiEl = document.getElementById('modalApartadoDGI');
    if (modalDgiEl) {
        modalDgiEl.addEventListener('show.bs.modal', () => {
            cargarApartadoDGI();
        });
    }

    const modalHistEl = document.getElementById('modalHistorialFacturas');
    if (modalHistEl) {
        modalHistEl.addEventListener('show.bs.modal', () => {
            cargarFacturas();
        });
    }
});

// --------------------------------------------------------------------------
// CARGA INICIAL DE DATOS
// --------------------------------------------------------------------------

async function cargarDatos() {
    try {
        const [resVentas, resClientes, resAutos] = await Promise.all([
            fetch('/api/ventas'),
            fetch('/api/ventas/clientes'),
            fetch('/api/ventas/autos')
        ]);

        if (resVentas.ok) ventasData = await resVentas.json();
        if (resClientes.ok) clientesLista = await resClientes.json();
        if (resAutos.ok) autosLista = await resAutos.json();

        poblarSelectClientes();
        poblarSelectAutos();
        renderizarTabla();
    } catch (err) {
        console.error("Error al cargar datos del módulo de ventas:", err);
        const tbody = document.getElementById("cuerpo-tabla");
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center text-danger py-4"><i class="bi bi-exclamation-triangle me-2"></i>Error al conectar con el servidor.</td></tr>';
        }
    }
}

// Cargar facturas emitidas para la pestaña 2
async function cargarFacturas() {
    try {
        const res = await fetch('/api/facturas');
        if (res.ok) {
            facturasData = await res.json();
            const badgeTotal = document.getElementById('badge-total-facturas');
            if (badgeTotal) badgeTotal.textContent = facturasData.length;
            renderizarTablaFacturas();
        }
    } catch (err) {
        console.error("Error al cargar facturas:", err);
    }
}

// Cargar Apartado Fiscal DGI para la pestaña 3
async function cargarApartadoDGI() {
    try {
        const res = await fetch('/api/facturas/dgi/resumen');
        if (res.ok) {
            dgiData = await res.json();
            renderizarApartadoDGI();
        }
    } catch (err) {
        console.error("Error al cargar apartado DGI:", err);
    }
}

// Cargar datos auxiliares para el modal de facturación
async function cargarVendedoresYPendientes() {
    try {
        const [resPend, resVend] = await Promise.all([
            fetch('/api/facturas/ventas-pendientes'),
            fetch('/api/facturas/vendedores')
        ]);

        if (resPend.ok) {
            ventasPendientesFactura = await resPend.json();
            poblarSelectVentasPendientes();
        }

        if (resVend.ok) {
            vendedoresLista = await resVend.json();
            poblarSelectVendedores();
        }
    } catch (err) {
        console.error("Error al cargar vendedores y pendientes:", err);
    }
}

function poblarSelectClientes() {
    const sel = document.getElementById("venta-cliente");
    if (!sel) return;
    sel.innerHTML = '<option value="">Selecciona un cliente...</option>';
    clientesLista.forEach(c => {
        const opt = document.createElement("option");
        opt.value = c.IdClientes;
        opt.textContent = `${c.NombreCompleto} (${c.Cedula || 'Sin cédula'})`;
        sel.appendChild(opt);
    });
}

function poblarSelectAutos() {
    const sel = document.getElementById("venta-auto");
    if (!sel) return;
    sel.innerHTML = '<option value="">Selecciona un auto...</option>';
    autosLista.forEach(a => {
        const opt = document.createElement("option");
        opt.value = a.idAuto;
        opt.textContent = `${a.Auto} - C$ ${parseFloat(a.Precio || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
        sel.appendChild(opt);
    });
}

function poblarSelectVentasPendientes() {
    const sel = document.getElementById("ventaFactura");
    if (!sel) return;
    sel.innerHTML = '<option value="">Selecciona una venta pendiente...</option>';
    if (ventasPendientesFactura.length === 0) {
        sel.innerHTML = '<option value="">No hay ventas pendientes de facturar</option>';
        return;
    }
    ventasPendientesFactura.forEach(v => {
        const opt = document.createElement("option");
        opt.value = v.idVenta;
        const montoFmt = parseFloat(v.TotalVenta || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });
        opt.textContent = `Venta #${v.idVenta} - ${v.NombreCliente} | ${v.Vehiculo || 'Auto'} ($ ${montoFmt})`;
        sel.appendChild(opt);
    });
}

function poblarSelectVendedores() {
    const sel = document.getElementById("facturaVendedor");
    if (!sel) return;
    sel.innerHTML = '<option value="">Selecciona el vendedor responsable...</option>';
    vendedoresLista.forEach(vend => {
        const opt = document.createElement("option");
        opt.value = vend.IdEmpleado;
        opt.textContent = `${vend.NombreCompleto} (${vend.CodigoEmpleado} - ${vend.NombreCargo})`;
        sel.appendChild(opt);
    });
}

// --------------------------------------------------------------------------
// RENDERIZADO: TABLA DE VENTAS
// --------------------------------------------------------------------------

function renderizarTabla() {
    const tbody = document.getElementById("cuerpo-tabla");
    if (!tbody) return;
    tbody.innerHTML = "";

    const searchInput = document.getElementById('input-busqueda-venta') || document.querySelector('input[placeholder*="Buscar"]');
    const busqueda = searchInput ? searchInput.value.trim().toLowerCase() : '';

    const filtroPago = document.getElementById('filtro-pago-venta');
    const pagoFiltro = filtroPago ? filtroPago.value.trim().toLowerCase() : 'todos';

    const filtrados = ventasData.filter(v => {
        const id = v.idVenta ? String(v.idVenta) : "";
        const cliente = (v.Cliente || '').toLowerCase();
        const auto = (v.Vehiculo || '').toLowerCase();
        const pago = (v.FormaPago || '').toLowerCase();
        const monto = v.Monto ? String(v.Monto) : '';

        const coincideBusqueda = !busqueda ||
            id.includes(busqueda) ||
            cliente.includes(busqueda) ||
            auto.includes(busqueda) ||
            pago.includes(busqueda) ||
            monto.includes(busqueda);

        const coincidePago = (pagoFiltro === 'todas las formas de pago' || pagoFiltro === 'todos' || !pagoFiltro) ||
            pago === pagoFiltro;

        return coincideBusqueda && coincidePago;
    });

    actualizarKPIsPrincipales(filtrados);

    if (filtrados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4"><i class="bi bi-inbox fs-4 d-block mb-1"></i> No se encontraron ventas registradas.</td></tr>';
        return;
    }

    filtrados.forEach(v => {
        const tr = document.createElement("tr");
        tr.style.borderBottom = '1px solid rgba(255,255,255,0.05)';

        const fecha = v.FechaVenta ? new Date(v.FechaVenta).toISOString().split('T')[0] : 'N/A';
        const montoNum = parseFloat(v.Monto || 0);
        const montoFormateado = montoNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        let badgeClass = 'badge-activa';
        const estLower = (v.EstadoVenta || '').toLowerCase();
        if (estLower.includes('pendiente')) badgeClass = 'badge-programada';
        else if (estLower.includes('cancel')) badgeClass = 'badge-finalizada';

        // Indicador de factura
        let facturaBadgeHtml = '';
        if (v.idFactura) {
            facturaBadgeHtml = `<div class="mt-1"><span class="badge bg-success bg-opacity-25 text-neon-green border border-success border-opacity-50 small cursor-pointer" onclick="abrirModalVerFactura(${v.idFactura})" title="Ver factura emitida"><i class="bi bi-receipt me-1"></i>${v.NumeroFactura}</span></div>`;
        }

        tr.innerHTML = `
            <td class="text-center fw-bold text-neon-green">
                #${v.idVenta}
                ${facturaBadgeHtml}
            </td>
            <td class="text-center text-white fw-bold">${v.Cliente || 'Desconocido'}</td>
            <td class="text-center text-secondary small text-truncate" style="max-width: 180px;" title="${v.Vehiculo || ''}">${v.Vehiculo || 'No asignado'}</td>
            <td class="text-center text-success fw-bold">$ ${montoFormateado}</td>
            <td class="text-center text-secondary">${fecha}</td>
            <td class="text-center"><span class="badge bg-dark border border-secondary px-2 py-1">${v.FormaPago || 'Efectivo'}</span></td>
            <td class="text-center"><span class="badge ${badgeClass} rounded-pill px-3 py-1">${v.EstadoVenta || 'Finalizada'}</span></td>
            <td class="text-center">
                <div class="dropdown">
                    <button class="btn btn-link text-secondary p-0 border-0" type="button" data-bs-toggle="dropdown" aria-expanded="false" title="Acciones">
                        <i class="bi bi-three-dots-vertical fs-5"></i>
                    </button>
                    <ul class="dropdown-menu dropdown-menu-dark dropdown-menu-end shadow" style="background-color: #1A2218; border: 1px solid rgba(255,255,255,0.1);">
                        ${v.idFactura ? `
                            <li>
                                <a class="dropdown-item text-neon-green py-2" href="javascript:void(0)" onclick="abrirModalVerFactura(${v.idFactura})">
                                    <i class="bi bi-file-earmark-pdf me-2 text-neon-green"></i> Ver Factura DGI
                                </a>
                            </li>
                        ` : `
                            <li>
                                <a class="dropdown-item text-info py-2" href="javascript:void(0)" onclick="abrirModalEmitirFactura(${v.idVenta})">
                                    <i class="bi bi-receipt me-2 text-info"></i> Emitir Factura DGI
                                </a>
                            </li>
                        `}
                        <li><hr class="dropdown-divider border-secondary opacity-25 my-1"></li>
                        <li>
                            <a class="dropdown-item text-white py-2" href="javascript:void(0)" onclick="abrirModalEditarVenta(${v.idVenta})">
                                <i class="bi bi-pencil-square me-2" style="color: #DBFF99;"></i> Editar
                            </a>
                        </li>
                        <li>
                            <a class="dropdown-item text-danger py-2" href="javascript:void(0)" onclick="eliminarVenta(${v.idVenta})">
                                <i class="bi bi-trash me-2"></i> Eliminar
                            </a>
                        </li>
                    </ul>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// --------------------------------------------------------------------------
// RENDERIZADO: TABLA DE FACTURAS EMITIDAS (PESTAÑA 2)
// --------------------------------------------------------------------------

function renderizarTablaFacturas() {
    const tbody = document.getElementById("cuerpo-tabla-facturas");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (facturasData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" class="text-center text-muted py-4"><i class="bi bi-inbox fs-4 d-block mb-1"></i> No se han emitido facturas aún. Haz clic en "Nueva Factura" para generar una.</td></tr>';
        return;
    }

    facturasData.forEach(f => {
        const tr = document.createElement("tr");
        tr.style.borderBottom = '1px solid rgba(255,255,255,0.05)';

        const fechaFmt = f.FechaEmision ? new Date(f.FechaEmision).toISOString().split('T')[0] : 'N/A';
        const totalUsdFmt = parseFloat(f.TotalPagar || f.Total || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const totalNioFmt = parseFloat(f.TotalCordobas || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        const isAnulada = f.EstadoFactura === 'Anulada';
        const badgeEstado = isAnulada
            ? '<span class="badge bg-danger bg-opacity-25 text-danger border border-danger">Anulada</span>'
            : '<span class="badge bg-success bg-opacity-25 text-neon-green border border-success">Emitida</span>';

        tr.innerHTML = `
            <td class="fw-bold ${isAnulada ? 'text-decoration-line-through text-muted' : 'text-neon-green'}">
                <i class="bi bi-receipt me-1"></i>${f.NumeroFactura}
            </td>
            <td class="text-secondary small">${fechaFmt}</td>
            <td>
                <div class="text-white fw-bold">${f.NombreCliente}</div>
                <div class="text-secondary small">${f.IdentificacionCliente || 'Sin cédula'}</div>
            </td>
            <td>
                <div class="text-white">${f.NombreMarca || ''} ${f.NombreModelo || 'Automotor'}</div>
                <div class="text-neon-pink small font-monospace">${f.VIN || 'Chasis N/D'}</div>
            </td>
            <td class="text-secondary small">${f.NombreVendedor || 'Vendedor'}</td>
            <td><span class="badge bg-dark border border-secondary">${f.CondicionVenta || 'Contado'}</span></td>
            <td class="text-success fw-bold">$ ${totalUsdFmt}</td>
            <td class="text-white small">C$ ${totalNioFmt}</td>
            <td>${badgeEstado}</td>
            <td class="text-center">
                <button class="btn btn-sm btn-outline-success rounded-pill px-3 me-1" onclick="abrirModalVerFactura(${f.idFactura})" title="Ver / Imprimir Factura">
                    <i class="bi bi-printer me-1"></i> Ver
                </button>
                ${!isAnulada ? `
                    <button class="btn btn-sm btn-outline-danger rounded-pill px-2" onclick="anularFactura(${f.idFactura})" title="Anular Factura">
                        <i class="bi bi-x-circle"></i>
                    </button>
                ` : ''}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// --------------------------------------------------------------------------
// RENDERIZADO: APARTADO FISCAL DGI (PESTAÑA 3)
// --------------------------------------------------------------------------

function renderizarApartadoDGI() {
    if (!dgiData || !dgiData.kpis) return;
    const { kpis, libroVentasFiscales } = dgiData;

    // Actualizar KPIs de tarjetas
    const elGravado = document.getElementById('dgi-kpi-gravado');
    const elGravadoNio = document.getElementById('dgi-kpi-gravado-nio');
    if (elGravado) elGravado.textContent = `$ ${(kpis.subtotalGravadoUSD || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    if (elGravadoNio) elGravadoNio.textContent = `C$ ${((kpis.subtotalGravadoUSD || 0) * kpis.tipoCambioOficialBCN).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

    const elIva = document.getElementById('dgi-kpi-iva');
    const elIvaNio = document.getElementById('dgi-kpi-iva-nio');
    if (elIva) elIva.textContent = `$ ${(kpis.iva15RecaudadoUSD || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    if (elIvaNio) elIvaNio.textContent = `C$ ${((kpis.iva15RecaudadoUSD || 0) * kpis.tipoCambioOficialBCN).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

    const elRetDgi = document.getElementById('dgi-kpi-ret-dgi');
    const elRetDgiNio = document.getElementById('dgi-kpi-ret-dgi-nio');
    if (elRetDgi) elRetDgi.textContent = `$ ${(kpis.retencionDgi2USD || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    if (elRetDgiNio) elRetDgiNio.textContent = `C$ ${((kpis.retencionDgi2USD || 0) * kpis.tipoCambioOficialBCN).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

    const elRetAlc = document.getElementById('dgi-kpi-ret-alcaldia');
    const elRetAlcNio = document.getElementById('dgi-kpi-ret-alcaldia-nio');
    if (elRetAlc) elRetAlc.textContent = `$ ${(kpis.retencionAlcaldia1USD || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    if (elRetAlcNio) elRetAlcNio.textContent = `C$ ${((kpis.retencionAlcaldia1USD || 0) * kpis.tipoCambioOficialBCN).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

    // Renderizar tabla Libro de Ventas Fiscales
    const tbody = document.getElementById("cuerpo-tabla-dgi");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (!libroVentasFiscales || libroVentasFiscales.length === 0) {
        tbody.innerHTML = '<tr><td colspan="12" class="text-center text-muted py-4">No hay registros fiscales en el Libro de Ventas DGI.</td></tr>';
        return;
    }

    libroVentasFiscales.forEach(f => {
        const tr = document.createElement("tr");
        tr.style.borderBottom = '1px solid rgba(255,255,255,0.05)';

        const isAnulada = f.EstadoFactura === 'Anulada';
        const fechaFmt = f.FechaEmision ? new Date(f.FechaEmision).toISOString().split('T')[0] : 'N/A';
        const gravFmt = parseFloat(f.SubtotalGravado || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });
        const ivaFmt = parseFloat(f.MontoIVA || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });
        const retDgiFmt = parseFloat(f.RetencionDGI || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });
        const retAlcFmt = parseFloat(f.RetencionAlcaldia || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });
        const totalUsdFmt = parseFloat(f.TotalPagar || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });
        const totalNioFmt = parseFloat(f.TotalCordobas || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });

        tr.innerHTML = `
            <td class="fw-bold ${isAnulada ? 'text-decoration-line-through text-muted' : 'text-neon-green'}">${f.NumeroFactura}</td>
            <td class="text-secondary small">${fechaFmt}</td>
            <td class="text-neon-pink font-monospace small">${f.IdentificacionCliente || 'N/D'}</td>
            <td class="text-white fw-semibold small">${f.NombreCliente}</td>
            <td class="text-secondary small font-monospace">${f.NumeroAutorizacionDGI || 'DGI-RES-2026-98432'}</td>
            <td class="text-end text-white">$ ${gravFmt}</td>
            <td class="text-end text-neon-green">$ ${ivaFmt}</td>
            <td class="text-end text-warning">-$ ${retDgiFmt}</td>
            <td class="text-end text-info">-$ ${retAlcFmt}</td>
            <td class="text-end fw-bold text-success">$ ${totalUsdFmt}</td>
            <td class="text-end text-warning fw-bold small">C$ ${totalNioFmt}</td>
            <td class="text-center">
                ${isAnulada ? '<span class="badge bg-danger bg-opacity-25 text-danger">Anulada</span>' : '<span class="badge bg-success bg-opacity-25 text-neon-green">Declarada</span>'}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// --------------------------------------------------------------------------
// EXPORTAR LIBRO DE VENTAS DGI A EXCEL
// --------------------------------------------------------------------------

function exportarLibroVentasDGIExcel() {
    if (!dgiData || !dgiData.libroVentasFiscales || dgiData.libroVentasFiscales.length === 0) {
        alert("No hay facturas fiscales en el libro de ventas para exportar.");
        return;
    }

    if (typeof XLSX === 'undefined') {
        alert("La librería de exportación Excel no está disponible.");
        return;
    }

    const { kpis, libroVentasFiscales } = dgiData;

    // Encabezado oficial DGI
    const datosExcel = [
        ["DIRECCIÓN GENERAL DE INGRESOS (DGI) - REPÚBLICA DE NICARAGUA"],
        ["LIBRO OFICIAL DE VENTAS FISCALES Y RETENCIONES EN LA FUENTE (LEY 822)"],
        [`CONTRIBUYENTE: ${kpis.razonSocial} | RUC: ${kpis.rucEmisor}`],
        [`RESOLUCIÓN FISCAL: ${kpis.resolucionDGI} | SERIE: ${kpis.serieFiscal} | TASA OFICIAL BCN: C$ ${kpis.tipoCambioOficialBCN}`],
        [`FECHA DE GENERACIÓN: ${new Date().toLocaleDateString('es-NI')} | ESTADO: VIGENTE`],
        [], // Fila en blanco
        [
            "Nº Factura",
            "Fecha Emisión",
            "Tipo Cliente",
            "RUC / Cédula Cliente",
            "Razón Social / Cliente",
            "Nº Autorización DGI",
            "Serie",
            "VIN / Chasis",
            "Condición",
            "Base Gravada (USD)",
            "IVA 15% (USD)",
            "Ret. DGI 2% (USD)",
            "Ret. Alcaldía 1% (USD)",
            "Total a Pagar (USD)",
            "Total en Córdobas (C$)",
            "Estado Fiscal"
        ]
    ];

    libroVentasFiscales.forEach(f => {
        datosExcel.push([
            f.NumeroFactura,
            f.FechaEmision ? new Date(f.FechaEmision).toISOString().split('T')[0] : '',
            f.TipoCliente || 'Natural',
            f.IdentificacionCliente || 'N/D',
            f.NombreCliente,
            f.NumeroAutorizacionDGI,
            f.SerieFactura,
            f.VIN || '',
            f.CondicionVenta || 'Contado',
            parseFloat(f.SubtotalGravado || 0),
            parseFloat(f.MontoIVA || 0),
            parseFloat(f.RetencionDGI || 0),
            parseFloat(f.RetencionAlcaldia || 0),
            parseFloat(f.TotalPagar || 0),
            parseFloat(f.TotalCordobas || 0),
            f.EstadoFactura
        ]);
    });

    // Fila de totales
    datosExcel.push([]);
    datosExcel.push([
        "TOTALES FISCALES", "", "", "", "", "", "", "", "",
        kpis.subtotalGravadoUSD,
        kpis.iva15RecaudadoUSD,
        kpis.retencionDgi2USD,
        kpis.retencionAlcaldia1USD,
        kpis.totalPagarUSD,
        kpis.totalPagarCordobas,
        `${kpis.totalFacturasEmitidas} Facturas`
    ]);

    const ws = XLSX.utils.aoa_to_sheet(datosExcel);

    // Ajustar anchos de columnas
    ws['!cols'] = [
        { wch: 15 }, { wch: 12 }, { wch: 18 }, { wch: 25 }, { wch: 20 },
        { wch: 8 }, { wch: 20 }, { wch: 12 }, { wch: 18 }, { wch: 15 },
        { wch: 15 }, { wch: 18 }, { wch: 18 }, { wch: 22 }, { wch: 14 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Libro_Ventas_DGI");

    const fechaHoy = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `Autos_AMI_Libro_Ventas_Fiscales_DGI_${fechaHoy}.xlsx`);
}

// --------------------------------------------------------------------------
// LÓGICA INTERACTIVA DEL MODAL DE EMISIÓN DE FACTURA
// --------------------------------------------------------------------------

function configurarEventosModalFactura() {
    const selVenta = document.getElementById('ventaFactura');
    const chkRetDGI = document.getElementById('chkRetencionDGI');
    const chkRetAlc = document.getElementById('chkRetencionAlcaldia');
    const selCond = document.getElementById('facturaCondicion');
    const selMoneda = document.getElementById('facturaMoneda');
    const formFactura = document.getElementById('formGenerarFactura');
    const rdNat = document.getElementById('rdClienteNatural');
    const rdJur = document.getElementById('rdClienteJuridico');

    if (selVenta) {
        selVenta.addEventListener('change', () => {
            const idV = parseInt(selVenta.value);
            const vObj = ventasPendientesFactura.find(v => v.idVenta === idV);
            const infoBox = document.getElementById('bloqueInfoVenta');
            const bloqueTipo = document.getElementById('bloqueTipoCliente');

            if (vObj && infoBox) {
                infoBox.style.display = 'block';
                document.getElementById('lblClienteNombre').textContent = vObj.NombreCliente || '-';
                document.getElementById('lblClienteId').textContent = vObj.IdentificacionCliente || '-';
                document.getElementById('lblAutoNombre').textContent = vObj.Vehiculo || '-';
                document.getElementById('lblAutoVIN').textContent = vObj.VIN || '3N1AB7AP9KY104829';
                document.getElementById('lblAutoPlaca').textContent = vObj.Placa || 'S/P';

                // Clasificación tributaria automática (Nicaragua - Ley 822)
                const idCli = (vObj.IdentificacionCliente || '').trim().toUpperCase();
                const esJuridica = idCli.startsWith('J');

                if (bloqueTipo) bloqueTipo.style.display = 'block';

                if (esJuridica) {
                    if (rdJur) rdJur.checked = true;
                    aplicarConfiguracionTipoCliente('Jurídica');
                } else {
                    if (rdNat) rdNat.checked = true;
                    aplicarConfiguracionTipoCliente('Natural');
                }

                // Preseleccionar vendedor si la venta lo tenía
                if (vObj.IdEmpleado) {
                    const selVend = document.getElementById('facturaVendedor');
                    if (selVend) selVend.value = String(vObj.IdEmpleado);
                }
            } else {
                if (infoBox) infoBox.style.display = 'none';
                if (bloqueTipo) bloqueTipo.style.display = 'none';
            }

            actualizarCalculosPreviosFactura();
        });
    }

    if (rdNat) {
        rdNat.addEventListener('change', () => {
            if (rdNat.checked) {
                aplicarConfiguracionTipoCliente('Natural');
                actualizarCalculosPreviosFactura();
            }
        });
    }

    if (rdJur) {
        rdJur.addEventListener('change', () => {
            if (rdJur.checked) {
                aplicarConfiguracionTipoCliente('Jurídica');
                actualizarCalculosPreviosFactura();
            }
        });
    }

    if (selCond) {
        selCond.addEventListener('change', () => {
            const grupoPlazo = document.getElementById('grupoPlazo');
            if (grupoPlazo) {
                grupoPlazo.style.display = selCond.value === 'Crédito' ? 'block' : 'none';
            }
        });
    }

    if (chkRetDGI) chkRetDGI.addEventListener('change', actualizarCalculosPreviosFactura);
    if (chkRetAlc) chkRetAlc.addEventListener('change', actualizarCalculosPreviosFactura);
    if (selMoneda) selMoneda.addEventListener('change', actualizarCalculosPreviosFactura);

    if (formFactura) {
        formFactura.addEventListener('submit', emitirFactura);
    }
}

function aplicarConfiguracionTipoCliente(tipo) {
    const chkRetDGI = document.getElementById('chkRetencionDGI');
    const chkRetAlc = document.getElementById('chkRetencionAlcaldia');
    const badge = document.getElementById('badgeTipoClienteDetectado');
    const txtInfo = document.getElementById('textoRegimenFiscal');

    if (tipo === 'Jurídica') {
        if (badge) {
            badge.className = 'badge bg-warning bg-opacity-25 text-warning px-2 py-1';
            badge.textContent = 'Persona Jurídica (Agente Retenedor)';
        }
        if (txtInfo) {
            txtInfo.textContent = 'Empresa con RUC: Actúa como agente retenedor fiscal. Aplica 2% DGI (IR a cuenta - Ley 822) y 1% Alcaldía previa entrega de constancia de retención.';
        }
        if (chkRetDGI) {
            chkRetDGI.disabled = false;
            chkRetDGI.checked = true;
        }
        if (chkRetAlc) {
            chkRetAlc.disabled = false;
            chkRetAlc.checked = true;
        }
    } else {
        if (badge) {
            badge.className = 'badge bg-info bg-opacity-25 text-info px-2 py-1';
            badge.textContent = 'Persona Natural (Consumidor Final)';
        }
        if (txtInfo) {
            txtInfo.textContent = 'Consumidor final (Persona Natural): Conforme al Art. 59 de la Ley 822 y Plan de Arbitrios, las personas naturales NO son agentes retenedores. Pagan el total facturado con IVA (15%) sin retenciones.';
        }
        if (chkRetDGI) {
            chkRetDGI.checked = false;
            chkRetDGI.disabled = true;
        }
        if (chkRetAlc) {
            chkRetAlc.checked = false;
            chkRetAlc.disabled = true;
        }
    }
}

function actualizarCalculosPreviosFactura() {
    const selVenta = document.getElementById('ventaFactura');
    const chkRetDGI = document.getElementById('chkRetencionDGI');
    const chkRetAlc = document.getElementById('chkRetencionAlcaldia');
    const rdJur = document.getElementById('rdClienteJuridico');

    const idV = selVenta ? parseInt(selVenta.value) : null;
    const vObj = ventasPendientesFactura.find(v => v.idVenta === idV);

    const subtotal = vObj ? parseFloat(vObj.TotalVenta || 0) : 0;
    const iva = Math.round((subtotal * 0.15) * 100) / 100;
    const conIva = Math.round((subtotal + iva) * 100) / 100;

    const esJuridica = rdJur ? rdJur.checked : false;

    let retDGI = 0;
    let retAlc = 0;

    if (esJuridica) {
        const aplicaDGI = chkRetDGI ? chkRetDGI.checked : false;
        const aplicaAlc = chkRetAlc ? chkRetAlc.checked : false;
        retDGI = aplicaDGI ? Math.round((subtotal * 0.02) * 100) / 100 : 0;
        retAlc = aplicaAlc ? Math.round((subtotal * 0.01) * 100) / 100 : 0;
    }

    const totalUSD = Math.round((conIva - retDGI - retAlc) * 100) / 100;
    const totalNIO = Math.round((totalUSD * TIPO_CAMBIO_BCN_DEFAULT) * 100) / 100;

    const elSub = document.getElementById('prevSubtotal');
    const elIva = document.getElementById('prevIVA');
    const elTotBruto = document.getElementById('prevTotalBruto');
    const elRetDGI = document.getElementById('prevRetDGI');
    const elRetAlc = document.getElementById('prevRetAlcaldia');
    const elTotUSD = document.getElementById('prevTotalUSD');
    const elTotNIO = document.getElementById('prevTotalNIO');

    if (elSub) elSub.textContent = `$ ${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    if (elIva) elIva.textContent = `+ $ ${iva.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    if (elTotBruto) elTotBruto.textContent = `$ ${conIva.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

    if (elRetDGI) {
        if (esJuridica && retDGI > 0) {
            elRetDGI.className = 'col-6 text-end text-warning fw-bold';
            elRetDGI.textContent = `- $ ${retDGI.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
        } else {
            elRetDGI.className = 'col-6 text-end text-secondary';
            elRetDGI.textContent = '$ 0.00 (No aplica)';
        }
    }

    if (elRetAlc) {
        if (esJuridica && retAlc > 0) {
            elRetAlc.className = 'col-6 text-end text-info fw-bold';
            elRetAlc.textContent = `- $ ${retAlc.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
        } else {
            elRetAlc.className = 'col-6 text-end text-secondary';
            elRetAlc.textContent = '$ 0.00 (No aplica)';
        }
    }

    if (elTotUSD) elTotUSD.textContent = `$ ${totalUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD`;
    if (elTotNIO) elTotNIO.textContent = `C$ ${totalNIO.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
}

// Abrir modal con venta preseleccionada
function abrirModalEmitirFactura(idVenta) {
    cargarVendedoresYPendientes().then(() => {
        const selVenta = document.getElementById('ventaFactura');
        if (selVenta) {
            selVenta.value = String(idVenta);
            selVenta.dispatchEvent(new Event('change'));
        }
        const modalEl = document.getElementById('modalFactura');
        if (modalEl) bootstrap.Modal.getOrCreateInstance(modalEl).show();
    });
}

// Enviar formulario para emitir factura
async function emitirFactura(e) {
    if (e) e.preventDefault();

    const idVenta = document.getElementById('ventaFactura').value;
    const idEmpleado = document.getElementById('facturaVendedor').value;
    const condicionVenta = document.getElementById('facturaCondicion').value;
    const plazoMeses = document.getElementById('facturaPlazo') ? document.getElementById('facturaPlazo').value : 0;
    const moneda = document.getElementById('facturaMoneda').value;
    const tipoCambio = parseFloat(document.getElementById('facturaTipoCambio').value) || TIPO_CAMBIO_BCN_DEFAULT;
    const aplicaRetencionDGI = document.getElementById('chkRetencionDGI').checked;
    const aplicaRetencionAlcaldia = document.getElementById('chkRetencionAlcaldia').checked;
    const mesesGarantia = document.getElementById('facturaGarantia').value;

    const btnSubmit = document.getElementById('btnGenerarFactura');
    const msgEl = document.getElementById('mensajeFactura');

    if (!idVenta) {
        alert("Por favor selecciona una venta para facturar.");
        return;
    }

    if (!idEmpleado) {
        alert("Por favor selecciona el vendedor responsable.");
        return;
    }

    try {
        if (btnSubmit) {
            btnSubmit.disabled = true;
            btnSubmit.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Emitiendo...';
        }
        if (msgEl) msgEl.innerHTML = '';

        const res = await fetch('/api/facturas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                idVenta: parseInt(idVenta),
                idEmpleado,
                tipoCliente: document.getElementById('rdClienteJuridico')?.checked ? 'Jurídica' : 'Natural',
                esAgenteRetenedor: document.getElementById('rdClienteJuridico')?.checked || false,
                condicionVenta,
                plazoMeses: parseInt(plazoMeses) || 0,
                moneda,
                tipoCambio,
                aplicaRetencionDGI,
                aplicaRetencionAlcaldia,
                mesesGarantia: parseInt(mesesGarantia) || 12
            })
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || 'Error al emitir la factura');
        }

        // Éxito: cerrar modal de emisión
        const modalEl = document.getElementById('modalFactura');
        if (modalEl) {
            const modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();
        }

        // Recargar listas
        await Promise.all([cargarDatos(), cargarFacturas(), cargarApartadoDGI(), cargarVendedoresYPendientes()]);

        // Abrir inmediatamente la factura generada para ver / imprimir
        if (data.idFactura) {
            abrirModalVerFactura(data.idFactura);
        }

    } catch (err) {
        console.error("Error al emitir factura:", err);
        if (msgEl) {
            msgEl.innerHTML = `<div class="alert alert-danger py-2 small mb-0"><i class="bi bi-exclamation-triangle me-1"></i> ${err.message}</div>`;
        } else {
            alert(err.message);
        }
    } finally {
        if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = '<i class="bi bi-check-circle me-1"></i> Emitir Factura Autorizada';
        }
    }
}

// --------------------------------------------------------------------------
// VISOR E IMPRESIÓN DE FACTURA LEGAL (PESTAÑA MODAL VER FACTURA)
// --------------------------------------------------------------------------

async function abrirModalVerFactura(idFactura) {
    try {
        const res = await fetch(`/api/facturas/${idFactura}`);
        if (!res.ok) throw new Error("No se pudo cargar la factura");
        const f = await res.json();

        // Llenar campos de cabecera y DGI
        document.getElementById('vfNumeroFactura').textContent = f.NumeroFactura || 'AMI-FAC-0001';
        document.getElementById('vfSerie').textContent = f.SerieFactura || 'AMI-A';
        document.getElementById('vfResolucionDGI').textContent = f.NumeroAutorizacionDGI || 'DGI-RES-2026-98432';
        document.getElementById('vfRango').textContent = f.RangoAutorizado || '000001 - 010000';

        const badgeEst = document.getElementById('vfEstadoBadge');
        if (badgeEst) {
            if (f.EstadoFactura === 'Anulada') {
                badgeEst.className = 'badge bg-danger text-white px-3 py-2 fs-6 mb-2';
                badgeEst.textContent = 'FACTURA ANULADA';
            } else {
                badgeEst.className = 'badge bg-success text-dark px-3 py-2 fs-6 mb-2 fw-bold';
                badgeEst.textContent = 'AUTORIZADA POR DGI';
            }
        }

        // Datos del Comprador
        document.getElementById('vfClienteNombre').textContent = f.NombreCliente || '-';
        document.getElementById('vfClienteId').textContent = f.IdentificacionCliente || '-';
        document.getElementById('vfClienteTel').textContent = f.TelefonoCliente || f.DireccionCliente || 'Managua, Nicaragua';
        document.getElementById('vfClienteDir').textContent = f.DireccionCliente || 'Managua, Nicaragua';

        // Términos Comerciales
        document.getElementById('vfFechaEmision').textContent = f.FechaEmision ? new Date(f.FechaEmision).toLocaleDateString('es-NI') : '-';
        document.getElementById('vfCondicion').textContent = f.CondicionVenta || 'Contado';
        document.getElementById('vfFechaVencimiento').textContent = f.FechaVencimiento ? new Date(f.FechaVencimiento).toLocaleDateString('es-NI') : '-';
        document.getElementById('vfVendedorNombre').textContent = f.NombreVendedor || '-';
        document.getElementById('vfVendedorCodigo').textContent = f.CodigoEmpleado || 'EMP001';

        // Vehículo
        document.getElementById('vfAutoNombre').textContent = f.NombreVehiculo || f.AutoDescripcion || 'Automotor';
        document.getElementById('vfAutoAnio').textContent = f.Anio || 2024;
        document.getElementById('vfAutoVIN').textContent = f.VIN || '3N1AB7AP9KY104829';
        document.getElementById('vfAutoMotor').textContent = f.NumeroMotor || 'ENG-2049';
        document.getElementById('vfAutoPlaca').textContent = f.Placa || 'S/P';
        document.getElementById('vfAutoKm').textContent = `${(f.Kilometraje || 12000).toLocaleString('en-US')} km`;
        document.getElementById('vfGarantia').textContent = `${f.MesesGarantia || 12} Meses`;
        document.getElementById('vfFormaPago').textContent = f.FormaPago || 'Efectivo';

        // Detalle
        const tbodyDet = document.getElementById('vfCuerpoDetalle');
        if (tbodyDet) {
            tbodyDet.innerHTML = '';
            const detalles = f.detalles && f.detalles.length > 0 ? f.detalles : [{
                Descripcion: `Venta de Vehículo ${f.NombreVehiculo || 'Automotor'} (Año ${f.Anio || 2024}) - Chasis VIN: ${f.VIN || 'N/D'} - Placa: ${f.Placa || 'S/P'}`,
                Cantidad: 1,
                PrecioUnitario: f.Subtotal,
                TotalLinea: f.Subtotal
            }];

            detalles.forEach((d, idx) => {
                const pu = parseFloat(d.PrecioUnitario || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });
                const sub = parseFloat(d.TotalLinea || (d.Cantidad * d.PrecioUnitario) || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });
                tbodyDet.innerHTML += `
                    <tr>
                        <td>${idx + 1}</td>
                        <td class="text-white">${d.Descripcion}</td>
                        <td class="text-center">${d.Cantidad}</td>
                        <td class="text-end">$ ${pu}</td>
                        <td class="text-end fw-bold text-success">$ ${sub}</td>
                    </tr>
                `;
            });
        }

        // Tipo de Cliente / Contribuyente
        const elTipoCli = document.getElementById('vfTipoCliente');
        const tipoCli = f.TipoCliente || 'Natural';
        if (elTipoCli) {
            if (tipoCli === 'Jurídica') {
                elTipoCli.className = 'badge bg-warning bg-opacity-25 text-warning border border-warning';
                elTipoCli.textContent = 'Persona Jurídica (Agente Retenedor)';
            } else {
                elTipoCli.className = 'badge bg-info bg-opacity-25 text-info border border-info';
                elTipoCli.textContent = 'Persona Natural (Consumidor Final)';
            }
        }

        // Desglose Fiscal DGI (Ley 822)
        const subGrav = parseFloat(f.SubtotalGravado || f.Subtotal || 0);
        const iva = parseFloat(f.MontoIVA || (subGrav * 0.15) || 0);
        const conIva = subGrav + iva;
        const retDGI = parseFloat(f.RetencionDGI || 0);
        const retAlc = parseFloat(f.RetencionAlcaldia || 0);
        const totUSD = parseFloat(f.TotalPagar || (conIva - retDGI - retAlc) || 0);
        const totNIO = parseFloat(f.TotalCordobas || (totUSD * (f.TipoCambio || TIPO_CAMBIO_BCN_DEFAULT)) || 0);

        document.getElementById('vfSubtotalGravado').textContent = `$ ${subGrav.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
        document.getElementById('vfMontoIVA').textContent = `+ $ ${iva.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
        document.getElementById('vfTotalConIVA').textContent = `$ ${conIva.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

        const elVfRetDgi = document.getElementById('vfRetDGI');
        if (elVfRetDgi) {
            if (retDGI > 0) {
                elVfRetDgi.className = 'fw-bold text-warning';
                elVfRetDgi.textContent = `- $ ${retDGI.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
            } else {
                elVfRetDgi.className = 'text-secondary small';
                elVfRetDgi.textContent = '$ 0.00 (No aplica)';
            }
        }

        const elVfRetAlc = document.getElementById('vfRetAlcaldia');
        if (elVfRetAlc) {
            if (retAlc > 0) {
                elVfRetAlc.className = 'fw-bold text-info';
                elVfRetAlc.textContent = `- $ ${retAlc.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
            } else {
                elVfRetAlc.className = 'text-secondary small';
                elVfRetAlc.textContent = '$ 0.00 (No aplica)';
            }
        }

        document.getElementById('vfTotalPagarUSD').textContent = `$ ${totUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD`;
        document.getElementById('vfTipoCambio').textContent = `C$ ${parseFloat(f.TipoCambio || TIPO_CAMBIO_BCN_DEFAULT).toFixed(4)} por $1 USD`;
        document.getElementById('vfTotalCordobas').textContent = `C$ ${totNIO.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

        const elVfNota = document.getElementById('vfTextoNotaFiscal');
        if (elVfNota) {
            if (tipoCli === 'Jurídica' && (retDGI > 0 || retAlc > 0)) {
                elVfNota.textContent = 'Cliente Jurídico / Agente Retenedor: Retenciones deducidas al momento del pago contra entrega de Constancia de Retención Fiscal.';
            } else {
                elVfNota.textContent = 'Venta a Consumidor Final (Persona Natural): Conforme al Art. 59 de la Ley 822, no sujeta a retenciones en la fuente. Se canceló el 100% del total facturado con IVA.';
            }
        }

        const modalEl = document.getElementById('modalVerFactura');
        if (modalEl) bootstrap.Modal.getOrCreateInstance(modalEl).show();

    } catch (err) {
        console.error("Error al visualizar factura:", err);
        alert("Error al abrir la factura: " + err.message);
    }
}

// Anular Factura
async function anularFactura(idFactura) {
    const motivo = prompt("Ingresa el motivo de anulación fiscal ante la DGI:");
    if (!motivo) return;

    try {
        const res = await fetch(`/api/facturas/${idFactura}/anular`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ motivoAnulacion: motivo })
        });

        if (!res.ok) throw new Error("No se pudo anular la factura");

        alert("Factura anulada correctamente.");
        await Promise.all([cargarDatos(), cargarFacturas(), cargarApartadoDGI()]);
    } catch (err) {
        alert("Error al anular: " + err.message);
    }
}

// --------------------------------------------------------------------------
// CRUD BÁSICO DE VENTAS (Mantenido intacto y robusto)
// --------------------------------------------------------------------------

async function guardarVenta(e) {
    if (e) e.preventDefault();

    const idVenta = document.getElementById('venta-id').value;
    const IdClientes = document.getElementById('venta-cliente').value;
    const idAuto = document.getElementById('venta-auto').value;
    const FechaVenta = document.getElementById('venta-fecha').value;
    const TotalVenta = document.getElementById('venta-total').value;
    const FormaPago = document.getElementById('venta-pago').value;
    const EstadoVenta = document.getElementById('venta-estado').value;

    if (!TotalVenta || isNaN(parseFloat(TotalVenta)) || parseFloat(TotalVenta) <= 0) {
        alert("Por favor ingresa un monto total válido para la venta.");
        return;
    }

    const payload = {
        IdClientes: IdClientes ? parseInt(IdClientes) : null,
        idAuto: idAuto ? parseInt(idAuto) : null,
        FechaVenta: FechaVenta || new Date().toISOString().split('T')[0],
        TotalVenta: parseFloat(TotalVenta),
        FormaPago: FormaPago || 'Efectivo',
        EstadoVenta: EstadoVenta || 'Finalizada'
    };

    try {
        let res;
        if (ventaEnEdicion) {
            res = await fetch(`/api/ventas/${idVenta}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } else {
            res = await fetch('/api/ventas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        }

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error al guardar venta');

        const modalEl = document.getElementById('modalVenta');
        if (modalEl) {
            const modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();
        }

        limpiarFormularioVenta();
        await Promise.all([cargarDatos(), cargarFacturas(), cargarVendedoresYPendientes()]);
    } catch (err) {
        console.error("Error al guardar venta:", err);
        alert(err.message);
    }
}

function abrirModalEditarVenta(id) {
    const v = ventasData.find(item => item.idVenta === id);
    if (!v) return;

    ventaEnEdicion = v;
    document.getElementById('venta-id').value = v.idVenta;
    document.getElementById('venta-id-display').value = '#' + v.idVenta;

    if (v.IdClientes) document.getElementById('venta-cliente').value = v.IdClientes;
    if (v.idAuto) document.getElementById('venta-auto').value = v.idAuto;

    if (v.FechaVenta) {
        document.getElementById('venta-fecha').value = new Date(v.FechaVenta).toISOString().split('T')[0];
    }
    document.getElementById('venta-total').value = v.Monto || '';
    if (v.FormaPago) document.getElementById('venta-pago').value = v.FormaPago;
    if (v.EstadoVenta) document.getElementById('venta-estado').value = v.EstadoVenta;

    const label = document.getElementById('modalVentaLabel');
    if (label) label.innerHTML = '<i class="bi bi-pencil-square text-neon-green me-2"></i>Editar Venta';

    const btn = document.getElementById('btn-guardar-venta');
    if (btn) btn.textContent = 'Actualizar Venta';

    const modalEl = document.getElementById('modalVenta');
    if (modalEl) {
        bootstrap.Modal.getOrCreateInstance(modalEl).show();
    }
}

async function eliminarVenta(id) {
    if (!confirm(`¿Estás seguro de que deseas eliminar la venta #${id}? Si está vinculada a un auto vendido, su estado volverá a 'Disponible'.`)) {
        return;
    }

    try {
        const res = await fetch(`/api/ventas/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error al eliminar');

        await Promise.all([cargarDatos(), cargarFacturas(), cargarApartadoDGI(), cargarVendedoresYPendientes()]);
    } catch (err) {
        console.error("Error al eliminar venta:", err);
        alert(err.message);
    }
}

function limpiarFormularioVenta() {
    ventaEnEdicion = null;
    document.getElementById('venta-id').value = '';
    document.getElementById('venta-id-display').value = '';
    document.getElementById('venta-cliente').value = '';
    document.getElementById('venta-auto').value = '';
    document.getElementById('venta-fecha').value = new Date().toISOString().split('T')[0];
    document.getElementById('venta-total').value = '';
    document.getElementById('venta-pago').value = 'Efectivo';
    document.getElementById('venta-estado').value = 'Finalizada';

    const label = document.getElementById('modalVentaLabel');
    if (label) label.innerHTML = '<i class="bi bi-tag-fill text-neon-green me-2"></i>Registrar Venta';

    const btn = document.getElementById('btn-guardar-venta');
    if (btn) btn.textContent = 'Guardar Venta';
}

function actualizarKPIsPrincipales(data) {
    const totalVentas = data.length;
    const ingresos = data.reduce((acc, v) => acc + (parseFloat(v.Monto) || 0), 0);

    const hoy = new Date();
    const ventasMes = data.filter(v => {
        if (!v.FechaVenta) return false;
        const d = new Date(v.FechaVenta);
        return d.getMonth() === hoy.getMonth() && d.getFullYear() === hoy.getFullYear();
    }).length;

    const elVentas = document.getElementById('kpi-main-ventas');
    const elIngresos = document.getElementById('kpi-main-ingresos');
    const elMes = document.getElementById('kpi-main-mes');

    if (elVentas) elVentas.textContent = totalVentas;
    if (elIngresos) elIngresos.textContent = '$ ' + ingresos.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (elMes) elMes.textContent = ventasMes;
}

// Exportar globalmente
window.abrirModalEditarVenta = abrirModalEditarVenta;
window.eliminarVenta = eliminarVenta;
window.abrirModalEmitirFactura = abrirModalEmitirFactura;
window.abrirModalVerFactura = abrirModalVerFactura;
window.anularFactura = anularFactura;
window.cargarApartadoDGI = cargarApartadoDGI;
window.exportarLibroVentasDGIExcel = exportarLibroVentasDGIExcel;


// ==========================================================================
// REPORTE GENERAL DE VENTAS Y EXPORTACIÓN EXCEL
// ==========================================================================
let datosReporteVentas = [];

function calcularDatosReporteVentas() {
    datosReporteVentas = [];
    let totalGeneral = 0;
    ventasData.forEach(v => {
        const monto = parseFloat(v.Monto || 0);
        totalGeneral += monto;
        const fecha = v.FechaVenta ? new Date(v.FechaVenta).toLocaleDateString() : 'N/A';
        datosReporteVentas.push({
            id: v.idVenta,
            cliente: v.Cliente || 'N/A',
            vehiculo: v.Vehiculo || 'N/A',
            monto: '$ ' + monto.toLocaleString('en-US', { minimumFractionDigits: 2 }),
            montoNum: monto,
            fecha: fecha,
            formaPago: v.FormaPago || 'N/A',
            factura: v.NumeroFactura || 'Sin Factura'
        });
    });

    const kpiEl = document.getElementById('kpi-ventas');
    if (kpiEl) {
        kpiEl.innerHTML = `Total de ventas registradas: <strong class="text-success">${ventasData.length}</strong> | Facturación global acumulada: <strong class="text-success">$ ${totalGeneral.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>`;
    }
}

function generarReporte(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (!ventasData || ventasData.length === 0) {
        return alert("No hay datos de ventas disponibles para generar el reporte.");
    }
    calcularDatosReporteVentas();

    const tbody = document.getElementById('cuerpo-tabla-reporte-ventas');
    if (tbody) {
        tbody.innerHTML = '';
        datosReporteVentas.forEach(i => {
            tbody.innerHTML += `
                <tr>
                    <td class="text-neon-green fw-bold">#${i.id}</td>
                    <td class="text-white">${i.cliente}</td>
                    <td class="text-info">${i.vehiculo}</td>
                    <td class="text-success fw-bold">${i.monto}</td>
                    <td class="text-secondary">${i.fecha}</td>
                    <td><span class="badge bg-dark border border-secondary text-light">${i.formaPago}</span></td>
                </tr>
            `;
        });
    }

    const modalEl = document.getElementById('modalReporteVentas');
    if (modalEl) {
        bootstrap.Modal.getOrCreateInstance(modalEl).show();
    }
}

function descargarReporteExcel(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (!ventasData || ventasData.length === 0) {
        return alert("No hay ventas para exportar.");
    }
    calcularDatosReporteVentas();

    if (typeof XLSX !== 'undefined') {
        const wsData = [
            ["REPORTE GENERAL DE VENTAS - AUTOS MODERNOS E IMPORTACIONES (AMI)"],
            [`Fecha y hora de generación: ${new Date().toLocaleString()}`],
            [],
            ["ID Venta", "Cliente", "Vehículo", "Monto ($)", "Fecha", "Forma de Pago", "Factura Fiscal"]
        ];

        datosReporteVentas.forEach(i => {
            wsData.push([
                i.id,
                i.cliente,
                i.vehiculo,
                i.montoNum,
                i.fecha,
                i.formaPago,
                i.factura
            ]);
        });

        const ws = XLSX.utils.aoa_to_sheet(wsData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Ventas");
        XLSX.writeFile(wb, `Reporte_Ventas_AMI_${new Date().toISOString().split('T')[0]}.xlsx`);
    } else {
        let csvContent = "\uFEFFID Venta,Cliente,Vehiculo,Monto,Fecha,Forma Pago,Factura\n";
        datosReporteVentas.forEach(i => {
            csvContent += `"${i.id}","${(i.cliente||'').replace(/"/g, '""')}","${(i.vehiculo||'').replace(/"/g, '""')}","${i.montoNum}","${i.fecha}","${i.formaPago}","${i.factura}"\n`;
        });
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `Reporte_Ventas_AMI_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

function exportarVentasExcel(e) {
    descargarReporteExcel(e);
}

window.generarReporte = generarReporte;
window.descargarReporteExcel = descargarReporteExcel;
window.exportarVentasExcel = exportarVentasExcel;
