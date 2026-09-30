
document.addEventListener("DOMContentLoaded", () => {
    cargarDatos();

    // Eventos para filtros
    const searchInput = document.querySelector('input[placeholder^="Buscar"]');
    if(searchInput) {
        searchInput.addEventListener('input', (e) => {
        filtrarTabla(e.target.value.toLowerCase());
        });
    }
});

let ventasData = [];

async function cargarDatos() {
    try {
        const res = await fetch("http://localhost:3000/api/ventas");
        ventasData = await res.json();
        renderizarTabla(ventasData);
    } catch (error) {
        console.error("Error al cargar ventas:", error);
    }
}

function renderizarTabla(data) {
    actualizarKPIsPrincipales(data);

    const tbody = document.getElementById("cuerpo-tabla");
    if(!tbody) return;
    tbody.innerHTML = "";
    
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-secondary">No se encontraron ventas</td></tr>';
        return;
    }

    data.forEach(venta => {
        const tr = document.createElement("tr");
        
        // Format dates correctly safely
        let fecha = 'N/A';
        if (venta.FechaVenta) {
            fecha = new Date(venta.FechaVenta).toLocaleDateString();
        }

        let monto = venta.Monto ? parseFloat(venta.Monto).toFixed(2) : '0.00';

        tr.innerHTML = `
            <td class="text-center fw-bold text-secondary">#${venta.idVenta}</td>
            <td class="text-center">${venta.Cliente || 'N/A'}</td>
            <td class="text-center">${venta.Vehiculo || 'N/A'}</td>
            <td class="text-center text-success fw-bold">$${monto}</td>
            <td class="text-center text-secondary">${fecha}</td>
            <td class="text-center">${venta.FormaPago || 'N/A'}</td>
            <td class="text-center">${venta.EstadoVenta || 'N/A'}</td>
            <td class="text-center">
                <button class="btn btn-sm btn-outline-info rounded-pill" onclick="alert('Detalles...')">
                    <i class="bi bi-eye"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function filtrarTabla(termino) {
    const filtrados = ventasData.filter(v => {
        const id = v.idVenta ? v.idVenta.toString() : "";
        const c = v.Cliente ? v.Cliente.toLowerCase() : "";
        const ve = v.Vehiculo ? v.Vehiculo.toLowerCase() : "";
        const fp = v.FormaPago ? v.FormaPago.toLowerCase() : "";
        return id.includes(termino) || c.includes(termino) || ve.includes(termino) || fp.includes(termino);
    });
    renderizarTabla(filtrados);
}

// --- REPORTE DE VENTAS ---
let datosReporteVentas = [];
let kpiVentasTexto = "";

function calcularDatosReporte() {
    datosReporteVentas = [];
    let totalMonto = 0;
    let metodos = {};
    let vehiculos = {};
    
    ventasData.forEach(v => {
        let m = parseFloat(v.Monto) || 0;
        totalMonto += m;
        let fp = v.FormaPago || 'Desconocido';
        metodos[fp] = (metodos[fp] || 0) + 1;
        let veh = v.Vehiculo || 'Desconocido';
        vehiculos[veh] = (vehiculos[veh] || 0) + 1;
        
        datosReporteVentas.push({
            id: v.idVenta,
            cliente: v.Cliente || 'N/A',
            vehiculo: v.Vehiculo || 'N/A',
            monto: "$" + m.toFixed(2),
            fecha: v.FechaVenta ? new Date(v.FechaVenta).toLocaleDateString() : 'N/A',
            pago: fp
        });
    });
    
    let maxMetodo = ''; let maxMetCount = 0;
    for(let k in metodos) { if(metodos[k] > maxMetCount) { maxMetCount = metodos[k]; maxMetodo = k; } }
    
    let maxVeh = ''; let maxVehCount = 0;
    for(let k in vehiculos) { if(vehiculos[k] > maxVehCount) { maxVehCount = vehiculos[k]; maxVeh = k; } }
    
    kpiVentasTexto = `Total de ingresos: <strong class="text-success">${totalMonto.toFixed(2)}</strong>. <br>El vehiculo mas vendido es <strong>${maxVeh}</strong> y el metodo de pago mas seleccionado es <strong>${maxMetodo}</strong>.`;
}

function generarReporte() {
    if (ventasData.length === 0) {
        alert("Cargando datos, intente de nuevo en un segundo.");
        return;
    }
    calcularDatosReporte();

    const kpiEl = document.getElementById('kpi-ventas');
    if(kpiEl) kpiEl.innerHTML = kpiVentasTexto;

    const tbody = document.getElementById('cuerpo-tabla-reporte-ventas');
    if (tbody) {
        tbody.innerHTML = '';
        datosReporteVentas.forEach(item => {
            tbody.innerHTML += `
                <tr>
                    <td>#${item.id}</td>
                    <td>${item.cliente}</td>
                    <td>${item.vehiculo}</td>
                    <td class="text-success fw-bold">${item.monto}</td>
                    <td>${item.fecha}</td>
                    <td class="text-info">${item.pago}</td>
                </tr>
            `;
        });
    }

    const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('modalReporteVentas'));
    modal.show();
}

function descargarReporteExcel() {
    if (datosReporteVentas.length === 0) calcularDatosReporte();
    if (datosReporteVentas.length === 0) return alert("No hay datos para exportar.");

    let csvContent = "ï»¿ID,Cliente,Vehiculo,Monto,Fecha,FormaPago\n";
    datosReporteVentas.forEach(item => {
        // format safe CSV
        let cliente = (item.cliente + '').replace(/"/g, '""');
        let vehiculo = (item.vehiculo + '').replace(/"/g, '""');
        csvContent += `"${item.id}","${cliente}","${vehiculo}","${item.monto}","${item.fecha}","${item.pago}","${item.estado}"\n`;
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
    let totalVentas = data.length;
    let ingresos = data.reduce((sum, v) => sum + (parseFloat(v.Monto) || 0), 0);
    
    let mesActual = new Date().getMonth();
    let anioActual = new Date().getFullYear();
    let ventasMes = data.filter(v => {
        if(!v.FechaVenta) return false;
        let d = new Date(v.FechaVenta);
        return d.getMonth() === mesActual && d.getFullYear() === anioActual;
    }).length;

    let e1 = document.getElementById('kpi-main-ventas');
    if(e1) e1.innerText = totalVentas;
    
    let e2 = document.getElementById('kpi-main-ingresos');
    if(e2) e2.innerText = '$' + ingresos.toFixed(2);
    
    let e3 = document.getElementById('kpi-main-mes');
    if(e3) e3.innerText = ventasMes;
}




