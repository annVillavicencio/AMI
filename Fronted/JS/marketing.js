
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
async function cargarDatos() {
    try {
        const res = await fetch("http://localhost:3000/api/marketing");
        marketingData = await res.json();
        renderizarTabla(marketingData);
    } catch (e) { console.error(e); }
}
function renderizarTabla(data) {
    actualizarKPIsPrincipales(data);

    const tbody = document.getElementById("cuerpo-tabla");
    if(!tbody) return;
    tbody.innerHTML = "";
    if (data.length === 0) return tbody.innerHTML = '<tr><td colspan="7" class="text-center">Sin datos</td></tr>';
    data.forEach(c => {
        let f1 = c.FechaInicio ? new Date(c.FechaInicio).toLocaleDateString() : 'N/A';
        let f2 = c.FechaFin ? new Date(c.FechaFin).toLocaleDateString() : 'N/A';
        let p = c.PresupuestoInvertido ? parseFloat(c.PresupuestoInvertido).toFixed(2) : '0.00';
        tbody.innerHTML += `
            <tr>
                <td class="text-center fw-bold text-secondary">#${c.idCampaña}</td>
                <td class="text-center">${c.NombreCampaña || 'N/A'}</td>
                <td class="text-center">${f1}</td>
                <td class="text-center">${f2}</td>
                <td class="text-center text-info fw-bold">$${p}</td>
                <td class="text-center">${c.EstadoCampana || 'N/A'}</td>
                <td class="text-center"><button class="btn btn-sm btn-outline-info rounded-pill" onclick="alert('Detalles...')"><i class="bi bi-eye"></i></button></td>
            </tr>`;
    });
}
function filtrarTabla(t) {
    renderizarTabla(marketingData.filter(c => 
        (c.idCampaña+"").includes(t) || (c.NombreCampaña||"").toLowerCase().includes(t)
    ));
}
// Reporte
let datosRM = [];
function calcularRM() {
    datosRM = []; let total = 0;
    marketingData.forEach(c => {
        let p = c.PresupuestoInvertido ? parseFloat(c.PresupuestoInvertido) : 0;
        total += p;
        datosRM.push({
            id: c.idCampaña, nom: c.NombreCampaña,
            f1: c.FechaInicio ? new Date(c.FechaInicio).toLocaleDateString() : 'N/A',
            f2: c.FechaFin ? new Date(c.FechaFin).toLocaleDateString() : 'N/A',
            p: `$${p.toFixed(2)}`, est: c.EstadoCampana
        });
    });
    document.getElementById('kpi-marketing').innerHTML = `Presupuesto total invertido en marketing: <strong class="text-info">$${total.toFixed(2)}</strong>.`;
}
function generarReporte() {
    if(marketingData.length===0) return;
    calcularRM();
    const tb = document.getElementById('cuerpo-tabla-reporte-marketing');
    tb.innerHTML = '';
    datosRM.forEach(i => { tb.innerHTML += `<tr><td>#${i.id}</td><td>${i.nom}</td><td>${i.f1} a ${i.f2}</td><td class="text-info">${i.p}</td><td>${i.est}</td></tr>`; });
    bootstrap.Modal.getOrCreateInstance(document.getElementById('modalReporteMarketing')).show();
}
function descargarReporteExcel() {
    if(datosRM.length===0) return;
    let csv = "\uFEFFID,Nombre,Inicio,Fin,Presupuesto,Estado\n";
    datosRM.forEach(i => csv += `"${i.id}","${i.nom.replace(/"/g,'""')}","${i.f1}","${i.f2}","${i.p}","${i.est}"\n`);
    const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' })); link.download = "marketing.csv"; document.body.appendChild(link); link.click(); document.body.removeChild(link);
}
window.generarReporte = generarReporte; window.descargarReporteExcel = descargarReporteExcel;


function actualizarKPIsPrincipales(data) {
    let totalCampanas = data.length;
    let presupuesto = data.reduce((sum, v) => sum + (parseFloat(v.PresupuestoInvertido) || 0), 0);
    
    let activas = data.filter(v => v.EstadoCampana === "Activa").length;

    let e1 = document.getElementById('kpi-main-campanas');
    if(e1) e1.innerText = totalCampanas;
    
    let e2 = document.getElementById('kpi-main-presupuesto');
    if(e2) e2.innerText = '$' + presupuesto.toFixed(2);
    
    let e3 = document.getElementById('kpi-main-roi');
    if(e3) e3.innerText = activas;
}



