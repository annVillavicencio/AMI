/**
 * AMI - Script Principal de Inicio / Dashboard
 * Gestión de navegación activa, verificación de alertas en tiempo real y modales interactivos
 * - Inventario: Alerta dinámica <= 15, Crítico <= 10
 * - Órdenes Pendientes: Monitoreo continuo de compras pendientes de aprobación
 */

document.addEventListener("DOMContentLoaded", function () {
    // 1. Lógica del Menú Lateral Activo
    const menuLinks = document.querySelectorAll('.sidebar-menu a');
    menuLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            if (this.getAttribute('href') === '#') {
                e.preventDefault();
            }
            menuLinks.forEach(l => {
                l.classList.remove('active-tab');
                l.classList.add('sidebar-link');
            });
            this.classList.remove('sidebar-link');
            this.classList.add('active-tab');
        });
    });

    // 2. Cargar y evaluar alertas de Dashboard según datos reales y roles
    cargarAlertasDashboard();
});

let datosInventarioGlobal = {
    todos: [],
    disponibles: [],
    vendidos: [],
    totalDisponibles: 0,
    totalVendidos: 0,
    totalAutos: 0,
    nivelStock: 'optimo' // 'critico' (<=10), 'alerta' (<=15), 'optimo' (>15)
};

let datosComprasGlobal = {
    todas: [],
    pendientes: [],
    completadas: []
};

