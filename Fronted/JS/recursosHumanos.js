
let empleadosData = [];
let datosReporteRH = [];

document.addEventListener('DOMContentLoaded', () => {
    const btnPlanilla = document.getElementById('btnGenerarPlanilla');
    if(btnPlanilla) btnPlanilla.addEventListener('click', generarReporte);

    cargarEmpleados();
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            aplicarFiltros(e.target.value.toLowerCase());
        });
    }
});

async function cargarEmpleados() {
    try {
        const res = await fetch('http://localhost:3000/api/recursosHumanos');
        empleadosData = await res.json();
        renderizarTabla(empleadosData);
    } catch (e) {
        console.error("Error cargando empleados:", e);
    }
}

function aplicarFiltros(texto = '') {
    const filtrados = empleadosData.filter(e => {
        const nombre = (e.NombreEmpleado || '') + ' ' + (e.ApellidoEmpleado || '');
        const depto = e.NombreDepartamento || '';
        const cargo = e.NombreCargo || '';
        return nombre.toLowerCase().includes(texto) || depto.toLowerCase().includes(texto) || cargo.toLowerCase().includes(texto);
    });
    renderizarTabla(filtrados);
}

function renderizarTabla(data) {
    const tbody = document.getElementById('employees-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted">No hay registros</td></tr>`;
        return;
    }

    const accionesHTML = `
        <div class="dropdown">
            <button class="btn btn-link text-secondary p-0 border-0" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                <i class="bi bi-three-dots-vertical fs-5"></i>
            </button>
            <ul class="dropdown-menu dropdown-menu-dark dropdown-menu-dark-custom shadow-sm">
                <li><button type="button" class="dropdown-item text-white btn-editar-empleado"><i class="bi bi-pencil-square me-2 text-neon"></i>Editar</button></li>
                <li><hr class="dropdown-divider border-secondary opacity-25 my-1"></li>
                <li><button type="button" class="dropdown-item text-danger btn-eliminar-empleado"><i class="bi bi-trash me-2"></i>Eliminar</button></li>
            </ul>
        </div>
    `;

    data.forEach(e => {
        const nombreCompleto = (e.NombreEmpleado || '') + ' ' + (e.ApellidoEmpleado || '');
        const tr = document.createElement('tr');
        tr.style.cursor = 'pointer';
        tr.onclick = (ev) => {
            if(!ev.target.closest('.dropdown')) {
                seleccionarEmpleado(e);
            }
        };
        tr.innerHTML = `
            <td class="text-center">${e.CodigoEmpleado || 'N/A'}</td>
            <td class="text-center">${nombreCompleto}</td>
            <td class="text-center">${e.Cedula || 'N/A'}</td>
            <td class="text-center">${e.NombreCargo || 'N/A'}</td>
            <td class="text-center">${e.NombreDepartamento || 'N/A'}</td>
            <td class="text-center">$${parseFloat(e.SalarioBase || 0).toFixed(2)}</td>
            <td class="text-center">
                <span class="badge ${e.EstadoEmpleado === 'Activo' ? 'badge-activo' : 'badge-inactivo'} rounded-pill">${e.EstadoEmpleado || 'N/A'}</span>
            </td>
            <td class="text-center">${accionesHTML}</td>
        `;
        tbody.appendChild(tr);
    });

    const payrollTbody = document.getElementById('payroll-table-body');
    if (payrollTbody) {
        payrollTbody.innerHTML = '';
        data.forEach(e => {
            let salBase = parseFloat(e.SalarioBase) || 0;
            let inss = salBase * 0.07;
            let ir = calcularIRMensual(salBase);
            let salBruto = salBase;
            let totalDeducciones = inss + ir;
            let salNeto = salBruto - totalDeducciones;
            let inssPatronal = salBase * 0.225; // 22.5% INSS Patronal
            let totalPagar = salBruto + inssPatronal;

            const pTr = document.createElement('tr');
            pTr.innerHTML = `
                <td>#PL-${e.IdEmpleado}</td>
                <td>01/09/2026</td>
                <td>${e.NombreEmpleado || ''} ${e.ApellidoEmpleado || ''}</td>
                <td>${e.CodigoEmpleado || ''}</td>
                <td>$${salBase.toFixed(2)}</td>
                <td>30</td>
                <td>$0.00</td>
                <td>$0.00</td>
                <td>$0.00</td>
                <td>$0.00</td>
                <td>$${salBruto.toFixed(2)}</td>
                <td class="text-danger">-$${inss.toFixed(2)}</td>
                <td class="text-danger">-$${ir.toFixed(2)}</td>
                <td>$0.00</td>
                <td class="text-danger">-$${totalDeducciones.toFixed(2)}</td>
                <td class="text-success fw-bold">$${salNeto.toFixed(2)}</td>
                <td class="text-warning">$${inssPatronal.toFixed(2)}</td>
                <td class="fw-bold">$${totalPagar.toFixed(2)}</td>
                <td>30/09/2026</td>
                <td><span class="badge bg-warning text-dark">Pendiente</span></td>
                <td class="text-center">${accionesHTML}</td>
            `;
            payrollTbody.appendChild(pTr);
        });
    }
}
function seleccionarEmpleado(e) {
    const nombreCompleto = (e.NombreEmpleado || '') + ' ' + (e.ApellidoEmpleado || '');
    document.getElementById('p-nombre').innerText = nombreCompleto;
    document.getElementById('p-cargo-header').innerText = e.NombreCargo || 'N/A';
    document.getElementById('p-depto-header').innerText = e.NombreDepartamento || 'N/A';
    document.getElementById('p-correo').innerText = 'N/A'; // No disponible en BD directamente
    document.getElementById('p-telefono').innerText = 'N/A';
    document.getElementById('p-direccion').innerText = 'N/A';
    document.getElementById('p-cedula').innerText = e.Cedula || 'N/A';
    document.getElementById('p-codigo').innerText = e.CodigoEmpleado || 'N/A';
    
    document.getElementById('p-cargo').innerText = e.NombreCargo || 'N/A';
    
    let depto = document.getElementById('p-depto');
    if(depto) depto.innerText = e.NombreDepartamento || 'N/A';
    
    let fecha = document.getElementById('p-fecha');
    if(fecha) fecha.innerText = e.FechaIngreso ? new Date(e.FechaIngreso).toLocaleDateString() : 'N/A';
    
    let contrato = document.getElementById('p-contrato');
    if(contrato) contrato.innerText = 'Indefinido'; // Default mock
    
    let salario = document.getElementById('p-salario');
    if(salario) salario.innerText = '$' + (parseFloat(e.SalarioBase) || 0).toFixed(2);
    
    let jornada = document.getElementById('p-jornada');
    if(jornada) jornada.innerText = 'Completa'; // Default mock

    
    const badge = document.getElementById('p-badge');
    badge.style.display = 'inline-block';
    badge.innerText = e.EstadoEmpleado || 'N/A';
}

