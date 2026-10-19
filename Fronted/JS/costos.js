// ==========================================================================
// AMI - Módulo de Costos (costos.js)
// Gestión integral de gastos por estancamiento, filtros, KPIs y CRUD completo
// ==========================================================================

let costosData = [];
let autosLista = [];
let costoEnEdicion = null;

document.addEventListener("DOMContentLoaded", () => {
    cargarDatos();

    // 1. Buscador en tiempo real
    const searchInput = document.querySelector('input[placeholder*="Buscar"]');
    if (searchInput) {
        searchInput.addEventListener('input', () => { renderizarTabla(); });
        searchInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') renderizarTabla();
        });
    }

    // 2. Filtro de Categoría
    const filtroCat = document.getElementById('filtro-categoria');
    if (filtroCat) {
        filtroCat.addEventListener('change', () => { renderizarTabla(); });
    }

    // 3. Formulario para guardar costo (Crear o Editar)
    const formCosto = document.getElementById('formAgregarCosto');
    if (formCosto) {
        formCosto.addEventListener('submit', guardarCosto);
    }

    // 4. Limpieza del modal al cerrarse
    const modalEl = document.getElementById('modalAgregarCosto');
    if (modalEl) {
        modalEl.addEventListener('hidden.bs.modal', () => {
            limpiarFormularioCosto();
        });
    }
});

// --------------------------------------------------------------------------
// CARGAR DATOS DESDE LA API
// --------------------------------------------------------------------------
async function cargarDatos() {
    try {
        const [resCostos, resAutos] = await Promise.all([
            fetch('/api/costos'),
            fetch('/api/costos/autos').catch(() => null)
        ]);

        if (!resCostos.ok) throw new Error('Error al cargar costos del servidor');
        costosData = await resCostos.json();

        if (resAutos && resAutos.ok) {
            autosLista = await resAutos.json();
            poblarSelectAutos();
        }

        renderizarTabla();
        actualizarKPIsPrincipales(costosData);
    } catch (e) {
        console.error('Error cargando datos de costos:', e);
        const tbody = document.getElementById("cuerpo-tabla");
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center text-danger py-4"><i class="bi bi-exclamation-triangle-fill me-2"></i> Error al cargar datos del servidor.</td></tr>';
        }
    }
}

// --------------------------------------------------------------------------
// POBLAR SELECT DE AUTOS EN EL MODAL
// --------------------------------------------------------------------------
function poblarSelectAutos() {
    const select = document.getElementById('idAutoCosto');
    if (!select) return;

    select.innerHTML = '<option value="" selected disabled>Seleccione un auto</option>';
    autosLista.forEach(auto => {
        const opt = document.createElement('option');
        opt.value = auto.idAuto;
        opt.textContent = `#${auto.idAuto} - ${auto.Auto}`;
        select.appendChild(opt);
    });
}

