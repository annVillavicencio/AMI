// ==========================================================================
// AMI - Módulo de Inventario (inventario.js)
// Gestión integral de vehículos, filtrado en tiempo real, KPIs y CRUD completo
// ==========================================================================

let autosData = [];
let autoEnEdicion = null;
let paginaActual = 1;
const elementosPorPagina = 8;

document.addEventListener('DOMContentLoaded', () => {
    cargarInventario();

    // 1. Buscador en tiempo real
    const inputBusqueda = document.getElementById('input-busqueda');
    const btnBuscar = document.getElementById('btn-buscar');

    if (inputBusqueda) {
        inputBusqueda.addEventListener('input', () => {
            paginaActual = 1;
            renderizarTabla();
        });
        inputBusqueda.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                paginaActual = 1;
                renderizarTabla();
            }
        });
    }

    if (btnBuscar) {
        btnBuscar.addEventListener('click', () => {
            paginaActual = 1;
            renderizarTabla();
        });
    }

    // 2. Filtro por Estado
    const filtroEstado = document.getElementById('filtro-estado');
    if (filtroEstado) {
        filtroEstado.addEventListener('change', () => {
            paginaActual = 1;
            renderizarTabla();
        });
    }

    // 3. Botón y formulario para Guardar Vehículo (Crear o Editar)
    const btnGuardar = document.getElementById('btn-guardar-auto');
    if (btnGuardar) {
        btnGuardar.addEventListener('click', guardarAuto);
    }

    const formAgregarAuto = document.querySelector('#modalAgregarAuto form');
    if (formAgregarAuto) {
        formAgregarAuto.addEventListener('submit', (e) => {
            e.preventDefault();
            guardarAuto();
        });
    }

    // 4. Limpieza del modal al cerrarse
    const modalEl = document.getElementById('modalAgregarAuto');
    if (modalEl) {
        modalEl.addEventListener('hidden.bs.modal', () => {
            limpiarFormularioModal();
        });
    }
});

