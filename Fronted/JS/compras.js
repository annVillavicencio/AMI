// ==========================================================================
// AMI - Módulo de Compras (compras.js)
// Gestión de adquisiciones, proveedores, filtros en tiempo real, KPIs y CRUD completo
// ==========================================================================

let comprasData = [];
let proveedoresData = [];
let compraEnEdicion = null;

document.addEventListener("DOMContentLoaded", () => {
    cargarDatos();

    // 1. Buscador en tiempo real
    const searchInput = document.getElementById('input-busqueda-compra') || document.querySelector('input[placeholder*="Buscar"]');
    if (searchInput) {
        searchInput.addEventListener('input', () => { renderizarTabla(); });
        searchInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') renderizarTabla();
        });
    }

    // 2. Filtro por Estado
    const filtroEstado = document.getElementById('filtro-estado-compra');
    if (filtroEstado) {
        filtroEstado.addEventListener('change', () => { renderizarTabla(); });
    }

    // 3. Botón y formulario para Guardar Compra
    const btnGuardar = document.getElementById('btn-guardar-compra');
    if (btnGuardar) {
        btnGuardar.addEventListener('click', guardarCompra);
    }

    const formCompra = document.getElementById('formCompra');
    if (formCompra) {
        formCompra.addEventListener('submit', (e) => {
            e.preventDefault();
            guardarCompra();
        });
    }

    // 4. Limpieza del modal al cerrarse
    const modalEl = document.getElementById('modalCompra');
    if (modalEl) {
        modalEl.addEventListener('hidden.bs.modal', () => {
            limpiarFormularioCompra();
        });
    }
});

// --------------------------------------------------------------------------
// CARGAR DATOS DESDE LA API
// --------------------------------------------------------------------------
async function cargarDatos() {
    try {
        const [resCompras, resProvs] = await Promise.all([
            fetch('/api/compras'),
            fetch('/api/compras/proveedores').catch(() => null)
        ]);

        if (!resCompras.ok) throw new Error('Error al cargar compras del servidor');
        comprasData = await resCompras.json();

        if (resProvs && resProvs.ok) {
            proveedoresData = await resProvs.json();
            poblarDatalistProveedores();
        }

        renderizarTabla();
        actualizarKPIsPrincipales(comprasData);
    } catch (error) {
        console.error("Error al cargar compras:", error);
        const tbody = document.getElementById("cuerpo-tabla");
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center text-danger py-4"><i class="bi bi-exclamation-triangle-fill me-2"></i> Error al cargar compras del servidor.</td></tr>';
        }
    }
}

// --------------------------------------------------------------------------
// POBLAR DATALIST DE PROVEEDORES
// --------------------------------------------------------------------------
function poblarDatalistProveedores() {
    const datalist = document.getElementById('lista-proveedores');
    if (!datalist) return;
    datalist.innerHTML = '';
    proveedoresData.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.NomProveedor;
        datalist.appendChild(opt);
    });
}

