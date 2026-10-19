// ==========================================================================
// AMI - Módulo de Ventas (ventas.js)
// Gestión integral de ventas de vehículos, clientes, formas de pago, KPIs y CRUD completo
// ==========================================================================

let ventasData = [];
let clientesLista = [];
let autosLista = [];
let ventaEnEdicion = null;

document.addEventListener("DOMContentLoaded", () => {
    cargarDatos();

    // 1. Buscador en tiempo real
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

    // 4. Cuando se selecciona un auto en el modal, autocompletar el precio
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

    // 5. Limpieza del modal al cerrarse
    const modalEl = document.getElementById('modalVenta');
    if (modalEl) {
        modalEl.addEventListener('hidden.bs.modal', () => {
            limpiarFormularioVenta();
        });
    }
});

// --------------------------------------------------------------------------
// CARGAR DATOS DESDE LA API
// --------------------------------------------------------------------------
async function cargarDatos() {
    try {
        const [resVentas, resClientes, resAutos] = await Promise.all([
            fetch('/api/ventas'),
            fetch('/api/ventas/clientes').catch(() => null),
            fetch('/api/ventas/autos').catch(() => null)
        ]);

        if (!resVentas.ok) throw new Error('Error al cargar ventas del servidor');
        ventasData = await resVentas.json();

        if (resClientes && resClientes.ok) {
            clientesLista = await resClientes.json();
            poblarSelectClientes();
        }

        if (resAutos && resAutos.ok) {
            autosLista = await resAutos.json();
            poblarSelectAutos();
        }

        renderizarTabla();
        actualizarKPIsPrincipales(ventasData);
    } catch (error) {
        console.error("Error al cargar ventas:", error);
        const tbody = document.getElementById("cuerpo-tabla");
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center text-danger py-4"><i class="bi bi-exclamation-triangle-fill me-2"></i> Error al cargar datos del servidor.</td></tr>';
        }
    }
}

// --------------------------------------------------------------------------
// POBLAR SELECTS DE CLIENTES Y AUTOS
// --------------------------------------------------------------------------
function poblarSelectClientes() {
    const sel = document.getElementById('venta-cliente');
    if (!sel) return;
    sel.innerHTML = '<option value="" selected disabled>Seleccione un cliente</option>';
    clientesLista.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.IdClientes;
        opt.textContent = `${c.NombreCompleto} (${c.Cedula || 'Sin cédula'})`;
        sel.appendChild(opt);
    });
}

function poblarSelectAutos() {
    const sel = document.getElementById('venta-auto');
    if (!sel) return;
    sel.innerHTML = '<option value="" selected disabled>Seleccione un vehículo</option>';
    autosLista.forEach(a => {
        const opt = document.createElement('option');
        opt.value = a.idAuto;
        const est = a.Estado ? ` - [${a.Estado}]` : '';
        opt.textContent = `#${a.idAuto} - ${a.Auto}${est}`;
        sel.appendChild(opt);
    });
}