// --------------------------------------------------------------------------
// CARGAR DATOS DESDE LA API
// --------------------------------------------------------------------------
async function cargarInventario() {
    try {
        const res = await fetch('/api/inventario');
        if (!res.ok) throw new Error(`Error HTTP: ${res.status}`);
        autosData = await res.json();
        renderizarTabla();
        actualizarEstadisticas();
    } catch (err) {
        console.error('Error al cargar inventario:', err);
        const tbody = document.getElementById('inventario-table-body');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="9" class="text-center text-danger py-4">
                <i class="bi bi-exclamation-triangle-fill me-2"></i> Error al cargar datos del servidor. Asegúrese de que el backend esté activo.
            </td></tr>`;
        }
    }
}

// --------------------------------------------------------------------------
// RENDERIZAR TABLA CON FILTROS Y PAGINACIÓN
// --------------------------------------------------------------------------
function renderizarTabla() {
    const tbody = document.getElementById('inventario-table-body');
    if (!tbody) return;

    const inputBusqueda = document.getElementById('input-busqueda');
    const filtroEstado = document.getElementById('filtro-estado');

    const busqueda = inputBusqueda ? inputBusqueda.value.trim().toLowerCase() : '';
    const estado = filtroEstado ? filtroEstado.value.trim() : 'Todos';

    tbody.innerHTML = '';

    // Filtrar lista
    const autosFiltrados = autosData.filter(auto => {
        const idStr = auto.ID_Auto ? String(auto.ID_Auto).toLowerCase() : '';
        const marca = (auto.Marca || '').toLowerCase();
        const modelo = (auto.Modelo || '').toLowerCase();
        const descripcion = (auto.Descripcion || '').toLowerCase();
        const placa = (auto.Placa || '').toLowerCase();
        const anioStr = auto.Anio ? String(auto.Anio) : '';
        const precioStr = auto.Precio ? String(auto.Precio) : '';

        const coincideBusqueda = !busqueda ||
            idStr.includes(busqueda) ||
            marca.includes(busqueda) ||
            modelo.includes(busqueda) ||
            descripcion.includes(busqueda) ||
            placa.includes(busqueda) ||
            anioStr.includes(busqueda) ||
            precioStr.includes(busqueda);

        const autoEstado = (auto.Estado || '').trim().toLowerCase();
        const coincideEstado = (estado === 'Todos' || !estado) || (autoEstado === estado.toLowerCase());

        return coincideBusqueda && coincideEstado;
    });

    const totalFiltrados = autosFiltrados.length;
    const totalPaginas = Math.ceil(totalFiltrados / elementosPorPagina) || 1;

    if (paginaActual > totalPaginas) paginaActual = totalPaginas;
    if (paginaActual < 1) paginaActual = 1;

    const inicio = (paginaActual - 1) * elementosPorPagina;
    const fin = Math.min(inicio + elementosPorPagina, totalFiltrados);
    const autosPaginados = autosFiltrados.slice(inicio, fin);

    // Actualizar contador
    const contador = document.getElementById('contador-vehiculos');
    if (contador) {
        if (totalFiltrados === 0) {
            contador.innerText = `Mostrando 0 a 0 de 0 vehículos`;
        } else {
            contador.innerText = `Mostrando ${inicio + 1} a ${fin} de ${totalFiltrados} vehículos (Total: ${autosData.length})`;
        }
    }

    // Renderizar paginador si existe
    renderizarPaginador(totalPaginas);

    if (autosPaginados.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" class="text-center text-muted py-4">
            <i class="bi bi-inbox fs-4 d-block mb-1"></i> No se encontraron vehículos que coincidan con la búsqueda.
        </td></tr>`;
        return;
    }

    // Construir filas
    autosPaginados.forEach(auto => {
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid rgba(255,255,255,0.05)';

        let estadoBadge = '';
        const est = (auto.Estado || '').trim().toLowerCase();
        if (est === 'disponible') {
            estadoBadge = '<span class="badge badge-activa rounded-pill px-3 py-1">Disponible</span>';
        } else if (est === 'vendido') {
            estadoBadge = '<span class="badge badge-finalizada rounded-pill px-3 py-1">Vendido</span>';
        } else {
            estadoBadge = `<span class="badge badge-programada rounded-pill px-3 py-1">${auto.Estado || 'Otro'}</span>`;
        }

        const precioNum = parseFloat(auto.Precio || 0);
        const precioFormateado = isNaN(precioNum) ? '0' : precioNum.toLocaleString('en-US');

        tr.innerHTML = `
            <td class="text-center fw-bold text-neon-green">#${auto.ID_Auto}</td>
            <td class="text-center fw-bold text-white">${auto.Marca || '-'}</td>
            <td class="text-center text-white">${auto.Modelo || '-'}</td>
            <td class="text-center text-secondary small text-truncate" style="max-width: 150px;" title="${auto.Descripcion || ''}">${auto.Descripcion || '-'}</td>
            <td class="text-center text-white"><span class="badge bg-dark border border-secondary px-2 py-1">${auto.Placa || 'S/P'}</span></td>
            <td class="text-center text-white">${auto.Anio || '-'}</td>
            <td class="text-center fw-bold text-white">C$${precioFormateado}</td>
            <td class="text-center">${estadoBadge}</td>
            <td class="text-center">
                <div class="dropdown">
                    <button class="btn btn-link text-secondary p-0 border-0" type="button" data-bs-toggle="dropdown" aria-expanded="false" title="Acciones">
                        <i class="bi bi-three-dots-vertical fs-5"></i>
                    </button>
                    <ul class="dropdown-menu dropdown-menu-dark dropdown-menu-end shadow" style="background-color: #1A2218; border: 1px solid rgba(255,255,255,0.1);">
                        <li>
                            <a class="dropdown-item text-white py-2" href="javascript:void(0)" onclick="abrirModalEditar(${auto.ID_Auto})">
                                <i class="bi bi-pencil-square me-2" style="color: #DBFF99;"></i> Editar
                            </a>
                        </li>
                        <li><hr class="dropdown-divider border-secondary opacity-25 my-1"></li>
                        <li>
                            <a class="dropdown-item text-danger py-2" href="javascript:void(0)" onclick="eliminarAuto(${auto.ID_Auto})">
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
// RENDERIZAR BOTONES DE PAGINACIÓN
// --------------------------------------------------------------------------
function renderizarPaginador(totalPaginas) {
    const contenedorPaginacion = document.querySelector('.pagination-dark');
    if (!contenedorPaginacion) return;

    let html = `
        <button class="btn btn-sm btn-dark-page me-1" ${paginaActual === 1 ? 'disabled' : ''} onclick="cambiarPagina(${paginaActual - 1})">
            <i class="bi bi-chevron-left"></i>
        </button>
    `;

    for (let p = 1; p <= totalPaginas; p++) {
        const activa = p === paginaActual ? 'btn-page-active' : 'btn-dark-page';
        html += `<button class="btn btn-sm ${activa} me-1" onclick="cambiarPagina(${p})">${p}</button>`;
    }

    html += `
        <button class="btn btn-sm btn-dark-page" ${paginaActual === totalPaginas ? 'disabled' : ''} onclick="cambiarPagina(${paginaActual + 1})">
            <i class="bi bi-chevron-right"></i>
        </button>
    `;

    contenedorPaginacion.innerHTML = html;
}

function cambiarPagina(nuevaPagina) {
    paginaActual = nuevaPagina;
    renderizarTabla();
}
window.cambiarPagina = cambiarPagina;

// --------------------------------------------------------------------------
// ACTUALIZAR TARJETAS KPI
// --------------------------------------------------------------------------
function actualizarEstadisticas() {
    let vendidos = 0;
    let disponibles = 0;
    let montoTotalVendido = 0;

    autosData.forEach(auto => {
        const est = (auto.Estado || '').trim().toLowerCase();
        const precio = parseFloat(auto.Precio || 0) || 0;

        if (est === 'vendido') {
            vendidos++;
            montoTotalVendido += precio;
        } else if (est === 'disponible') {
            disponibles++;
        }
    });

    const elemVendidos = document.getElementById('kpi-main-vehiculos');
    const elemValor = document.getElementById('kpi-main-valor');
    const elemDisponibles = document.getElementById('kpi-main-vendidos');

    if (elemVendidos) elemVendidos.innerText = vendidos;
    if (elemValor) elemValor.innerText = `C$${montoTotalVendido.toLocaleString('en-US')}`;
    if (elemDisponibles) elemDisponibles.innerText = disponibles;
}

// --------------------------------------------------------------------------
// GUARDAR VEHÍCULO (CREAR O EDITAR)
// --------------------------------------------------------------------------
async function guardarAuto(e) {
    if (e && e.preventDefault) e.preventDefault();

    const marca = document.getElementById('add-marca')?.value.trim();
    const modelo = document.getElementById('add-modelo')?.value.trim();
    const anio = document.getElementById('add-anio')?.value.trim();
    const precio = document.getElementById('add-precio')?.value.trim();
    const costo = document.getElementById('add-costo')?.value.trim();
    const fecha = document.getElementById('add-fecha')?.value;
    const placa = document.getElementById('add-placa')?.value.trim();
    const descripcion = document.getElementById('add-descripcion')?.value.trim();
    const estado = document.getElementById('add-estado')?.value;

    if (!marca || !modelo || !precio) {
        alert('Por favor complete los campos obligatorios: Marca, Modelo y Precio.');
        return;
    }

    const nuevoAuto = {
        Marca: marca,
        Modelo: modelo,
        Anio: parseInt(anio) || new Date().getFullYear(),
        Precio: parseFloat(precio) || 0,
        Estado: estado || 'Disponible',
        CostoAdquisicion: parseFloat(costo) || 0,
        Placa: placa || 'S/P',
        Descripcion: descripcion || `${marca} ${modelo}`,
        FechaIngresoInventario: fecha || new Date().toISOString().split('T')[0]
    };

    const metodoUrl = autoEnEdicion
        ? `/api/inventario/${autoEnEdicion}`
        : '/api/inventario';
    const metodoTipo = autoEnEdicion ? 'PUT' : 'POST';

    const btnGuardar = document.getElementById('btn-guardar-auto');
    const textoOriginal = btnGuardar ? btnGuardar.innerText : 'Guardar';

    try {
        if (btnGuardar) {
            btnGuardar.disabled = true;
            btnGuardar.innerText = 'Guardando...';
        }

        const respuesta = await fetch(metodoUrl, {
            method: metodoTipo,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(nuevoAuto)
        });

        if (btnGuardar) {
            btnGuardar.disabled = false;
            btnGuardar.innerText = textoOriginal;
        }

        if (!respuesta.ok) {
            const errJson = await respuesta.json().catch(() => ({}));
            throw new Error(errJson.error || 'Error al guardar en el servidor');
        }

        // Cerrar modal
        const modalEl = document.getElementById('modalAgregarAuto');
        if (modalEl) {
            const modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();
        }

        limpiarFormularioModal();
        await cargarInventario();
        alert(autoEnEdicion ? 'Vehículo actualizado con éxito.' : 'Vehículo registrado con éxito.');
    } catch (error) {
        if (btnGuardar) {
            btnGuardar.disabled = false;
            btnGuardar.innerText = textoOriginal;
        }
        console.error('Error al guardar vehículo:', error);
        alert('Error al guardar vehículo: ' + error.message);
    }
}

// --------------------------------------------------------------------------
// ABRIR MODAL PARA EDITAR
// --------------------------------------------------------------------------
function abrirModalEditar(idAuto) {
    const auto = autosData.find(a => a.ID_Auto === idAuto);
    if (!auto) {
        alert('No se encontró el vehículo seleccionado.');
        return;
    }

    autoEnEdicion = idAuto;

    const idInput = document.getElementById('add-id');
    if (idInput) idInput.value = auto.ID_Auto;

    const elMarca = document.getElementById('add-marca');
    if (elMarca) elMarca.value = auto.Marca || '';

    const elModelo = document.getElementById('add-modelo');
    if (elModelo) elModelo.value = auto.Modelo || '';

    const elAnio = document.getElementById('add-anio');
    if (elAnio) elAnio.value = auto.Anio || '';

    const elPrecio = document.getElementById('add-precio');
    if (elPrecio) elPrecio.value = auto.Precio || '';

    const elCosto = document.getElementById('add-costo');
    if (elCosto) elCosto.value = auto.CostoAdquisicion != null ? auto.CostoAdquisicion : '';

    const elFecha = document.getElementById('add-fecha');
    if (elFecha) {
        elFecha.value = auto.FechaIngresoInventario ? auto.FechaIngresoInventario.split('T')[0] : '';
    }

    const elPlaca = document.getElementById('add-placa');
    if (elPlaca) elPlaca.value = auto.Placa || '';

    const elDesc = document.getElementById('add-descripcion');
    if (elDesc) elDesc.value = auto.Descripcion || '';

    const elEstado = document.getElementById('add-estado');
    if (elEstado) elEstado.value = auto.Estado || 'Disponible';

    const btnGuardar = document.getElementById('btn-guardar-auto');
    if (btnGuardar) btnGuardar.innerText = 'Guardar Cambios';

    const label = document.getElementById('modalAgregarAutoLabel');
    if (label) {
        label.innerHTML = `<i class="bi bi-pencil-square text-neon-green me-2"></i>Editar Vehículo #${idAuto}`;
    }

    const modalEl = document.getElementById('modalAgregarAuto');
    if (modalEl) {
        const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
        modal.show();
    }
}

// --------------------------------------------------------------------------
// ELIMINAR VEHÍCULO
// --------------------------------------------------------------------------
async function eliminarAuto(idAuto) {
    if (!confirm(`¿Estás seguro de que deseas eliminar el vehículo con ID #${idAuto}?`)) return;

    try {
        const res = await fetch(`/api/inventario/${idAuto}`, {
            method: 'DELETE'
        });

        if (!res.ok) {
            const errJson = await res.json().catch(() => ({}));
            throw new Error(errJson.error || 'No se pudo eliminar el vehículo.');
        }

        await cargarInventario();
        alert('Vehículo eliminado con éxito.');
    } catch (err) {
        console.error('Error eliminando vehículo:', err);
        alert('Error al eliminar: ' + err.message + '\n(Nota: Si este auto tiene compras o ventas asociadas en la base de datos, no podrá ser eliminado por integridad referencial).');
    }
}

// --------------------------------------------------------------------------
// LIMPIAR FORMULARIO MODAL
// --------------------------------------------------------------------------
function limpiarFormularioModal() {
    autoEnEdicion = null;
    const ids = ['add-id', 'add-marca', 'add-modelo', 'add-anio', 'add-precio', 'add-costo', 'add-fecha', 'add-placa', 'add-descripcion'];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });

    const elEstado = document.getElementById('add-estado');
    if (elEstado) elEstado.value = 'Disponible';

    const btnGuardar = document.getElementById('btn-guardar-auto');
    if (btnGuardar) btnGuardar.innerText = 'Guardar Vehículo';

    const label = document.getElementById('modalAgregarAutoLabel');
    if (label) {
        label.innerHTML = '<i class="bi bi-car-front text-neon-green me-2"></i>Agregar Nuevo Vehículo';
    }
}