function calcularIRMensual(salarioMensual) {
    let inss = salarioMensual * 0.07;
    let netoMensual = salarioMensual - inss;
    let anual = netoMensual * 12;
    let irAnual = 0;
    if(anual > 500000) {
        irAnual = (anual - 500000) * 0.30 + 82500;
    } else if(anual > 350000) {
        irAnual = (anual - 350000) * 0.25 + 45000;
    } else if(anual > 200000) {
        irAnual = (anual - 200000) * 0.20 + 15000;
    } else if(anual > 100000) {
        irAnual = (anual - 100000) * 0.15;
    } else {
        irAnual = 0;
    }
    return irAnual / 12;
}

function generarReporte() {
    if(empleadosData.length === 0) return alert('No hay datos');
    
    datosReporteRH = empleadosData.map(e => {
        let salBase = parseFloat(e.SalarioBase) || 0;
        let ir = calcularIRMensual(salBase);
        let salNeto = salBase - (salBase * 0.07) - ir;
        return {
            id: e.IdEmpleado,
            nombre: (e.NombreEmpleado || '') + ' ' + (e.ApellidoEmpleado || ''),
            salarioBase: salBase,
            ir: ir,
            salarioNeto: salNeto
        };
    });

    const tbody = document.getElementById('cuerpo-tabla-reporte-rh');
    if(tbody) {
        tbody.innerHTML = '';
        datosReporteRH.forEach(r => {
            tbody.innerHTML += `
                <tr>
                    <td>#${r.id}</td>
                    <td>${r.nombre}</td>
                    <td>$${r.salarioBase.toFixed(2)}</td>
                    <td class="text-danger">-$${r.ir.toFixed(2)}</td>
                    <td class="text-success fw-bold">$${r.salarioNeto.toFixed(2)}</td>
                </tr>
            `;
        });
    }
    bootstrap.Modal.getOrCreateInstance(document.getElementById('modalReporteRH')).show();
}

function descargarReporteExcel() {
    if(datosReporteRH.length === 0) return alert("Genere el reporte primero.");
    let csvContent = "\uFEFFID,Nombre,SalarioBase,IR_Mensual,SalarioNeto\n";
    datosReporteRH.forEach(r => {
        csvContent += `"${r.id}","${r.nombre.replace(/"/g,'""')}","${r.salarioBase.toFixed(2)}","${r.ir.toFixed(2)}","${r.salarioNeto.toFixed(2)}"\n`;
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "reporte_rrhh.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

window.generarReporte = generarReporte;
window.descargarReporteExcel = descargarReporteExcel;

window.switchMainTab = function(tabId, element) {
    document.querySelectorAll('.custom-tab').forEach(t => t.classList.remove('active'));
    element.classList.add('active');
    document.querySelectorAll('.view-section').forEach(v => v.classList.remove('active'));
    const target = document.getElementById('view-' + tabId);
    if(target) target.classList.add('active');
};

window.switchInnerTab = function(tabId, element) {
    document.querySelectorAll('.inner-tab').forEach(t => t.classList.remove('active'));
    element.classList.add('active');
    document.querySelectorAll('.inner-view').forEach(v => v.classList.remove('active'));
    const target = document.getElementById('inner-' + tabId);
    if(target) target.classList.add('active');
};

document.addEventListener('DOMContentLoaded', () => {
    const btnReporteSalarial = document.getElementById('btnReporteSalarial');
    if(btnReporteSalarial) {
        btnReporteSalarial.addEventListener('click', () => {
            const pCodigo = document.getElementById('p-codigo').innerText;
            if(!pCodigo || pCodigo === '-') {
                alert('Seleccione un empleado primero.');
                return;
            }
            const emp = empleadosData.find(e => e.CodigoEmpleado === pCodigo);
            if(emp) generarReporte(emp);
        });
    }
});