async function cargarAlertasDashboard() {
    const cardInventario = document.getElementById('card-alerta-inventario');
    const cardOrdenes = document.getElementById('card-alerta-ordenes');
    const badgeTotalAlertas = document.getElementById('badge-total-alertas');

    let totalAlertasActivas = 0;

    // Verificar permisos del usuario actual
    const tienePermisoInventario = typeof window.tienePermiso === 'function' ? window.tienePermiso('Inventario', 'puedeVer') : true;
    const tienePermisoCompras = typeof window.tienePermiso === 'function' ? window.tienePermiso('Compras', 'puedeVer') : true;

    // =========================================================================
    // A. TARJETA 1: INVENTARIO (Umbrales: Alerta <= 15, Crítico <= 10)
    // =========================================================================
    if (tienePermisoInventario && cardInventario) {
        cardInventario.style.display = 'block';
        try {
            const respInv = await fetch('/api/inventario');
            if (respInv.ok) {
                const autos = await respInv.json();
                
                const disponibles = autos.filter(a => (a.Estado || '').trim().toLowerCase() === 'disponible');
                const vendidos = autos.filter(a => (a.Estado || '').trim().toLowerCase() === 'vendido');
                const totalDisp = disponibles.length;

                datosInventarioGlobal = {
                    todos: autos,
                    disponibles: disponibles,
                    vendidos: vendidos,
                    totalDisponibles: totalDisp,
                    totalVendidos: vendidos.length,
                    totalAutos: autos.length,
                    nivelStock: totalDisp <= 10 ? 'critico' : (totalDisp <= 15 ? 'alerta' : 'optimo')
                };

                const iconoContenedor = document.getElementById('icono-inventario-alerta');
                const tituloCard = document.getElementById('titulo-inventario-alerta');
                const elContador = document.getElementById('contador-inventario-bajo');
                const elDesc = document.getElementById('desc-inventario-bajo');
                const btnDetallesInv = document.getElementById('btn-detalles-inventario');
                const cardInner = cardInventario.querySelector('.card');

                if (totalDisp <= 10) {
                    // NIVEL CRÍTICO: <= 10 vehículos disponibles
                    totalAlertasActivas++;
                    if (cardInner) cardInner.style.border = '1px solid rgba(239, 68, 68, 0.4) !important';
                    if (iconoContenedor) {
                        iconoContenedor.style.backgroundColor = 'rgba(239, 68, 68, 0.2)';
                        iconoContenedor.style.color = '#EF4444';
                        iconoContenedor.style.borderColor = 'rgba(239, 68, 68, 0.4)';
                        iconoContenedor.innerHTML = '<i class="bi bi-exclamation-triangle-fill fs-5"></i>';
                    }
                    if (tituloCard) tituloCard.textContent = 'Inventario Crítico';
                    if (elContador) {
                        elContador.className = 'text-danger fw-semibold';
                        elContador.textContent = `${totalDisp} vehículos disponibles (Nivel Crítico ≤ 10)`;
                    }
                    if (elDesc) {
                        elDesc.textContent = `¡Atención inmediata! El stock disponible ha caído a ${totalDisp} vehículos, superando el umbral crítico de 10 unidades.`;
                    }
                    if (btnDetallesInv) {
                        btnDetallesInv.style.backgroundColor = 'rgba(239, 68, 68, 0.2)';
                        btnDetallesInv.style.color = '#FCA5A5';
                        btnDetallesInv.style.border = '1px solid rgba(239, 68, 68, 0.4)';
                        btnDetallesInv.onclick = () => abrirModalInventario('disponibles');
                    }
                } else if (totalDisp <= 15) {
                    // NIVEL ALERTA: <= 15 vehículos disponibles
                    totalAlertasActivas++;
                    if (cardInner) cardInner.style.border = '1px solid rgba(245, 158, 11, 0.4) !important';
                    if (iconoContenedor) {
                        iconoContenedor.style.backgroundColor = 'rgba(245, 158, 11, 0.2)';
                        iconoContenedor.style.color = '#F59E0B';
                        iconoContenedor.style.borderColor = 'rgba(245, 158, 11, 0.4)';
                        iconoContenedor.innerHTML = '<i class="bi bi-exclamation-circle-fill fs-5"></i>';
                    }
                    if (tituloCard) tituloCard.textContent = 'Inventario Bajo';
                    if (elContador) {
                        elContador.className = 'text-warning fw-semibold';
                        elContador.textContent = `${totalDisp} vehículos disponibles (Alerta Preventiva ≤ 15)`;
                    }
                    if (elDesc) {
                        elDesc.textContent = `El inventario ha alcanzado el umbral de alerta con solo ${totalDisp} vehículos disponibles. Se recomienda gestionar compras antes de llegar al nivel crítico (10).`;
                    }
                    if (btnDetallesInv) {
                        btnDetallesInv.style.backgroundColor = 'rgba(245, 158, 11, 0.2)';
                        btnDetallesInv.style.color = '#FCD34D';
                        btnDetallesInv.style.border = '1px solid rgba(245, 158, 11, 0.4)';
                        btnDetallesInv.onclick = () => abrirModalInventario('disponibles');
                    }
                } else {
                    // NIVEL ÓPTIMO: > 15 vehículos disponibles
                    if (cardInner) cardInner.style.border = '1px solid rgba(16, 185, 129, 0.3) !important';
                    if (iconoContenedor) {
                        iconoContenedor.style.backgroundColor = 'rgba(16, 185, 129, 0.15)';
                        iconoContenedor.style.color = '#10B981';
                        iconoContenedor.style.borderColor = 'rgba(16, 185, 129, 0.3)';
                        iconoContenedor.innerHTML = '<i class="bi bi-shield-check fs-5"></i>';
                    }
                    if (tituloCard) tituloCard.textContent = 'Monitoreo de Stock';
                    if (elContador) {
                        elContador.className = 'text-success fw-semibold';
                        elContador.textContent = `${totalDisp} vehículos disponibles (Nivel Óptimo > 15)`;
                    }
                    if (elDesc) {
                        elDesc.textContent = `El inventario se encuentra saludable con ${totalDisp} unidades. La alerta se activará al bajar a 15 y el nivel crítico en 10 vehículos.`;
                    }
                    if (btnDetallesInv) {
                        btnDetallesInv.style.backgroundColor = 'rgba(16, 185, 129, 0.15)';
                        btnDetallesInv.style.color = '#6EE7B7';
                        btnDetallesInv.style.border = '1px solid rgba(16, 185, 129, 0.3)';
                        btnDetallesInv.onclick = () => abrirModalInventario('disponibles');
                    }
                }
            }
        } catch (err) {
            console.error('Error al consultar inventario:', err);
        }
    } else if (cardInventario) {
        cardInventario.style.display = 'none';
    }

    // =========================================================================
    // B. TARJETA 2: ÓRDENES PENDIENTES (SIEMPRE PRESENTE SI TIENE PERMISO)
    // =========================================================================
    if (tienePermisoCompras && cardOrdenes) {
        cardOrdenes.style.display = 'block';
        try {
            const respComp = await fetch('/api/compras');
            if (respComp.ok) {
                const compras = await respComp.json();
                
                const pendientes = compras.filter(c => {
                    const est = (c.EstadoCompra || '').trim().toLowerCase();
                    return est.includes('pendiente') || est.includes('aprobar') || est.includes('proceso');
                });
                const completadas = compras.filter(c => {
                    const est = (c.EstadoCompra || '').trim().toLowerCase();
                    return est.includes('completad');
                });

                datosComprasGlobal = {
                    todas: compras,
                    pendientes: pendientes,
                    completadas: completadas
                };

                const iconoOrd = document.getElementById('icono-ordenes-alerta');
                const tituloOrd = document.getElementById('titulo-ordenes-alerta');
                const elContador = document.getElementById('contador-ordenes-pendientes');
                const elDesc = document.getElementById('desc-ordenes-pendientes');
                const btnDetallesOrd = document.getElementById('btn-detalles-ordenes');
                const cardInnerOrd = cardOrdenes.querySelector('.card');

                if (pendientes.length > 0) {
                    totalAlertasActivas++;
                    if (cardInnerOrd) cardInnerOrd.style.border = '1px solid rgba(245, 158, 11, 0.35) !important';
                    if (iconoOrd) {
                        iconoOrd.style.backgroundColor = 'rgba(245, 158, 11, 0.15)';
                        iconoOrd.style.color = '#F59E0B';
                        iconoOrd.style.borderColor = 'rgba(245, 158, 11, 0.3)';
                        iconoOrd.innerHTML = '<i class="bi bi-clock-history fs-5"></i>';
                    }
                    if (tituloOrd) tituloOrd.textContent = 'Órdenes Pendientes';
                    if (elContador) {
                        elContador.className = 'text-warning fw-semibold';
                        elContador.textContent = `${pendientes.length} orden(es) por aprobar`;
                    }
                    if (elDesc) {
                        elDesc.textContent = `Tienes ${pendientes.length} orden(es) de compra pendientes de aprobación o recepción de proveedores.`;
                    }
                    if (btnDetallesOrd) {
                        btnDetallesOrd.style.backgroundColor = 'rgba(245, 158, 11, 0.15)';
                        btnDetallesOrd.style.color = '#FCD34D';
                        btnDetallesOrd.style.border = '1px solid rgba(245, 158, 11, 0.3)';
                        btnDetallesOrd.onclick = () => abrirModalOrdenes('pendientes');
                    }
                } else {
                    if (cardInnerOrd) cardInnerOrd.style.border = '1px solid rgba(255, 255, 255, 0.08) !important';
                    if (iconoOrd) {
                        iconoOrd.style.backgroundColor = 'rgba(16, 185, 129, 0.15)';
                        iconoOrd.style.color = '#10B981';
                        iconoOrd.style.borderColor = 'rgba(16, 185, 129, 0.3)';
                        iconoOrd.innerHTML = '<i class="bi bi-cart-check fs-5"></i>';
                    }
                    if (tituloOrd) tituloOrd.textContent = 'Órdenes de Compra';
                    if (elContador) {
                        elContador.className = 'text-success fw-semibold';
                        elContador.textContent = `${compras.length} órdenes (0 pendientes)`;
                    }
                    if (elDesc) {
                        elDesc.textContent = 'Todas las compras con proveedores se encuentran al día. No hay órdenes pendientes por aprobar.';
                    }
                    if (btnDetallesOrd) {
                        btnDetallesOrd.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                        btnDetallesOrd.style.color = '#E5E7EB';
                        btnDetallesOrd.style.border = '1px solid rgba(255, 255, 255, 0.15)';
                        btnDetallesOrd.onclick = () => abrirModalOrdenes('todas');
                    }
                }
            }
        } catch (err) {
            console.error('Error al consultar compras:', err);
        }
    } else if (cardOrdenes) {
        cardOrdenes.style.display = 'none';
    }

    // =========================================================================
    // C. BADGE GLOBAL DE ESTADO EN EL HEADER
    // =========================================================================
    if (badgeTotalAlertas) {
        if (totalAlertasActivas > 0) {
            badgeTotalAlertas.className = 'badge rounded-pill px-3 py-2 bg-danger bg-opacity-25 text-danger border border-danger border-opacity-50';
            badgeTotalAlertas.innerHTML = `<i class="bi bi-exclamation-triangle-fill me-1"></i> ${totalAlertasActivas} alerta(s) de atención`;
        } else {
            badgeTotalAlertas.className = 'badge rounded-pill px-3 py-2 bg-success bg-opacity-25 text-success border border-success border-opacity-50';
            badgeTotalAlertas.innerHTML = '<i class="bi bi-check-circle me-1"></i> Sistema al día (0 alertas críticas)';
        }
    }
}

