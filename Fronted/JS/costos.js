
document.addEventListener("DOMContentLoaded", () => {
    cargarDatos();
    const searchInput = document.querySelector('input[placeholder^="Buscar"]');
    if(searchInput) {
        searchInput.addEventListener('input', (e) => { filtrarTabla(e.target.value.toLowerCase()); });
    }
});
let costosData = [];
async function cargarDatos() {
    try {
        const res = await fetch("http://localhost:3000/api/costos");
        costosData = await res.json();
        renderizarTabla(costosData);
    } catch (e) { console.error(e); }
}
function renderizarTabla(data) {
    actualizarKPIsPrincipales(data);

    const tbody = document.getElementById("cuerpo-tabla");
    if(!tbody) return; tbody.innerHTML = "";
    if (data.length === 0) return tbody.innerHTML = '<tr><td colspan="7" class="text-center">Sin datos</td></tr>';
    data.forEach(c => {
        let f = c.FechaGasto ? new Date(c.FechaGasto).toLocaleDateString() : 'N/A';
        let m = c.Monto ? parseFloat(c.Monto).toFixed(2) : '0.00';
        tbody.innerHTML += `
            <tr>
                <td class="text-center fw-bold text-secondary">#${c.idCostoEstan}</td>
                <td class="text-center">${c.Auto || 'N/A'}</td>
                <td class="text-center">${c.Categoria || 'N/A'}</td>
                <td class="text-center text-truncate" style="max-width:150px;" title="${c.Descripcion||''}"><small>${c.Descripcion || 'N/A'}</small></td>
                <td class="text-center text-secondary">${f}</td>
                <td class="text-center text-danger fw-bold">$${m}</td>
                <td class="text-center"><button class="btn btn-sm btn-outline-danger rounded-pill" onclick="alert('Detalles...')"><i class="bi bi-eye"></i></button></td>
            </tr>`;
    });
}
function filtrarTabla(t) {
    renderizarTabla(costosData.filter(c => 
        (c.Auto||"").toLowerCase().includes(t) || (c.Categoria||"").toLowerCase().includes(t) || (c.Descripcion||"").toLowerCase().includes(t)
    ));
}
// Reporte
let datosRC = [];
function calcularRC() {
    datosRC = []; let total = 0; let cats = {};
    costosData.forEach(c => {
        let m = c.Monto ? parseFloat(c.Monto) : 0;
        total += m;
        let cat = c.Categoria || 'N/A';
        cats[cat] = (cats[cat]||0) + m;
        datosRC.push({
            id: c.idCostoEstan, auto: c.Auto||'N/A', cat: cat, desc: c.Descripcion||'N/A',
            f: c.FechaGasto ? new Date(c.FechaGasto).toLocaleDateString() : 'N/A',
            m_raw: m,
            m: "$" + m.toFixed(2)
        });
    });
    datosRC.sort((a, b) => b.m_raw - a.m_raw);
    let maxC = ''; let maxV = 0;
    for(const [k,v] of Object.entries(cats)) { if(v>maxV){maxV=v; maxC=k;} }
    document.getElementById('kpi-costos').innerHTML = `Gasto total: <strong class="text-danger">${total.toFixed(2)}</strong>. La categoría de mayor costo es <strong>${maxC}</strong> (${maxV.toFixed(2)}).`;
}
function generarReporte() {
    if(costosData.length===0) return; calcularRC();
    const tb = document.getElementById('cuerpo-tabla-reporte-costos'); tb.innerHTML = '';
    datosRC.forEach(i => { tb.innerHTML += `<tr><td>#${i.id}</td><td>${i.auto}</td><td>${i.cat}</td><td class="text-danger fw-bold">${i.m}</td><td>${i.f}</td></tr>`; });
    bootstrap.Modal.getOrCreateInstance(document.getElementById('modalReporteCostos')).show();
}
function descargarReporteExcel() {
    if(datosRC.length===0) return;
    let csv = "\uFEFFID,Auto,Categoria,Descripcion,Monto,Fecha\n";
    datosRC.forEach(i => csv += `"${i.id}","${i.auto}","${i.cat}","${i.desc.replace(/"/g,'""')}","${i.m}","${i.f}"\n`);
    const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' })); link.download = "costos.csv"; document.body.appendChild(link); link.click(); document.body.removeChild(link);
}
window.generarReporte = generarReporte; window.descargarReporteExcel = descargarReporteExcel;


function actualizarKPIsPrincipales(data) {
    let gastos = data.reduce((sum, v) => sum + (parseFloat(v.Monto) || 0), 0);
    let maint = data.filter(v => v.Categoria == "Mantenimiento").reduce((sum, v) => sum + (parseFloat(v.Monto) || 0), 0);
    let rep = data.filter(v => v.Categoria == "Reparacion" || v.Categoria == "ReparaciÃ³n").reduce((sum, v) => sum + (parseFloat(v.Monto) || 0), 0);
    let otros = gastos - maint - rep;

    let e1 = document.getElementById('kpi-costos-mantenimiento');
    if(e1) e1.innerText = "C$ " + maint.toFixed(2);
    
    let e2 = document.getElementById('kpi-costos-reparacion');
    if(e2) e2.innerText = "C$ " + rep.toFixed(2);
    
    let e3 = document.getElementById('kpi-costos-otros');
    if(e3) e3.innerText = "C$ " + otros.toFixed(2);
    
    let e4 = document.getElementById('kpi-costos-total');
    if(e4) e4.innerText = "C$ " + gastos.toFixed(2);
}