// --------------------------------------------------------------------------
// RENDERIZAR TABLA CON FILTROS
// --------------------------------------------------------------------------
function renderizarTabla() {
    const tbody = document.getElementById("cuerpo-tabla");
    if (!tbody) return;
    tbody.innerHTML = "";

    const searchInput = document.querySelector('input[placeholder*="Buscar"]');
    const busqueda = searchInput ? searchInput.value.trim().toLowerCase() : '';

    const filtroCat = document.getElementById('filtro-categoria');
    const catFiltro = filtroCat ? filtroCat.value.trim().toLowerCase() : 'todos';

    const filtrados = costosData.filter(c => {
        const idStr = c.idCostoEstan ? String(c.idCostoEstan) : '';
        const auto = (c.Auto || '').toLowerCase();
        const cat = (c.Categoria || '').toLowerCase();
        const desc = (c.Descripcion || '').toLowerCase();
        const montoStr = c.Monto ? String(c.Monto) : '';

        const coincideBusqueda = !busqueda ||
            idStr.includes(busqueda) ||
            auto.includes(busqueda) ||
            cat.includes(busqueda) ||
            desc.includes(busqueda) ||
            montoStr.includes(busqueda);

        const coincideCat = (catFiltro === 'todas las categorías' || catFiltro === 'todos' || !catFiltro) ||
            cat.includes(catFiltro);

        return coincideBusqueda && coincideCat;
    });

    actualizarKPIsPrincipales(filtrados);

    if (filtrados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-4"><i class="bi bi-inbox fs-4 d-block mb-1"></i> No se encontraron gastos registrados.</td></tr>';
        return;
    }

    filtrados.forEach(c => {
        let f = c.FechaGasto ? new Date(c.FechaGasto).toISOString().split('T')[0] : 'N/A';
        let m = c.Monto ? parseFloat(c.Monto).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00';

        let badgeClass = 'badge-programada';
        const catLower = (c.Categoria || '').toLowerCase();
        if (catLower.includes('mantenimiento')) badgeClass = 'badge-activa';
        else if (catLower.includes('reparaci')) badgeClass = 'badge-finalizada';

        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
        tr.innerHTML = `
            <td class="text-center fw-bold text-neon-green">#${c.idCostoEstan}</td>
            <td class="text-center text-white fw-bold">${c.Auto || 'N/A'}</td>
            <td class="text-center"><span class="badge ${badgeClass} rounded-pill px-3 py-1">${c.Categoria || 'Otro'}</span></td>
            <td class="text-center text-secondary small text-truncate" style="max-width:180px;" title="${c.Descripcion || ''}">${c.Descripcion || '-'}</td>
            <td class="text-center text-secondary">${f}</td>
            <td class="text-center text-danger fw-bold">C$ ${m}</td>
            <td class="text-center">
                <div class="dropdown">
                    <button class="btn btn-link text-secondary p-0 border-0" type="button" data-bs-toggle="dropdown" aria-expanded="false" title="Acciones">
                        <i class="bi bi-three-dots-vertical fs-5"></i>
                    </button>
                    <ul class="dropdown-menu dropdown-menu-dark dropdown-menu-end shadow" style="background-color: #1A2218; border: 1px solid rgba(255,255,255,0.1);">
                        <li>
                            <a class="dropdown-item text-white py-2" href="javascript:void(0)" onclick="abrirModalEditarCosto(${c.idCostoEstan})">
                                <i class="bi bi-pencil-square me-2" style="color: #DBFF99;"></i> Editar
                            </a>
                        </li>
                        <li><hr class="dropdown-divider border-secondary opacity-25 my-1"></li>
                        <li>
                            <a class="dropdown-item text-danger py-2" href="javascript:void(0)" onclick="eliminarCosto(${c.idCostoEstan})">
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
// GUARDAR GASTO (CREAR O EDITAR)
// --------------------------------------------------------------------------
async function guardarCosto(e) {
    if (e && e.preventDefault) e.preventDefault();

    const idAuto = document.getElementById('idAutoCosto')?.value;
    const idCategoria = document.getElementById('idCategoriaCosto')?.value;
    const descripcion = document.getElementById('descripcionCosto')?.value.trim();
    const fecha = document.getElementById('fechaCosto')?.value;
    const monto = document.getElementById('montoCosto')?.value;

    if (!idAuto || !idCategoria || !monto) {
        alert('Por favor complete los campos obligatorios: Auto, Categoría y Monto.');
        return;
    }

    const payload = {
        idAuto: parseInt(idAuto),
        idCategoria: parseInt(idCategoria),
        Descripcion: descripcion || '',
        FechaGasto: fecha || new Date().toISOString().split('T')[0],
        Monto: parseFloat(monto)
    };

    const url = costoEnEdicion ? `/api/costos/${costoEnEdicion}` : '/api/costos';
    const method = costoEnEdicion ? 'PUT' : 'POST';

    try {
        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || 'Error al guardar el gasto');
        }

        const modalEl = document.getElementById('modalAgregarCosto');
        if (modalEl) {
            const modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();
        }

        limpiarFormularioCosto();
        await cargarDatos();
        alert(costoEnEdicion ? 'Gasto actualizado con éxito.' : 'Gasto registrado con éxito.');
    } catch (err) {
        console.error('Error al guardar costo:', err);
        alert('Error al guardar gasto: ' + err.message);
    }
}

// --------------------------------------------------------------------------
// ABRIR MODAL PARA EDITAR
// --------------------------------------------------------------------------
function abrirModalEditarCosto(id) {
    const costo = costosData.find(c => c.idCostoEstan === id);
    if (!costo) {
        alert('No se encontró el gasto seleccionado.');
        return;
    }

    costoEnEdicion = id;

    const elAuto = document.getElementById('idAutoCosto');
    if (elAuto && costo.idAuto) elAuto.value = costo.idAuto;

    const elCat = document.getElementById('idCategoriaCosto');
    if (elCat && costo.idCategoria) elCat.value = costo.idCategoria;

    const elDesc = document.getElementById('descripcionCosto');
    if (elDesc) elDesc.value = costo.Descripcion || '';

    const elFecha = document.getElementById('fechaCosto');
    if (elFecha) {
        elFecha.value = costo.FechaGasto ? costo.FechaGasto.split('T')[0] : '';
    }

    const elMonto = document.getElementById('montoCosto');
    if (elMonto) elMonto.value = costo.Monto != null ? costo.Monto : '';

    const label = document.getElementById('modalAgregarCostoLabel');
    if (label) {
        label.innerHTML = `<i class="bi bi-pencil-square text-neon-green me-2"></i>Editar Gasto #${id}`;
    }

    const modalEl = document.getElementById('modalAgregarCosto');
    if (modalEl) {
        const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
        modal.show();
    }
}

// --------------------------------------------------------------------------
// ELIMINAR GASTO
// --------------------------------------------------------------------------
async function eliminarCosto(id) {
    if (!confirm(`¿Estás seguro de que deseas eliminar el gasto con ID #${id}?`)) return;

    try {
        const res = await fetch(`/api/costos/${id}`, {
            method: 'DELETE'
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || 'No se pudo eliminar el gasto.');
        }

        await cargarDatos();
        alert('Gasto eliminado con éxito.');
    } catch (err) {
        console.error('Error eliminando costo:', err);
        alert('Error al eliminar: ' + err.message);
    }
}

// --------------------------------------------------------------------------
// LIMPIAR FORMULARIO
// --------------------------------------------------------------------------
function limpiarFormularioCosto() {
    costoEnEdicion = null;
    const form = document.getElementById('formAgregarCosto');
    if (form) form.reset();

    const label = document.getElementById('modalAgregarCostoLabel');
    if (label) {
        label.innerHTML = '<i class="bi bi-receipt-cutoff text-neon-green me-2"></i>Agregar nuevo gasto';
    }
}

window.abrirModalEditarCosto = abrirModalEditarCosto;
window.eliminarCosto = eliminarCosto;

// --------------------------------------------------------------------------
// ACTUALIZAR KPIS PRINCIPALES
// --------------------------------------------------------------------------
function actualizarKPIsPrincipales(data) {
    let gastos = data.reduce((sum, v) => sum + (parseFloat(v.Monto) || 0), 0);
    let maint = data.filter(v => (v.Categoria || '').toLowerCase().includes('mantenimiento'))
                    .reduce((sum, v) => sum + (parseFloat(v.Monto) || 0), 0);
    let rep = data.filter(v => (v.Categoria || '').toLowerCase().includes('reparaci'))
                  .reduce((sum, v) => sum + (parseFloat(v.Monto) || 0), 0);
    let otros = gastos - maint - rep;

    const e1 = document.getElementById('kpi-costos-mantenimiento');
    if (e1) e1.innerText = "C$ " + maint.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const e2 = document.getElementById('kpi-costos-reparacion');
    if (e2) e2.innerText = "C$ " + rep.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const e3 = document.getElementById('kpi-costos-otros');
    if (e3) e3.innerText = "C$ " + otros.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const e4 = document.getElementById('kpi-costos-total');
    if (e4) e4.innerText = "C$ " + gastos.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// --------------------------------------------------------------------------
// REPORTE Y EXPORTACIÓN EXCEL
// --------------------------------------------------------------------------
let datosRC = [];

function calcularRC() {
    datosRC = [];
    let total = 0;
    let cats = {};

    costosData.forEach(c => {
        let m = c.Monto ? parseFloat(c.Monto) : 0;
        total += m;
        let cat = c.Categoria || 'N/A';
        cats[cat] = (cats[cat] || 0) + m;
        datosRC.push({
            id: c.idCostoEstan,
            auto: c.Auto || 'N/A',
            cat: cat,
            desc: c.Descripcion || 'N/A',
            f: c.FechaGasto ? c.FechaGasto.split('T')[0] : 'N/A',
            m_raw: m,
            m: "C$ " + m.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        });
    });

    datosRC.sort((a, b) => b.m_raw - a.m_raw);

    let maxC = 'N/A';
    let maxV = 0;
    for (const [k, v] of Object.entries(cats)) {
        if (v > maxV) { maxV = v; maxC = k; }
    }

    const kpiEl = document.getElementById('kpi-costos');
    if (kpiEl) {
        kpiEl.innerHTML = `Gasto total: <strong class="text-danger">C$ ${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>. La categoría de mayor costo es <strong>${maxC}</strong> (C$ ${maxV.toLocaleString('en-US', { minimumFractionDigits: 2 })}).`;
    }
}

function generarReporte() {
    if (costosData.length === 0) return;
    calcularRC();
    const tb = document.getElementById('cuerpo-tabla-reporte-costos');
    if (tb) {
        tb.innerHTML = '';
        datosRC.forEach(i => {
            tb.innerHTML += `<tr>
                <td class="text-neon-green fw-bold">#${i.id}</td>
                <td class="text-white">${i.auto}</td>
                <td class="text-info">${i.cat}</td>
                <td class="text-danger fw-bold">${i.m}</td>
                <td class="text-secondary">${i.f}</td>
            </tr>`;
        });
    }
    const modalEl = document.getElementById('modalReporteCostos');
    if (modalEl) bootstrap.Modal.getOrCreateInstance(modalEl).show();
}

function descargarReporteExcel() {
    if (costosData.length === 0) return;
    calcularRC();
    let csv = "\uFEFFID,Auto,Categoría,Descripción,Monto (C$),Fecha\n";
    datosRC.forEach(i => {
        csv += `"${i.id}","${i.auto}","${i.cat}","${i.desc.replace(/"/g, '""')}","${i.m}","${i.f}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `reporte_costos_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

window.generarReporte = generarReporte;
window.descargarReporteExcel = descargarReporteExcel;