// -----------------------------------------------------------------------------
// 3. ABRIR Y RENDERIZAR MODAL DE INVENTARIO
// -----------------------------------------------------------------------------
function abrirModalInventario(filtro = 'disponibles') {
    const totalDisp = datosInventarioGlobal.totalDisponibles;
    const total = datosInventarioGlobal.totalAutos;

    const elMetricDisp = document.getElementById('modal-inv-disp-count');
    const elMetricTotal = document.getElementById('modal-inv-total-count');
    const elMetricStatus = document.getElementById('modal-inv-status-badge');

    if (elMetricDisp) elMetricDisp.textContent = totalDisp;
    if (elMetricTotal) elMetricTotal.textContent = total;

    if (elMetricStatus) {
        if (totalDisp <= 10) {
            elMetricStatus.className = 'badge bg-danger bg-opacity-25 text-danger border border-danger rounded-pill px-3 py-1';
            elMetricStatus.innerHTML = '<i class="bi bi-exclamation-triangle-fill me-1"></i> Stock Crítico (≤ 10)';
        } else if (totalDisp <= 15) {
            elMetricStatus.className = 'badge bg-warning bg-opacity-25 text-warning border border-warning rounded-pill px-3 py-1';
            elMetricStatus.innerHTML = '<i class="bi bi-exclamation-circle-fill me-1"></i> Alerta Preventiva (≤ 15)';
        } else {
            elMetricStatus.className = 'badge bg-success bg-opacity-25 text-success border border-success rounded-pill px-3 py-1';
            elMetricStatus.innerHTML = '<i class="bi bi-check-circle-fill me-1"></i> Stock Óptimo (> 15)';
        }
    }

    renderizarTablaModalInventario(filtro);

    const modalEl = document.getElementById('modalDetallesInventario');
    if (modalEl) {
        const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
        modal.show();
    }
}

