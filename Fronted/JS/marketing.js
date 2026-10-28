
document.addEventListener("DOMContentLoaded", () => {
    cargarDatos();
    const searchInput = document.querySelector('input[placeholder^="Buscar"]');
    if(searchInput) {
        searchInput.addEventListener('input', (e) => {
            filtrarTabla(e.target.value.toLowerCase());
        });
    }
});

let marketingData = [];
let campanaEnEdicion = null;

async function cargarDatos() {
    try {
        const res = await fetch("http://localhost:3000/api/marketing");
        if (!res.ok) throw new Error("Error al obtener campañas");
        marketingData = await res.json();
        renderizarTabla(marketingData);
    } catch (e) { 
        console.error("Error al cargar campañas:", e);
        const tbody = document.getElementById("cuerpo-tabla");
        if (tbody) tbody.innerHTML = '<tr><td colspan="7" class="text-center text-danger py-4">Error al cargar datos del servidor</td></tr>';
    }
}

function renderizarTabla(data) {
    actualizarKPIsPrincipales(data);

    const tbody = document.getElementById("cuerpo-tabla");
    if(!tbody) return;
    tbody.innerHTML = "";
    if (data.length === 0) {
        return tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-4">No hay campañas registradas</td></tr>';
    }

    data.forEach(c => {
        let f1 = c.FechaInicio ? new Date(c.FechaInicio).toISOString().split('T')[0] : 'N/A';
        let f2 = c.FechaFin ? new Date(c.FechaFin).toISOString().split('T')[0] : 'N/A';
        let p = c.PresupuestoInvertido ? parseFloat(c.PresupuestoInvertido).toFixed(2) : '0.00';
        
        let badgeColor = 'secondary';
        if (c.EstadoCampana === 'Activa') badgeColor = 'success';
        else if (c.EstadoCampana === 'Programada') badgeColor = 'info';
        else if (c.EstadoCampana === 'Finalizada') badgeColor = 'secondary';
        else if (c.EstadoCampana === 'Pausada') badgeColor = 'warning';

        tbody.innerHTML += `
            <tr>
                <td class="text-center fw-bold text-secondary">#${c.idCampaña}</td>
                <td class="text-center fw-semibold text-white">${c.NombreCampaña || 'N/A'}</td>
                <td class="text-center text-secondary">${f1}</td>
                <td class="text-center text-secondary">${f2}</td>
                <td class="text-center text-info fw-bold">$${p}</td>
                <td class="text-center"><span class="badge bg-${badgeColor} bg-opacity-25 text-${badgeColor} border border-${badgeColor} border-opacity-50 px-3 py-1 rounded-pill">${c.EstadoCampana || 'N/A'}</span></td>
                <td class="text-center">
                    <div class="d-inline-flex gap-2">
                        <button class="btn btn-sm btn-outline-info rounded-pill px-3" onclick="abrirModalEditar(${c.idCampaña})" title="Editar campaña">
                            <i class="bi bi-pencil me-1"></i> Editar
                        </button>
                        <button class="btn btn-sm btn-outline-danger rounded-pill px-3" onclick="eliminarCampana(${c.idCampaña})" title="Eliminar campaña">
                            <i class="bi bi-trash me-1"></i> Eliminar
                        </button>
                    </div>
                </td>
            </tr>`;
    });
}

function filtrarTabla(t) {
    renderizarTabla(marketingData.filter(c => 
        (c.idCampaña + "").includes(t) || 
        (c.NombreCampaña || "").toLowerCase().includes(t) ||
        (c.EstadoCampana || "").toLowerCase().includes(t)
    ));
}

// ==========================================
// CRUD OPERATIONS
// ==========================================
function abrirModalCrear() {
    campanaEnEdicion = null;
    const form = document.getElementById("formNuevaCampana");
    if (form) form.reset();
    document.getElementById("campana-id").value = "";
    document.getElementById("modalCampanaTitle").innerHTML = '<i class="bi bi-megaphone me-2" style="color: var(--pink-soft);"></i> Nueva Campaña';
    document.getElementById("btnGuardarCampana").innerText = "Guardar Campaña";

    const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById("modalCampana"));
    modal.show();
}

function abrirModalEditar(id) {
    const c = marketingData.find(item => item.idCampaña === id);
    if (!c) return alert("Campaña no encontrada");

    campanaEnEdicion = id;
    document.getElementById("campana-id").value = c.idCampaña;
    document.getElementById("campana-nombre").value = c.NombreCampaña || "";
    document.getElementById("campana-inicio").value = c.FechaInicio ? new Date(c.FechaInicio).toISOString().split('T')[0] : "";
    document.getElementById("campana-fin").value = c.FechaFin ? new Date(c.FechaFin).toISOString().split('T')[0] : "";
    document.getElementById("campana-presupuesto").value = c.PresupuestoInvertido || "0";
    document.getElementById("campana-estado").value = c.EstadoCampana || "Programada";

    document.getElementById("modalCampanaTitle").innerHTML = `<i class="bi bi-pencil-square me-2" style="color: var(--pink-soft);"></i> Editar Campaña #${id}`;
    document.getElementById("btnGuardarCampana").innerText = "Guardar Cambios";

    const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById("modalCampana"));
    modal.show();
}