window.abrirModalEditar = abrirModalEditar;
window.eliminarAuto = eliminarAuto;

// --------------------------------------------------------------------------
// REPORTE DE VENTAS Y EXPORTACIÓN A CSV / EXCEL
// --------------------------------------------------------------------------
let datosReporteActual = [];

function calcularDatosReporte() {
    const reporteAgrupado = {};
    const autosVendidos = autosData.filter(auto => (auto.Estado || '').trim().toLowerCase() === 'vendido');

    autosVendidos.forEach(auto => {
        const clave = `${auto.Marca || 'N/A'} ${auto.Modelo || 'N/A'}`;
        if (!reporteAgrupado[clave]) {
            reporteAgrupado[clave] = {
                marca: auto.Marca || 'N/A',
                modelo: auto.Modelo || 'N/A',
                unidadesVendidas: 0,
                precioMax: parseFloat(auto.Precio || 0)
            };
        }
        reporteAgrupado[clave].unidadesVendidas++;
        const p = parseFloat(auto.Precio || 0);
        if (p > reporteAgrupado[clave].precioMax) {
            reporteAgrupado[clave].precioMax = p;
        }
    });

    datosReporteActual = Object.values(reporteAgrupado);
    datosReporteActual.sort((a, b) => b.precioMax - a.precioMax);
}

