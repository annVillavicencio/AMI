let autosData = [];
let autoEnEdicion = null;

document.addEventListener('DOMContentLoaded', () => {
    cargarInventario();

    const inputBusqueda = document.getElementById('input-busqueda');
    const filtroEstado = document.getElementById('filtro-estado');

    if (inputBusqueda) inputBusqueda.addEventListener('input', renderizarTabla);
    if (filtroEstado) filtroEstado.addEventListener('change', renderizarTabla);

    document.getElementById('btn-guardar-auto').addEventListener('click', guardarAuto);

    const modalAgregarAuto = document.getElementById('modalAgregarAuto');
    if (modalAgregarAuto) {
        modalAgregarAuto.addEventListener('hidden.bs.modal', () => {
            autoEnEdicion = null;
            document.getElementById('add-marca').value = '';
            document.getElementById('add-modelo').value = '';
            document.getElementById('add-anio').value = '';
            document.getElementById('add-precio').value = '';
            document.getElementById('add-costo').value = '';
            document.getElementById('add-fecha').value = '';
            document.getElementById('add-placa').value = '';
            document.getElementById('add-descripcion').value = '';
            document.getElementById('add-estado').value = 'Disponible';
            document.getElementById('btn-guardar-auto').innerText = 'Guardar VehÃ­culo';
            document.getElementById('modalAgregarAutoLabel').innerHTML = '<i class="bi bi-car-front text-neon-green me-2"></i>Agregar Nuevo VehÃ­culo';
        });
    }
});

async function cargarInventario() {
    try {
        const res = await fetch('http://localhost:3000/api/inventario');
        if (!res.ok) throw new Error('Error al cargar inventario');
        autosData = await res.json();
        renderizarTabla();
        actualizarEstadisticas();
    } catch (err) {
        console.error('Error cargando inventario:', err);
    }
}