// --------------------------------------------------------------------------
// RENDERIZAR TABLA CON FILTROS
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

        tr.innerHTML = `
            <td class="text-center fw-bold text-neon-green">#${v.idVenta}</td>
            <td class="text-center text-white fw-bold">${v.Cliente || 'Desconocido'}</td>
            <td class="text-center text-secondary small text-truncate" style="max-width: 180px;" title="${v.Vehiculo || ''}">${v.Vehiculo || 'No asignado'}</td>
            <td class="text-center text-success fw-bold">C$ ${montoFormateado}</td>
            <td class="text-center text-secondary">${fecha}</td>
            <td class="text-center"><span class="badge bg-dark border border-secondary px-2 py-1">${v.FormaPago || 'Efectivo'}</span></td>
            <td class="text-center"><span class="badge ${badgeClass} rounded-pill px-3 py-1">${v.EstadoVenta || 'Finalizada'}</span></td>
            <td class="text-center">
                <div class="dropdown">
                    <button class="btn btn-link text-secondary p-0 border-0" type="button" data-bs-toggle="dropdown" aria-expanded="false" title="Acciones">
                        <i class="bi bi-three-dots-vertical fs-5"></i>
                    </button>
                    <ul class="dropdown-menu dropdown-menu-dark dropdown-menu-end shadow" style="background-color: #1A2218; border: 1px solid rgba(255,255,255,0.1);">
                        <li>
                            <a class="dropdown-item text-white py-2" href="javascript:void(0)" onclick="abrirModalEditarVenta(${v.idVenta})">
                                <i class="bi bi-pencil-square me-2" style="color: #DBFF99;"></i> Editar
                            </a>
                        </li>
                        <li><hr class="dropdown-divider border-secondary opacity-25 my-1"></li>
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
// GUARDAR VENTA (CREAR O EDITAR)
// --------------------------------------------------------------------------
async function guardarVenta(e) {
    if (e && e.preventDefault) e.preventDefault();

    const idCliente = document.getElementById('venta-cliente')?.value;
    const idAuto = document.getElementById('venta-auto')?.value;
    const fecha = document.getElementById('venta-fecha')?.value;
    const total = document.getElementById('venta-total')?.value;
    const pago = document.getElementById('venta-pago')?.value;
    const estado = document.getElementById('venta-estado')?.value;

    if (!idCliente || !idAuto || !total) {
        alert('Por favor complete los campos obligatorios: Cliente, Vehículo y Monto.');
        return;
    }

    const payload = {
        IdClientes: parseInt(idCliente),
        idAuto: parseInt(idAuto),
        FechaVenta: fecha || new Date().toISOString().split('T')[0],
        TotalVenta: parseFloat(total),
        FormaPago: pago || 'Efectivo',
        EstadoVenta: estado || 'Finalizada'
    };

    const url = ventaEnEdicion ? `/api/ventas/${ventaEnEdicion}` : '/api/ventas';
    const method = ventaEnEdicion ? 'PUT' : 'POST';

    const btnGuardar = document.getElementById('btn-guardar-venta');
    const txtOriginal = btnGuardar ? btnGuardar.innerText : 'Guardar Venta';

    try {
        if (btnGuardar) {
            btnGuardar.disabled = true;
            btnGuardar.innerText = 'Guardando...';
        }

        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (btnGuardar) {
            btnGuardar.disabled = false;
            btnGuardar.innerText = txtOriginal;
        }

        if (!res.ok) {
            const errJson = await res.json().catch(() => ({}));
            throw new Error(errJson.error || 'Error al guardar la venta en el servidor');
        }

        const modalEl = document.getElementById('modalVenta');
        if (modalEl) {
            const modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();
        }

        limpiarFormularioVenta();
        await cargarDatos();
        alert(ventaEnEdicion ? 'Venta actualizada con éxito.' : 'Venta registrada con éxito.');
    } catch (err) {
        if (btnGuardar) {
            btnGuardar.disabled = false;
            btnGuardar.innerText = txtOriginal;
        }
        console.error('Error al guardar venta:', err);
        alert('Error al guardar venta: ' + err.message);
    }
}

// --------------------------------------------------------------------------
// ABRIR MODAL PARA EDITAR
// --------------------------------------------------------------------------
function abrirModalEditarVenta(id) {
    const venta = ventasData.find(v => v.idVenta === id);
    if (!venta) {
        alert('No se encontró la venta seleccionada.');
        return;
    }

    ventaEnEdicion = id;

    const elIdDisplay = document.getElementById('venta-id-display');
    if (elIdDisplay) elIdDisplay.value = `#${id}`;

    const elCli = document.getElementById('venta-cliente');
    if (elCli && venta.IdClientes) elCli.value = venta.IdClientes;

    const elAuto = document.getElementById('venta-auto');
    if (elAuto && venta.idAuto) elAuto.value = venta.idAuto;

    const elFecha = document.getElementById('venta-fecha');
    if (elFecha) {
        elFecha.value = venta.FechaVenta ? venta.FechaVenta.split('T')[0] : '';
    }

    const elTotal = document.getElementById('venta-total');
    if (elTotal) elTotal.value = venta.Monto != null ? venta.Monto : '';

    const elPago = document.getElementById('venta-pago');
    if (elPago) elPago.value = venta.FormaPago || 'Efectivo';

    const elEstado = document.getElementById('venta-estado');
    if (elEstado) elEstado.value = venta.EstadoVenta || 'Finalizada';

    const label = document.getElementById('modalVentaLabel');
    if (label) {
        label.innerHTML = `<i class="bi bi-pencil-square text-neon-green me-2"></i>Editar Venta #${id}`;
    }

    const btnGuardar = document.getElementById('btn-guardar-venta');
    if (btnGuardar) btnGuardar.innerText = 'Guardar Cambios';

    const modalEl = document.getElementById('modalVenta');
    if (modalEl) {
        const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
        modal.show();
    }
}

// --------------------------------------------------------------------------
// ELIMINAR VENTA
// --------------------------------------------------------------------------
async function eliminarVenta(id) {
    if (!confirm(`¿Estás seguro de que deseas eliminar la venta con ID #${id}?\n(El vehículo vendido volverá a quedar como 'Disponible' en el inventario).`)) return;

    try {
        const res = await fetch(`/api/ventas/${id}`, {
            method: 'DELETE'
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || 'No se pudo eliminar la venta.');
        }

        await cargarDatos();
        alert('Venta eliminada con éxito y vehículo liberado al inventario.');
    } catch (err) {
        console.error('Error eliminando venta:', err);
        alert('Error al eliminar venta: ' + err.message);
    }
}