function renderizarTablaModalInventario(filtro) {
    const tbody = document.getElementById('tbody-modal-inventario');
    if (!tbody) return;

    let lista = datosInventarioGlobal.todos;
    if (filtro === 'disponibles') {
        lista = datosInventarioGlobal.disponibles;
    } else if (filtro === 'vendidos') {
        lista = datosInventarioGlobal.vendidos;
    }

    const btnFiltroDisp = document.getElementById('filtro-inv-disp');
    const btnFiltroVend = document.getElementById('filtro-inv-vend');
    const btnFiltroTodos = document.getElementById('filtro-inv-todos');

    if (btnFiltroDisp) btnFiltroDisp.className = filtro === 'disponibles' ? 'btn btn-sm btn-success rounded-pill px-3' : 'btn btn-sm btn-outline-secondary rounded-pill px-3';
    if (btnFiltroVend) btnFiltroVend.className = filtro === 'vendidos' ? 'btn btn-sm btn-secondary rounded-pill px-3' : 'btn btn-sm btn-outline-secondary rounded-pill px-3';
    if (btnFiltroTodos) btnFiltroTodos.className = filtro === 'todos' ? 'btn btn-sm btn-light rounded-pill px-3' : 'btn btn-sm btn-outline-secondary rounded-pill px-3';

    if (lista.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-secondary py-4">No hay vehículos en esta categoría.</td></tr>';
        return;
    }

    tbody.innerHTML = lista.map((a, idx) => {
        const est = (a.Estado || '').trim().toLowerCase();
        const esDisp = est === 'disponible';
        const badgeClass = esDisp ? 'badge-activa' : 'badge-finalizada';
        const estadoTexto = esDisp ? 'Disponible' : 'Vendido';
        const precioFmt = (a.Precio || 0).toLocaleString('es-NI', { style: 'currency', currency: 'USD' });

        return `
            <tr>
                <td class="text-secondary small">${idx + 1}</td>
                <td class="fw-bold text-white">${a.Marca || '-'}</td>
                <td class="text-white">${a.Modelo || '-'}</td>
                <td class="text-secondary small">${a.Anio || '-'} ${a.Placa ? '• ' + a.Placa : ''}</td>
                <td class="text-end fw-semibold text-white">${precioFmt}</td>
                <td class="text-center">
                    <span class="badge ${badgeClass} rounded-pill px-3 py-1">
                        ${estadoTexto}
                    </span>
                </td>
            </tr>
        `;
    }).join('');
}