function generarReporte() {
    calcularDatosReporte();

    const tbody = document.getElementById('cuerpo-tabla-reporte');
    if (tbody) {
        tbody.innerHTML = '';
        if (datosReporteActual.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-3">No hay registros de vehículos vendidos para generar reporte.</td></tr>';
        } else {
            datosReporteActual.forEach(item => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td class="text-white">${item.marca}</td>
                    <td class="text-white">${item.modelo}</td>
                    <td class="text-center text-info fw-bold">${item.unidadesVendidas}</td>
                    <td class="text-success fw-bold">C$${item.precioMax.toLocaleString('en-US')}</td>
                `;
                tbody.appendChild(tr);
            });
        }
    }

    const modalReporteEl = document.getElementById('modalReporte');
    if (modalReporteEl) {
        const modalReporte = bootstrap.Modal.getOrCreateInstance(modalReporteEl);
        modalReporte.show();
    }
}

function descargarReporteExcel() {
    calcularDatosReporte();

    if (datosReporteActual.length === 0) {
        alert('No hay datos de ventas disponibles para exportar.');
        return;
    }

    let csvContent = '\uFEFFMarca,Modelo,Unidades Vendidas,Precio Máximo (C$)\n';
    datosReporteActual.forEach(item => {
        csvContent += `"${item.marca}","${item.modelo}",${item.unidadesVendidas},${item.precioMax}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `reporte_inventario_ventas_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

window.generarReporte = generarReporte;
window.descargarReporteExcel = descargarReporteExcel;