// --------------------------------------------------------------------------
// RENDERIZAR TABLA CON FILTROS
// --------------------------------------------------------------------------
function renderizarTabla() {
    const tbody = document.getElementById("cuerpo-tabla");
    if (!tbody) return;
    tbody.innerHTML = "";

    const searchInput = document.getElementById('input-busqueda-compra') || document.querySelector('input[placeholder*="Buscar"]');
    const busqueda = searchInput ? searchInput.value.trim().toLowerCase() : '';

    const filtroEstado = document.getElementById('filtro-estado-compra');
    const estado = filtroEstado ? filtroEstado.value.trim().toLowerCase() : 'todos';

    const filtrados = comprasData.filter(c => {
        const id = c.idCompra ? String(c.idCompra) : "";
        const prov = (c.Proveedor || '').toLowerCase();
        const fact = (c.NumFactura || '').toLowerCase();
        const desc = (c.Descripcion || '').toLowerCase();
        const total = c.TotalCompra ? String(c.TotalCompra) : '';

        const coincideBusqueda = !busqueda ||
            id.includes(busqueda) ||
            prov.includes(busqueda) ||
            fact.includes(busqueda) ||
            desc.includes(busqueda) ||
            total.includes(busqueda);

        const est = (c.EstadoCompra || '').trim().toLowerCase();
        const coincideEstado = (estado === 'todos los estados' || estado === 'todos' || !estado) ||
            est === estado;

        return coincideBusqueda && coincideEstado;
    });

    actualizarKPIsPrincipales(filtrados);

    if (filtrados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4"><i class="bi bi-inbox fs-4 d-block mb-1"></i> No se encontraron compras registradas.</td></tr>';
        return;
    }

    filtrados.forEach(c => {
        const tr = document.createElement("tr");
        tr.style.borderBottom = '1px solid rgba(255,255,255,0.05)';

        const fecha = c.FechaCompra ? new Date(c.FechaCompra).toISOString().split('T')[0] : 'N/A';
        const totalNum = parseFloat(c.TotalCompra || 0);
        const totalFormateado = totalNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        let badgeClass = 'badge-activa';
        const estLower = (c.EstadoCompra || '').toLowerCase();
        if (estLower.includes('pendiente')) badgeClass = 'badge-programada';

        tr.innerHTML = `
            <td class="text-center fw-bold text-neon-green">#${c.idCompra}</td>
            <td class="text-center text-white fw-bold">${c.Proveedor || 'Desconocido'}</td>
            <td class="text-center text-secondary small text-truncate" style="max-width: 170px;" title="${c.Descripcion || ''}">${c.Descripcion || '-'}</td>
            <td class="text-center text-white"><span class="badge bg-dark border border-secondary px-2 py-1">${c.NumFactura || 'S/F'}</span></td>
            <td class="text-center text-secondary">${fecha}</td>
            <td class="text-center text-danger fw-bold">C$ ${totalFormateado}</td>
            <td class="text-center"><span class="badge ${badgeClass} rounded-pill px-3 py-1">${c.EstadoCompra || 'Completado'}</span></td>
            <td class="text-center">
                <div class="dropdown">
                    <button class="btn btn-link text-secondary p-0 border-0" type="button" data-bs-toggle="dropdown" aria-expanded="false" title="Acciones">
                        <i class="bi bi-three-dots-vertical fs-5"></i>
                    </button>
                    <ul class="dropdown-menu dropdown-menu-dark dropdown-menu-end shadow" style="background-color: #1A2218; border: 1px solid rgba(255,255,255,0.1);">
                        <li>
                            <a class="dropdown-item text-white py-2" href="javascript:void(0)" onclick="abrirModalEditarCompra(${c.idCompra})">
                                <i class="bi bi-pencil-square me-2" style="color: #DBFF99;"></i> Editar
                            </a>
                        </li>
                        <li><hr class="dropdown-divider border-secondary opacity-25 my-1"></li>
                        <li>
                            <a class="dropdown-item text-danger py-2" href="javascript:void(0)" onclick="eliminarCompra(${c.idCompra})">
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
// GUARDAR COMPRA (CREAR O EDITAR)
// --------------------------------------------------------------------------
async function guardarCompra(e) {
    if (e && e.preventDefault) e.preventDefault();

    const proveedor = document.getElementById('compra-proveedor')?.value.trim();
    const descripcion = document.getElementById('compra-descripcion')?.value.trim();
    const fecha = document.getElementById('compra-fecha')?.value;
    const factura = document.getElementById('compra-factura')?.value.trim();
    const total = document.getElementById('compra-total')?.value;
    const estado = document.getElementById('compra-estado')?.value;

    if (!proveedor || !total) {
        alert('Por favor complete los campos obligatorios: Proveedor y Total de la compra.');
        return;
    }

    const payload = {
        NomProveedor: proveedor,
        Descripcion: descripcion || '',
        FechaCompra: fecha || new Date().toISOString().split('T')[0],
        NumFactura: factura || `F-${Math.floor(1000 + Math.random() * 9000)}`,
        TotalCompra: parseFloat(total),
        EstadoCompra: estado || 'Completado'
    };

    const url = compraEnEdicion ? `/api/compras/${compraEnEdicion}` : '/api/compras';
    const method = compraEnEdicion ? 'PUT' : 'POST';

    const btnGuardar = document.getElementById('btn-guardar-compra');
    const txtOriginal = btnGuardar ? btnGuardar.innerText : 'Guardar Compra';

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
            throw new Error(errJson.error || 'Error al guardar la compra en el servidor');
        }

        const modalEl = document.getElementById('modalCompra');
        if (modalEl) {
            const modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();
        }

        limpiarFormularioCompra();
        await cargarDatos();
        alert(compraEnEdicion ? 'Compra actualizada con éxito.' : 'Compra registrada con éxito.');
    } catch (err) {
        if (btnGuardar) {
            btnGuardar.disabled = false;
            btnGuardar.innerText = txtOriginal;
        }
        console.error('Error al guardar compra:', err);
        alert('Error al guardar compra: ' + err.message);
    }
}

// --------------------------------------------------------------------------
// ABRIR MODAL PARA EDITAR
// --------------------------------------------------------------------------
function abrirModalEditarCompra(id) {
    const compra = comprasData.find(c => c.idCompra === id);
    if (!compra) {
        alert('No se encontró la compra seleccionada.');
        return;
    }

    compraEnEdicion = id;

    const elIdDisplay = document.getElementById('compra-id-display');
    if (elIdDisplay) elIdDisplay.value = `#${id}`;

    const elProv = document.getElementById('compra-proveedor');
    if (elProv) elProv.value = compra.Proveedor || '';

    const elDesc = document.getElementById('compra-descripcion');
    if (elDesc) elDesc.value = compra.Descripcion || '';

    const elFact = document.getElementById('compra-factura');
    if (elFact) elFact.value = compra.NumFactura || '';

    const elFecha = document.getElementById('compra-fecha');
    if (elFecha) {
        elFecha.value = compra.FechaCompra ? compra.FechaCompra.split('T')[0] : '';
    }

    const elTotal = document.getElementById('compra-total');
    if (elTotal) elTotal.value = compra.TotalCompra != null ? compra.TotalCompra : '';

    const elEstado = document.getElementById('compra-estado');
    if (elEstado) elEstado.value = compra.EstadoCompra || 'Completado';

    const label = document.getElementById('modalCompraLabel');
    if (label) {
        label.innerHTML = `<i class="bi bi-pencil-square text-neon-green me-2"></i>Editar Compra #${id}`;
    }

    const btnGuardar = document.getElementById('btn-guardar-compra');
    if (btnGuardar) btnGuardar.innerText = 'Guardar Cambios';

    const modalEl = document.getElementById('modalCompra');
    if (modalEl) {
        const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
        modal.show();
    }
}

// --------------------------------------------------------------------------
// ELIMINAR COMPRA
// --------------------------------------------------------------------------
async function eliminarCompra(id) {
    if (!confirm(`¿Estás seguro de que deseas eliminar la compra con ID #${id}?`)) return;

    try {
        const res = await fetch(`/api/compras/${id}`, {
            method: 'DELETE'
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || 'No se pudo eliminar la compra.');
        }

        await cargarDatos();
        alert('Compra eliminada con éxito.');
    } catch (err) {
        console.error('Error eliminando compra:', err);
        alert('Error al eliminar compra: ' + err.message);
    }
}

// --------------------------------------------------------------------------
// LIMPIAR FORMULARIO
// --------------------------------------------------------------------------
function limpiarFormularioCompra() {
    compraEnEdicion = null;
    const form = document.getElementById('formCompra');
    if (form) form.reset();

    const elIdDisplay = document.getElementById('compra-id-display');
    if (elIdDisplay) elIdDisplay.value = '';

    const label = document.getElementById('modalCompraLabel');
    if (label) {
        label.innerHTML = '<i class="bi bi-cart-check text-neon-green me-2"></i>Registrar Compra';
    }

    const btnGuardar = document.getElementById('btn-guardar-compra');
    if (btnGuardar) btnGuardar.innerText = 'Guardar Compra';
}

window.abrirModalEditarCompra = abrirModalEditarCompra;
window.eliminarCompra = eliminarCompra;

// --------------------------------------------------------------------------
// ACTUALIZAR KPIS PRINCIPALES
// --------------------------------------------------------------------------
function actualizarKPIsPrincipales(data) {
    const totalCompras = data.length;
    const inversion = data.reduce((sum, v) => sum + (parseFloat(v.TotalCompra) || 0), 0);

    const mesActual = new Date().getMonth();
    const anioActual = new Date().getFullYear();
    const comprasMes = data.filter(v => {
        if (!v.FechaCompra) return false;
        const d = new Date(v.FechaCompra);
        return d.getMonth() === mesActual && d.getFullYear() === anioActual;
    }).length;

    const e1 = document.getElementById('kpi-main-compras');
    if (e1) e1.innerText = totalCompras;

    const e2 = document.getElementById('kpi-main-inversion');
    if (e2) e2.innerText = 'C$ ' + inversion.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const e3 = document.getElementById('kpi-main-pendientes');
    if (e3) e3.innerText = comprasMes;
}

// --------------------------------------------------------------------------
// REPORTE DE COMPRAS Y EXPORTACIÓN A EXCEL
// --------------------------------------------------------------------------
let datosReporte = [];
let kpiTexto = "";

function calcularDatosReporte() {
    datosReporte = [];
    let totalInvertido = 0;
    const provCount = {};

    comprasData.forEach(c => {
        const fecha = c.FechaCompra ? c.FechaCompra.split('T')[0] : 'N/A';
        const total = c.TotalCompra ? parseFloat(c.TotalCompra) : 0;
        totalInvertido += total;

        datosReporte.push({
            id: c.idCompra,
            proveedor: c.Proveedor || 'N/A',
            factura: c.NumFactura || 'N/A',
            total: `C$ ${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
            fecha: fecha,
            estado: c.EstadoCompra || 'N/A'
        });

        const p = c.Proveedor || 'Desconocido';
        if (!provCount[p]) provCount[p] = 0;
        provCount[p] += total;
    });

    let maxProv = 'N/A';
    let maxGasto = 0;
    for (const [p, val] of Object.entries(provCount)) {
        if (val > maxGasto) {
            maxGasto = val;
            maxProv = p;
        }
    }

    kpiTexto = `El proveedor con mayor inversión es <strong>${maxProv}</strong> (C$ ${maxGasto.toLocaleString('en-US', { minimumFractionDigits: 2 })}). Inversión total en compras: <strong class="text-danger">C$ ${totalInvertido.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>.`;
}

function generarReporte(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (comprasData.length === 0) return alert("No hay datos de compras para generar el reporte.");
    calcularDatosReporte();

    const kpiEl = document.getElementById('kpi-compras');
    if (kpiEl) kpiEl.innerHTML = kpiTexto;

    const tbody = document.getElementById('cuerpo-tabla-reporte-compras');
    if (tbody) {
        tbody.innerHTML = '';
        datosReporte.forEach(item => {
            tbody.innerHTML += `
                <tr>
                    <td class="text-neon-green fw-bold">#${item.id}</td>
                    <td class="text-white">${item.proveedor}</td>
                    <td class="text-secondary">${item.factura}</td>
                    <td class="text-danger fw-bold">${item.total}</td>
                    <td class="text-white">${item.fecha}</td>
                </tr>
            `;
        });
    }
    const modalEl = document.getElementById('modalReporteCompras');
    if (modalEl) bootstrap.Modal.getOrCreateInstance(modalEl).show();
}

function descargarReporteExcel(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (!comprasData || comprasData.length === 0) return alert("No hay compras para exportar.");
    calcularDatosReporte();

    if (typeof XLSX !== 'undefined') {
        const wsData = [
            ["REPORTE GENERAL DE COMPRAS - AMI"],
            [`Fecha de Generación: ${new Date().toLocaleString()}`],
            [],
            ["ID Compra", "Proveedor", "N° Factura", "Total (C$)", "Fecha", "Estado"]
        ];

        datosReporte.forEach(item => {
            wsData.push([
                item.id,
                item.proveedor,
                item.factura,
                item.total,
                item.fecha,
                item.estado
            ]);
        });

        const ws = XLSX.utils.aoa_to_sheet(wsData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Compras");
        XLSX.writeFile(wb, `reporte_compras_${new Date().toISOString().split('T')[0]}.xlsx`);
    } else {
        let csvContent = "\uFEFFID,Proveedor,Factura,Total (C$),Fecha,Estado\n";
        datosReporte.forEach(item => {
            let prov = (item.proveedor || '').replace(/"/g, '""');
            csvContent += `"${item.id}","${prov}","${item.factura}","${item.total}","${item.fecha}","${item.estado}"\n`;
        });
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `reporte_compras_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

window.generarReporte = generarReporte;
window.descargarReporteExcel = descargarReporteExcel;