async function guardarCampana(e) {
    if (e && e.preventDefault) e.preventDefault();

    const nombre = document.getElementById("campana-nombre").value.trim();
    const inicio = document.getElementById("campana-inicio").value;
    const fin = document.getElementById("campana-fin").value;
    const presupuesto = parseFloat(document.getElementById("campana-presupuesto").value) || 0;
    const estado = document.getElementById("campana-estado").value;

    if (!nombre || !inicio || !fin) {
        return alert("Por favor complete los campos obligatorios: Nombre, Fecha Inicio y Fecha Fin.");
    }

    const payload = {
        NombreCampaña: nombre,
        FechaInicio: inicio,
        FechaFin: fin,
        PresupuestoInvertido: presupuesto,
        EstadoCampana: estado
    };

    const isEdit = !!campanaEnEdicion;
    const url = isEdit ? `http://localhost:3000/api/marketing/${campanaEnEdicion}` : "http://localhost:3000/api/marketing";
    const method = isEdit ? "PUT" : "POST";

    try {
        const res = await fetch(url, {
            method: method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || "Error al procesar la solicitud");
        }

        const modal = bootstrap.Modal.getInstance(document.getElementById("modalCampana"));
        if (modal) modal.hide();

        await cargarDatos();
        alert(isEdit ? "Campaña actualizada con éxito!" : "Campaña creada con éxito!");
    } catch (err) {
        console.error("Error al guardar campaña:", err);
        alert("Error: " + err.message);
    }
}

async function eliminarCampana(id) {
    if (!confirm(`¿Está seguro de que desea eliminar la campaña #${id}? Esta acción también removerá sus interacciones asociadas.`)) {
        return;
    }

    try {
        const res = await fetch(`http://localhost:3000/api/marketing/${id}`, {
            method: "DELETE"
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || "Error al eliminar");
        }

        await cargarDatos();
        alert("Campaña eliminada correctamente.");
    } catch (err) {
        console.error("Error al eliminar campaña:", err);
        alert("Error al eliminar campaña: " + err.message);
    }
}

// ==========================================
// REPORTE Y EXPORTACIÓN EXCEL
// ==========================================
let datosRM = [];

function calcularRM() {
    datosRM = [];
    let total = 0;
    marketingData.forEach(c => {
        let p = c.PresupuestoInvertido ? parseFloat(c.PresupuestoInvertido) : 0;
        total += p;
        datosRM.push({
            id: c.idCampaña,
            nom: c.NombreCampaña || 'N/A',
            f1: c.FechaInicio ? new Date(c.FechaInicio).toISOString().split('T')[0] : 'N/A',
            f2: c.FechaFin ? new Date(c.FechaFin).toISOString().split('T')[0] : 'N/A',
            p: p,
            pFmt: `$${p.toFixed(2)}`,
            est: c.EstadoCampana || 'N/A'
        });
    });

    const kpiEl = document.getElementById('kpi-marketing');
    if (kpiEl) {
        kpiEl.innerHTML = `Total de campañas: <strong class="text-info">${marketingData.length}</strong> | Presupuesto total invertido: <strong class="text-neon-pink">$${total.toFixed(2)}</strong>`;
    }
}

function generarReporte(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (!marketingData || marketingData.length === 0) {
        return alert("No hay campañas para generar el reporte.");
    }
    calcularRM();

    const tb = document.getElementById('cuerpo-tabla-reporte-marketing');
    if (tb) {
        tb.innerHTML = '';
        datosRM.forEach(i => {
            tb.innerHTML += `
                <tr>
                    <td class="fw-bold text-secondary">#${i.id}</td>
                    <td class="text-white fw-semibold">${i.nom}</td>
                    <td class="text-secondary">${i.f1} a ${i.f2}</td>
                    <td class="text-info fw-bold">${i.pFmt}</td>
                    <td><span class="badge bg-secondary">${i.est}</span></td>
                </tr>`;
        });
    }

    const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('modalReporteMarketing'));
    modal.show();
}

function descargarReporteExcel(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (!marketingData || marketingData.length === 0) {
        return alert("No hay datos de marketing para exportar.");
    }
    calcularRM();

    if (typeof XLSX !== 'undefined') {
        const wsData = [
            ["REPORTE GENERAL DE MARKETING - AMI"],
            [`Fecha de Emisión: ${new Date().toLocaleString()}`],
            [],
            ["ID Campaña", "Nombre de Campaña", "Fecha Inicio", "Fecha Fin", "Presupuesto Invertido ($)", "Estado"]
        ];

        datosRM.forEach(i => {
            wsData.push([
                i.id,
                i.nom,
                i.f1,
                i.f2,
                i.p,
                i.est
            ]);
        });

        const ws = XLSX.utils.aoa_to_sheet(wsData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Marketing");
        XLSX.writeFile(wb, `reporte_marketing_AMI_${new Date().toISOString().split('T')[0]}.xlsx`);
    } else {
        let csv = "\uFEFFID,Nombre,Inicio,Fin,Presupuesto,Estado\n";
        datosRM.forEach(i => {
            csv += `"${i.id}","${i.nom.replace(/"/g, '""')}","${i.f1}","${i.f2}","${i.p}","${i.est}"\n`;
        });
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `reporte_marketing_AMI_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

function actualizarKPIsPrincipales(data) {
    let totalCampanas = data.length;
    let presupuesto = data.reduce((sum, v) => sum + (parseFloat(v.PresupuestoInvertido) || 0), 0);
    let activas = data.filter(v => v.EstadoCampana === "Activa").length;

    let e1 = document.getElementById('kpi-main-campanas');
    if(e1) e1.innerText = totalCampanas;
    
    let e2 = document.getElementById('kpi-main-presupuesto');
    if(e2) e2.innerText = '$' + presupuesto.toLocaleString('en-US', { minimumFractionDigits: 2 });
    
    let e3 = document.getElementById('kpi-main-roi');
    if(e3) e3.innerText = activas;
}

window.cargarDatos = cargarDatos;
window.abrirModalCrear = abrirModalCrear;
window.abrirModalEditar = abrirModalEditar;
window.guardarCampana = guardarCampana;
window.eliminarCampana = eliminarCampana;
window.generarReporte = generarReporte;
window.descargarReporteExcel = descargarReporteExcel;