// -----------------------------------------------------------------------------
// 4. ABRIR Y RENDERIZAR MODAL DE ÓRDENES
// -----------------------------------------------------------------------------
function abrirModalOrdenes(filtro = 'pendientes') {
    renderizarTablaModalOrdenes(filtro);

    const modalEl = document.getElementById('modalDetallesOrdenes');
    if (modalEl) {
        const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
        modal.show();
    }
}

function renderizarTablaModalOrdenes(filtro = 'pendientes') {
    const tbody = document.getElementById('tbody-modal-ordenes');
    const badgeCount = document.getElementById('badge-modal-ordenes-count');

    let lista = datosComprasGlobal.pendientes;
    if (filtro === 'completadas') {
        lista = datosComprasGlobal.completadas;
    } else if (filtro === 'todas') {
        lista = datosComprasGlobal.todas;
    }

    if (badgeCount) {
        badgeCount.textContent = `${datosComprasGlobal.pendientes.length} pendientes / ${datosComprasGlobal.todas.length} total`;
    }

    const btnFiltroPend = document.getElementById('filtro-ord-pend');
    const btnFiltroComp = document.getElementById('filtro-ord-comp');
    const btnFiltroTodas = document.getElementById('filtro-ord-todas');

    if (btnFiltroPend) btnFiltroPend.className = filtro === 'pendientes' ? 'btn btn-sm btn-warning rounded-pill px-3' : 'btn btn-sm btn-outline-secondary rounded-pill px-3';
    if (btnFiltroComp) btnFiltroComp.className = filtro === 'completadas' ? 'btn btn-sm btn-success rounded-pill px-3' : 'btn btn-sm btn-outline-secondary rounded-pill px-3';
    if (btnFiltroTodas) btnFiltroTodas.className = filtro === 'todas' ? 'btn btn-sm btn-light rounded-pill px-3' : 'btn btn-sm btn-outline-secondary rounded-pill px-3';

    if (!tbody) return;

    if (lista.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-secondary py-4">No hay órdenes en esta categoría.</td></tr>';
        return;
    }

    tbody.innerHTML = lista.map((c, idx) => {
        const fechaStr = c.FechaCompra ? new Date(c.FechaCompra).toLocaleDateString('es-NI') : 'N/D';
        const totalFmt = (c.TotalCompra || 0).toLocaleString('es-NI', { style: 'currency', currency: 'USD' });
        const est = (c.EstadoCompra || '').trim().toLowerCase();
        const esPend = est.includes('pendiente');
        const badgeClass = esPend ? 'badge-pendiente' : 'badge-activa';

        return `
            <tr>
                <td class="text-secondary small">${idx + 1}</td>
                <td class="fw-bold text-white">${c.NumFactura || ('ORD-' + c.idCompra)}</td>
                <td class="text-white">${c.Proveedor || 'Desconocido'}</td>
                <td class="text-secondary small">${fechaStr}</td>
                <td class="text-end fw-bold ${esPend ? 'text-warning' : 'text-success'}">${totalFmt}</td>
                <td class="text-center">
                    <span class="badge ${badgeClass} rounded-pill px-3 py-1">
                        <i class="bi ${esPend ? 'bi-clock' : 'bi-check2'} me-1"></i> ${c.EstadoCompra || 'Completado'}
                    </span>
                </td>
                <td class="text-end">
                    <a href="Pages/compras.html" class="btn btn-sm btn-outline-warning rounded-pill px-3">
                        <i class="bi bi-arrow-right-circle me-1"></i> Ir a Compras
                    </a>
                </td>
            </tr>
        `;
    }).join('');
}

window.renderizarTablaModalInventario = renderizarTablaModalInventario;
window.renderizarTablaModalOrdenes = renderizarTablaModalOrdenes;

window.abrirModalInventario = abrirModalInventario;
window.abrirModalOrdenes = abrirModalOrdenes;
window.cargarAlertasDashboard = cargarAlertasDashboard;