// --------------------------------------------------------------------------
// LIMPIAR FORMULARIO
// --------------------------------------------------------------------------
function limpiarFormularioVenta() {
    ventaEnEdicion = null;
    const form = document.getElementById('formVenta');
    if (form) form.reset();

    const elIdDisplay = document.getElementById('venta-id-display');
    if (elIdDisplay) elIdDisplay.value = '';

    const label = document.getElementById('modalVentaLabel');
    if (label) {
        label.innerHTML = '<i class="bi bi-tag-fill text-neon-green me-2"></i>Registrar Venta';
    }

    const btnGuardar = document.getElementById('btn-guardar-venta');
    if (btnGuardar) btnGuardar.innerText = 'Guardar Venta';
}

window.abrirModalEditarVenta = abrirModalEditarVenta;
window.eliminarVenta = eliminarVenta;

// --------------------------------------------------------------------------
// ACTUALIZAR KPIS PRINCIPALES
// --------------------------------------------------------------------------
function actualizarKPIsPrincipales(data) {
    const totalVentas = data.length;
    const ingresos = data.reduce((sum, v) => sum + (parseFloat(v.Monto) || 0), 0);

    const mesActual = new Date().getMonth();
    const anioActual = new Date().getFullYear();
    const ventasMes = data.filter(v => {
        if (!v.FechaVenta) return false;
        const d = new Date(v.FechaVenta);
        return d.getMonth() === mesActual && d.getFullYear() === anioActual;
    }).length;

    const e1 = document.getElementById('kpi-main-ventas');
    if (e1) e1.innerText = totalVentas;

    const e2 = document.getElementById('kpi-main-ingresos');
    if (e2) e2.innerText = 'C$ ' + ingresos.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const e3 = document.getElementById('kpi-main-mes');
    if (e3) e3.innerText = ventasMes;
}

// --------------------------------------------------------------------------
// REPORTE DE VENTAS Y EXPORTACIÓN A EXCEL
// --------------------------------------------------------------------------
let datosReporteVentas = [];
let kpiVentasTexto = "";

function calcularDatosReporte() {
    datosReporteVentas = [];
    let totalIngresos = 0;
    const metodosPago = {};

    ventasData.forEach(v => {
        const fecha = v.FechaVenta ? v.FechaVenta.split('T')[0] : 'N/A';
        const monto = v.Monto ? parseFloat(v.Monto) : 0;
        totalIngresos += monto;

        datosReporteVentas.push({
            id: v.idVenta,
            cliente: v.Cliente || 'N/A',
            vehiculo: v.Vehiculo || 'N/A',
            monto: `C$ ${monto.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
            fecha: fecha,
            pago: v.FormaPago || 'N/A'
        });

        const p = v.FormaPago || 'Otro';
        if (!metodosPago[p]) metodosPago[p] = 0;
        metodosPago[p] += monto;
    });

    let maxMetodo = 'N/A';
    let maxMonto = 0;
    for (const [m, val] of Object.entries(metodosPago)) {
        if (val > maxMonto) {
            maxMonto = val;
            maxMetodo = m;
        }
    }

    kpiVentasTexto = `El método de pago con mayor volumen es <strong>${maxMetodo}</strong> (C$ ${maxMonto.toLocaleString('en-US', { minimumFractionDigits: 2 })}). Ingresos totales por ventas: <strong class="text-success">C$ ${totalIngresos.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>.`;
}

function generarReporte() {
    if (ventasData.length === 0) return alert("No hay datos de ventas para generar el reporte.");
    calcularDatosReporte();

    const kpiEl = document.getElementById('kpi-ventas');
    if (kpiEl) kpiEl.innerHTML = kpiVentasTexto;

    const tbody = document.getElementById('cuerpo-tabla-reporte-ventas');
    if (tbody) {
        tbody.innerHTML = '';
        datosReporteVentas.forEach(item => {
            tbody.innerHTML += `
                <tr>
                    <td class="text-neon-green fw-bold">#${item.id}</td>
                    <td class="text-white">${item.cliente}</td>
                    <td class="text-secondary small">${item.vehiculo}</td>
                    <td class="text-success fw-bold">${item.monto}</td>
                    <td class="text-white">${item.fecha}</td>
                </tr>
            `;
        });
    }
    const modalEl = document.getElementById('modalReporteVentas');
    if (modalEl) bootstrap.Modal.getOrCreateInstance(modalEl).show();
}

function descargarReporteExcel() {
    if (ventasData.length === 0) return alert("No hay ventas para exportar.");
    calcularDatosReporte();
    let csvContent = "\uFEFFID,Cliente,Vehículo,Monto (C$),Fecha,Forma de Pago\n";
    datosReporteVentas.forEach(item => {
        let cli = (item.cliente || '').replace(/"/g, '""');
        let veh = (item.vehiculo || '').replace(/"/g, '""');
        csvContent += `"${item.id}","${cli}","${veh}","${item.monto}","${item.fecha}","${item.pago}"\n`;
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `reporte_ventas_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

window.generarReporte = generarReporte;
window.descargarReporteExcel = descargarReporteExcel;
