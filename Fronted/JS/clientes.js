let clientesData = []; // AquÃ­ guardaremos todos los clientes temporalmente
let clienteEnEdicion = null; // GuardarÃ¡ el ID del cliente que se estÃ¡ editando

document.addEventListener('DOMContentLoaded', () => {
    cargarClientes();

    // Cada vez que el usuario escriba en el buscador se filtrarÃ¡ la tabla
    const inputBusqueda = document.getElementById('input-busqueda');
    if (inputBusqueda) {
        inputBusqueda.addEventListener('input', renderizarTabla);
    }
    
    const btnGuardar = document.getElementById('btn-guardar-cliente');
    if (btnGuardar) {
        btnGuardar.addEventListener('click', guardarCliente);
    }
    
    // Al abrir el modal de agregar, nos aseguramos que estÃ© en modo "Agregar"
    const modalCliente = document.getElementById('modalCliente');
    if (modalCliente) {
        modalCliente.addEventListener('hidden.bs.modal', () => {
            clienteEnEdicion = null;
            document.getElementById('input-nombre').value = '';
            document.getElementById('input-apellido').value = '';
            document.getElementById('input-telefono').value = '';
            document.getElementById('input-correo').value = '';
            document.getElementById('input-cedula').value = '';
            document.getElementById('btn-guardar-cliente').innerText = 'Guardar Cliente';
        });
    }
});