function renderizarTabla() {
    actualizarKPIsPrincipales(autosData);

    const tbody = document.getElementById('inventario-table-body');
    if (!tbody) return;

    const inputBusqueda = document.getElementById('input-busqueda');
    const filtroEstado = document.getElementById('filtro-estado');

    const busqueda = inputBusqueda ? inputBusqueda.value.toLowerCase() : '';
    const estado = filtroEstado ? filtroEstado.value : 'Todos';

    tbody.innerHTML = '';

    const autosFiltrados = autosData.filter(auto => {
        const marca = (auto.Marca || '').toLowerCase();
        const modelo = (auto.Modelo || '').toLowerCase();
        const descripcion = (auto.Descripcion || '').toLowerCase();

        const coincideBusqueda = marca.includes(busqueda) || modelo.includes(busqueda) || descripcion.includes(busqueda);
        const coincideEstado = estado === 'Todos' || auto.Estado === estado;

        return coincideBusqueda && coincideEstado;
    });

    if (autosFiltrados.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted">No se encontraron autos.</td></tr>`;
        return;
    }

    autosFiltrados.forEach(auto => {
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid rgba(255,255,255,0.05)';

        let badgeClass = auto.Estado === 'Disponible' ? 'bg-success text-white' : 'bg-secondary text-white';
        let estadoBadge = `<span class="badge ${badgeClass} rounded-pill px-3 py-2">${auto.Estado}</span>`;

        tr.innerHTML = `
            <td class="align-middle fw-bold text-neon-green">#${auto.ID_Auto}</td>
            <td class="align-middle fw-bold">${auto.Marca || 'N/A'}</td>
            <td class="align-middle">${auto.Modelo || 'N/A'}</td>
            <td class="align-middle text-muted small">${auto.Descripcion || ''}</td>
            <td class="align-middle">${auto.Placa || 'N/A'}</td>
            <td class="align-middle">${auto.Anio || 'N/A'}</td>
            <td class="align-middle fw-bold">C${parseFloat(auto.Precio || 0).toLocaleString()}</td>
            <td class="align-middle">${estadoBadge}</td>
            <td class="align-middle text-end">
                <button class="btn btn-sm btn-outline-light rounded-circle me-1" onclick="abrirModalEditar(${auto.ID_Auto})">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger rounded-circle" onclick="eliminarAuto(${auto.ID_Auto})">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function actualizarEstadisticas() {
    const disponibles = autosData.filter(a => a.Estado === 'Disponible').length;
    const vendidos = autosData.filter(a => a.Estado === 'Vendido').length;

    let ingresos = 0;
    autosData.filter(a => a.Estado === 'Vendido').forEach(a => {
        ingresos += parseFloat(a.Precio || 0);
    });

    const valDisponibles = document.querySelector('.val-disponibles');
    const valVendidos = document.querySelector('.val-vendidos');
    const valIngresos = document.querySelector('.val-ingresos');

    if (valDisponibles) valDisponibles.innerText = disponibles;
    if (valVendidos) valVendidos.innerText = vendidos;
    if (valIngresos) valIngresos.innerText = `C$${ingresos.toLocaleString()}`;
}

async function guardarAuto() {
    const marca = document.getElementById('add-marca').value.trim();
    const modelo = document.getElementById('add-modelo').value.trim();
    const anio = document.getElementById('add-anio').value;
    const precio = document.getElementById('add-precio').value;
    const costo = document.getElementById('add-costo').value;
    const fecha = document.getElementById('add-fecha').value;
    const placa = document.getElementById('add-placa').value.trim();
    const descripcion = document.getElementById('add-descripcion').value.trim();
    const estado = document.getElementById('add-estado').value;

    if (!marca || !modelo || !precio) {
        alert('Marca, Modelo y Precio son obligatorios.');
        return;
    }

    const nuevoAuto = {
        Marca: marca,
        Modelo: modelo,
        Anio: anio,
        Precio: precio,
        Estado: estado,
        CostoAdquisicion: costo,
        Placa: placa,
        Descripcion: descripcion,
        FechaIngresoInventario: fecha
    };

    const metodoUrl = autoEnEdicion
        ? `http://localhost:3000/api/inventario/${autoEnEdicion}`
        : 'http://localhost:3000/api/inventario';
    const metodoTipo = autoEnEdicion ? 'PUT' : 'POST';

    try {
        const respuesta = await fetch(metodoUrl, {
            method: metodoTipo,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(nuevoAuto)
        });
        if (!respuesta.ok) throw new Error('Error al guardar en el servidor');

        const modal = bootstrap.Modal.getInstance(document.getElementById('modalAgregarAuto'));
        if (modal) modal.hide();

        await cargarInventario();
    } catch (error) {
        console.error('Error al guardar el auto:', error);
        alert('Error al guardar el auto.');
    }
}

async function eliminarAuto(idAuto) {
    if (!confirm('Â¿Seguro que deseas eliminar este vehÃ­culo?')) return;
    try {
        const res = await fetch(`http://localhost:3000/api/inventario/${idAuto}`, {
            method: 'DELETE'
        });
        if (res.ok) {
            cargarInventario();
        }
    } catch (err) {
        console.error('Error eliminando vehÃ­culo:', err);
    }
}

function abrirModalEditar(idAuto) {
    const auto = autosData.find(a => a.ID_Auto === idAuto);
    if (!auto) return;
    autoEnEdicion = idAuto;

    document.getElementById('add-marca').value = auto.Marca || '';
    document.getElementById('add-modelo').value = auto.Modelo || '';
    document.getElementById('add-anio').value = auto.Anio || '';
    document.getElementById('add-precio').value = auto.Precio || '';
    document.getElementById('add-costo').value = auto.CostoAdquisicion || auto.Precio || '';
    if (auto.FechaIngresoInventario) {
        document.getElementById('add-fecha').value = auto.FechaIngresoInventario.split('T')[0];
    }
    document.getElementById('add-placa').value = auto.Placa || '';
    document.getElementById('add-descripcion').value = auto.Descripcion || '';
    document.getElementById('add-estado').value = auto.Estado || 'Disponible';

    document.getElementById('btn-guardar-auto').innerText = 'Guardar Cambios';
    document.getElementById('modalAgregarAutoLabel').innerHTML = '<i class="bi bi-pencil-square text-neon-green me-2"></i>Editar VehÃ­culo';

    const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('modalAgregarAuto'));
    modal.show();
}

window.eliminarAuto = eliminarAuto;
window.abrirModalEditar = abrirModalEditar;




// --- REPORTE DE VENTAS ---
let datosReporteActual = [];

function calcularDatosReporte() {
    const reporteAgrupado = {};
    const autosVendidos = autosData.filter(auto => auto.Estado === 'Vendido');

    autosVendidos.forEach(auto => {
        const modeloCompleto = `${auto.Marca} ${auto.Modelo}`;
        if (!reporteAgrupado[modeloCompleto]) {
            reporteAgrupado[modeloCompleto] = {
                marca: auto.Marca || "N/A",
                modelo: auto.Modelo || "N/A",
                unidadesVendidas: 0,
                precio: parseFloat(auto.Precio || 0)
            };
        }
        reporteAgrupado[modeloCompleto].unidadesVendidas++;
        if (parseFloat(auto.Precio || 0) > reporteAgrupado[modeloCompleto].precio) {
            reporteAgrupado[modeloCompleto].precio = parseFloat(auto.Precio || 0);
        }
    });

    datosReporteActual = Object.values(reporteAgrupado);
    datosReporteActual.sort((a, b) => b.precio - a.precio);
}

// 1. Mostrar la pestaÃ±a
function generarReporte() {
    calcularDatosReporte();

    const tbody = document.getElementById('cuerpo-tabla-reporte');
    if(tbody) {
        tbody.innerHTML = ''; 
        datosReporteActual.forEach(item => {
            tbody.innerHTML += `
                <tr>
                    <td>${item.marca}</td>
                    <td>${item.modelo}</td>
                    <td class="text-center text-info fw-bold">${item.unidadesVendidas}</td>
                    <td class="text-success">$${item.precio.toLocaleString()}</td>
                </tr>
            `;
        });
    }

    const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('modalReporte'));
    modal.show();
}

// 2. Descargar el Excel
function descargarReporteExcel() {
    if (datosReporteActual.length === 0) {
        calcularDatosReporte();
    }

    if (datosReporteActual.length === 0) {
        alert("No hay ventas registradas para exportar.");
        return;
    }

    let csvContent = "ï»¿Marca,Modelo,Unidades Vendidas,Precio Maximo\n";
    datosReporteActual.forEach(item => {
        csvContent += `${item.marca},${item.modelo},${item.unidadesVendidas},${item.precio}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "reporte_ventas.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

window.generarReporte = generarReporte;
window.descargarReporteExcel = descargarReporteExcel;


function actualizarKPIsPrincipales(data) {
    let totalAutos = data.length;
    let valor = data.reduce((sum, a) => sum + (parseFloat(a.Precio) || 0), 0);
    let disp = data.filter(a => a.Estado === 'Disponible').length;

    let e1 = document.getElementById('kpi-main-vehiculos');
    if(e1) e1.innerText = totalAutos;
    
    let e2 = document.getElementById('kpi-main-valor');
    if(e2) e2.innerText = '$' + valor.toFixed(2);
    
    let e3 = document.getElementById('kpi-main-vendidos');
    if(e3) e3.innerText = disp;
}


