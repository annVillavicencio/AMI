
document.addEventListener("DOMContentLoaded", () => {
    cargarDatos();

    const searchInput = document.querySelector('input[placeholder^="Buscar"]');
    if(searchInput) {
        searchInput.addEventListener('input', (e) => {
        filtrarTabla(e.target.value.toLowerCase());
        });
    }
});

let comprasData = [];

async function cargarDatos() {
    try {
        const res = await fetch("http://localhost:3000/api/compras");
        comprasData = await res.json();
        renderizarTabla(comprasData);
    } catch (error) {
        console.error("Error al cargar compras:", error);
    }
}

function renderizarTabla(data) {
    actualizarKPIsPrincipales(data);

    const tbody = document.getElementById("cuerpo-tabla");
    if(!tbody) return;
    tbody.innerHTML = "";
    
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-secondary">No se encontraron compras</td></tr>';
        return;
    }

    data.forEach(c => {
        const tr = document.createElement("tr");
        
        let fecha = c.FechaCompra ? new Date(c.FechaCompra).toLocaleDateString() : 'N/A';
        let total = c.TotalCompra ? parseFloat(c.TotalCompra).toFixed(2) : '0.00';

        tr.innerHTML = `
            <td class="text-center fw-bold text-secondary">#${c.idCompra}</td>
            <td class="text-center">${c.Proveedor}</td>
            <td class="text-center text-truncate" style="max-width: 150px;" title="${c.Descripcion || ''}">${c.Descripcion || 'N/A'}</td>
            <td class="text-center">${c.NumFactura || 'N/A'}</td>
            <td class="text-center text-secondary">${fecha}</td>
            <td class="text-center text-danger fw-bold">$${total}</td>
            <td class="text-center">${c.EstadoCompra || 'N/A'}</td>
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
    const filtrados = comprasData.filter(c => {
        const id = c.idCompra ? c.idCompra.toString() : "";
        const prov = c.Proveedor ? c.Proveedor.toLowerCase() : "";
        const fact = c.NumFactura ? c.NumFactura.toLowerCase() : "";
        const desc = c.Descripcion ? c.Descripcion.toLowerCase() : "";
        return id.includes(termino) || prov.includes(termino) || fact.includes(termino) || desc.includes(termino);
    });
    renderizarTabla(filtrados);
}

// --- REPORTE DE COMPRAS ---
let datosReporte = [];
let kpiTexto = "";

function calcularDatosReporte() {
    datosReporte = [];
    let totalInvertido = 0;
    const provCount = {};

    comprasData.forEach(c => {
        let fecha = c.FechaCompra ? new Date(c.FechaCompra).toLocaleDateString() : 'N/A';
        let total = c.TotalCompra ? parseFloat(c.TotalCompra) : 0;
        totalInvertido += total;

        datosReporte.push({
            id: c.idCompra,
            proveedor: c.Proveedor || 'N/A',
            factura: c.NumFactura || 'N/A',
            total: `$${total.toFixed(2)}`,
            fecha: fecha,
            estado: c.EstadoCompra || 'N/A'
        });

        const p = c.Proveedor || 'Desconocido';
        if (!provCount[p]) provCount[p] = 0;
        provCount[p] += total;
    });

    let maxProv = '';
    let maxGasto = 0;
    for (const [p, val] of Object.entries(provCount)) {
        if (val > maxGasto) {
            maxGasto = val;
            maxProv = p;
        }
    }
    
    kpiTexto = `El proveedor con mayor inversiÃ³n es <strong>${maxProv}</strong> ($${maxGasto.toFixed(2)}). InversiÃ³n total en compras: <strong class="text-danger">$${totalInvertido.toFixed(2)}</strong>.`;
}

function generarReporte() {
    if (comprasData.length === 0) return alert("Cargando datos...");
    calcularDatosReporte();

    const kpiEl = document.getElementById('kpi-compras');
    if(kpiEl) kpiEl.innerHTML = kpiTexto;

    const tbody = document.getElementById('cuerpo-tabla-reporte-compras');
    if (tbody) {
        tbody.innerHTML = '';
        datosReporte.forEach(item => {
            tbody.innerHTML += `
                <tr>
                    <td>#${item.id}</td>
                    <td>${item.proveedor}</td>
                    <td>${item.factura}</td>
                    <td class="text-danger fw-bold">${item.total}</td>
                    <td>${item.fecha}</td>
                </tr>
            `;
        });
    }
    bootstrap.Modal.getOrCreateInstance(document.getElementById('modalReporteCompras')).show();
}

function descargarReporteExcel() {
    if (datosReporte.length === 0) return alert("No hay datos");
    let csvContent = "ï»¿ID,Proveedor,Factura,Total,Fecha,Estado\n";
    datosReporte.forEach(item => {
        let prov = item.proveedor.replace(/"/g, '""');
        csvContent += `"${item.id}","${prov}","${item.factura}","${item.total}","${item.fecha}","${item.estado}"\n`;
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "reporte_compras.csv";
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
}

window.generarReporte = generarReporte;
window.descargarReporteExcel = descargarReporteExcel;


function actualizarKPIsPrincipales(data) {
    let totalCompras = data.length;
    let inversion = data.reduce((sum, v) => sum + (parseFloat(v.TotalCompra) || 0), 0);
    
    let mesActual = new Date().getMonth();
    let anioActual = new Date().getFullYear();
    let comprasMes = data.filter(v => {
        if(!v.FechaCompra) return false;
        let d = new Date(v.FechaCompra);
        return d.getMonth() === mesActual && d.getFullYear() === anioActual;
    }).length;

    let e1 = document.getElementById('kpi-main-compras');
    if(e1) e1.innerText = totalCompras;
    
    let e2 = document.getElementById('kpi-main-inversion');
    if(e2) e2.innerText = '$' + inversion.toFixed(2);
    
    let e3 = document.getElementById('kpi-main-pendientes');
    if(e3) e3.innerText = comprasMes;
}