async function cargarClientes() {
    const tbody = document.getElementById('clientes-table-body');
    try {
        const respuesta = await fetch('http://localhost:3000/api/clientes');
        if (!respuesta.ok) throw new Error('Error en la respuesta del servidor');

        clientesData = await respuesta.json(); // Guardamos los datos

        renderizarTabla(); // Dibuja la tabla (aplicando filtros si los hay)
        actualizarEstadisticas(); // Actualiza las tarjetas de la derecha
    } catch (error) {
        console.error('Error al cargar clientes:', error);
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="8" class="text-center text-danger">Error al cargar los datos.</td></tr>`;
        }
    }
}

function renderizarTabla() {
    actualizarKPIsPrincipales(clientesData);

    const tbody = document.getElementById('clientes-table-body');
    if (!tbody) return;
    
    // Obtenemos lo que escribiste en el buscador, en minÃºsculas
    const busquedaElement = document.getElementById('input-busqueda');
    const busqueda = busquedaElement ? busquedaElement.value.toLowerCase() : '';

    // Filtramos la lista de clientes
    const clientesFiltrados = clientesData.filter(cliente => {
        // Busca si el texto escrito coincide con Nombre, Apellido, Telefono o Correo
        const coincideBusqueda = 
            (cliente.Nombre && cliente.Nombre.toLowerCase().includes(busqueda)) ||
            (cliente.Apellido && cliente.Apellido.toLowerCase().includes(busqueda)) ||
            (cliente.Telefono && cliente.Telefono.toLowerCase().includes(busqueda)) ||
            (cliente.Correo && cliente.Correo.toLowerCase().includes(busqueda)) ||
            (cliente.Cedula && cliente.Cedula.toLowerCase().includes(busqueda));

        return coincideBusqueda; 
    });

    tbody.innerHTML = '';

    if (clientesFiltrados.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted">No se encontraron clientes con esos filtros.</td></tr>`;
        return;
    }

    clientesFiltrados.forEach(cliente => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="text-center fw-bold text-secondary">#${cliente.IdClientes}</td>
            <td class="text-center">${cliente.Nombre}</td>
            <td class="text-center">${cliente.Apellido}</td>
            <td class="text-center">${cliente.Telefono}</td>
            <td class="text-center text-secondary">${cliente.Correo}</td>
            <td class="text-center">${cliente.Cedula}</td>
            
            <td class="text-center">
               <div class="dropdown">
                    <button class="btn btn-link text-secondary p-0 border-0" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                        <i class="bi bi-three-dots-vertical fs-5"></i>
                    </button>
                    <ul class="dropdown-menu dropdown-menu-dark shadow-sm" style="background-color: #1A2218; border: 1px solid rgba(255,255,255,0.05);">
                    <li><a class="dropdown-item text-white py-2" href="#" onclick="abrirModalEditar(${cliente.IdClientes})"><i class="bi bi-pencil-square me-2" style="color: #DBFF99;"></i> Editar</a></li>
                    <li><hr class="dropdown-divider border-secondary opacity-25 my-1"></li>
                    <li><a class="dropdown-item text-danger py-2" href="#" onclick="eliminarCliente(${cliente.IdClientes})"><i class="bi bi-trash me-2"></i> Borrar</a></li>
                    </ul>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function actualizarEstadisticas() {
    const totalClientes = clientesData.length;

    // Solo actualizamos el total de clientes, los demÃ¡s quedan estÃ¡ticos por ahora
    const elemTotal = document.getElementById('stat-clientes-total');
    if (elemTotal) elemTotal.innerText = totalClientes;
}

async function guardarCliente() {
    const nombre = document.getElementById('input-nombre').value;
    const apellido = document.getElementById('input-apellido').value;
    const telefono = document.getElementById('input-telefono').value;
    const correo = document.getElementById('input-correo').value;
    const cedula = document.getElementById('input-cedula').value;

    if (!nombre || !apellido || !telefono || !cedula) {
        alert("Faltan campos obligatorios (Nombre, Apellido, Telefono, Cedula)");
        return;
    }

    const nuevoCliente = {
        Nombre: nombre,
        Apellido: apellido,
        Telefono: telefono,
        Correo: correo || 'N/A',
        Cedula: cedula
    };

    const metodoUrl = clienteEnEdicion 
        ? `http://localhost:3000/api/clientes/${clienteEnEdicion}` 
        : 'http://localhost:3000/api/clientes';
    const metodoTipo = clienteEnEdicion ? 'PUT' : 'POST';

    try {
        const respuesta = await fetch(metodoUrl, {
            method: metodoTipo,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(nuevoCliente)
        });
        if (!respuesta.ok) throw new Error('Error al guardar en el servidor');

        const modal = bootstrap.Modal.getInstance(document.getElementById('modalCliente'));
        if (modal) modal.hide();
        
        await cargarClientes();
        alert(clienteEnEdicion ? "Cliente actualizado correctamente" : "Cliente agregado correctamente");
    } catch (error) {
        console.error('Error al guardar el cliente:', error);
        alert('Error al guardar el cliente. Verifique la consola para mÃ¡s detalles.');
    }
}

async function eliminarCliente(id) {
    if (!confirm(`Â¿EstÃ¡s seguro de que deseas eliminar el cliente con ID #${id}?`)) {
        return;
    }

    try {
        const respuesta = await fetch(`http://localhost:3000/api/clientes/${id}`, {
            method: 'DELETE'
        });

        if (!respuesta.ok) throw new Error('Error al eliminar en el servidor');

        await cargarClientes();

    } catch (error) {
        console.error('Error:', error);
        alert('Hubo un error al eliminar el cliente. Posiblemente tenga compras u operaciones registradas.');
    }
}

function abrirModalEditar(id) {
    const cliente = clientesData.find(c => c.IdClientes === id);
    if (!cliente) return;
    
    clienteEnEdicion = id;
    
    document.getElementById('input-nombre').value = cliente.Nombre || '';
    document.getElementById('input-apellido').value = cliente.Apellido || '';
    document.getElementById('input-telefono').value = cliente.Telefono || '';
    document.getElementById('input-correo').value = cliente.Correo || '';
    document.getElementById('input-cedula').value = cliente.Cedula || '';
    
    document.getElementById('btn-guardar-cliente').innerText = 'Guardar Cambios';
    
    const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('modalCliente'));
    modal.show();
}

window.eliminarCliente = eliminarCliente;
window.abrirModalEditar = abrirModalEditar;

// --- REPORTE DE CLIENTES ---
let datosReporteClientes = [];
let kpiOrigenTexto = "";

function calcularDatosReporte() {
    datosReporteClientes = [];
    const origenesCount = {};
    let totalClientes = clientesData.length;

    clientesData.forEach(c => {
        datosReporteClientes.push({
            nombre: c.Nombre + ' ' + c.Apellido,
            correo: c.Correo || 'N/A',
            origen: c.Origen || 'Desconocido'
        });

        const o = c.Origen || 'Desconocido';
        origenesCount[o] = (origenesCount[o] || 0) + 1;
    });

    // KPI: Origen mas repetido
    let maxOrigen = '';
    let maxCount = 0;
    for (const [ori, count] of Object.entries(origenesCount)) {
        if (count > maxCount) {
            maxCount = count;
            maxOrigen = ori;
        }
    }
    
    let porcentaje = totalClientes > 0 ? ((maxCount / totalClientes) * 100).toFixed(1) : 0;
    kpiOrigenTexto = `El origen mÃ¡s frecuente es <strong>${maxOrigen}</strong> con un ${porcentaje}% del total (${maxCount} clientes).`;
}

function generarReporte() {
    if (clientesData.length === 0) {
        alert("Cargando datos, intente de nuevo en un segundo.");
        return;
    }
    calcularDatosReporte();

    document.getElementById('kpi-origen').innerHTML = kpiOrigenTexto;

    const tbody = document.getElementById('cuerpo-tabla-reporte-clientes');
    if (tbody) {
        tbody.innerHTML = '';
        datosReporteClientes.forEach(item => {
            tbody.innerHTML += `
                <tr>
                    <td>${item.nombre}</td>
                    <td class="text-secondary">${item.correo}</td>
                    <td class="text-info fw-bold">${item.origen}</td>
                </tr>
            `;
        });
    }

    const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('modalReporteClientes'));
    modal.show();
}

function descargarReporteExcel() {
    if (datosReporteClientes.length === 0) calcularDatosReporte();
    if (datosReporteClientes.length === 0) return alert("No hay datos para exportar.");

    let csvContent = "ï»¿Nombre,Correo,Origen\n";
    datosReporteClientes.forEach(item => {
        csvContent += `"${item.nombre}","${item.correo}","${item.origen}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "reporte_clientes.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

window.generarReporte = generarReporte;
window.descargarReporteExcel = descargarReporteExcel;


function actualizarKPIsPrincipales(data) {
    let totalClientes = data.length;
    let mesActual = new Date().getMonth();
    let anioActual = new Date().getFullYear();
    let nuevosClientesEsteMes = data.filter(c => {
        if(!c.FechaRegistro) return false;
        let d = new Date(c.FechaRegistro);
        return d.getMonth() === mesActual && d.getFullYear() === anioActual;
    }).length;

    let e1 = document.getElementById('stat-clientes-total');
    if(e1) e1.innerText = totalClientes;
    
    let e2 = document.getElementById('kpi-main-total');
    if(e2) e2.innerText = nuevosClientesEsteMes;
}


