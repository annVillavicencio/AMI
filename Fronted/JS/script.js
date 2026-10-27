/**
 * AMI - Script Principal de Inicio / Dashboard
 * Gestión de navegación activa, verificación de alertas en tiempo real y modales interactivos
 * Umbrales de Inventario:
 *  - Alerta dinámica: <= 15 vehículos disponibles
 *  - Nivel crítico: <= 10 vehículos disponibles
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

let datosOrdenesPendientes = [];

async function cargarAlertasDashboard() {
    const cardInventario = document.getElementById('card-alerta-inventario');
    const cardOrdenes = document.getElementById('card-alerta-ordenes');
    const cardSinAlertas = document.getElementById('card-sin-alertas');
    const badgeTotalAlertas = document.getElementById('badge-total-alertas');

    let totalAlertasActivas = 0;

    // Verificar permisos del usuario actual
    const tienePermisoInventario = typeof window.tienePermiso === 'function' ? window.tienePermiso('Inventario', 'puedeVer') : true;
    const tienePermisoCompras = typeof window.tienePermiso === 'function' ? window.tienePermiso('Compras', 'puedeVer') : true;

    // A. Evaluar Alerta de Inventario (Umbrales: Alerta <= 15, Crítico <= 10)
    if (tienePermisoInventario && cardInventario) {
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
                    cardInventario.style.display = 'block';

                    if (cardInner) {
                        cardInner.style.border = '1px solid rgba(239, 68, 68, 0.4) !important';
                    }
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
                    cardInventario.style.display = 'block';

                    if (cardInner) {
                        cardInner.style.border = '1px solid rgba(245, 158, 11, 0.4) !important';
                    }
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
                    // NIVEL ÓPTIMO: > 15 vehículos disponibles (Monitor en estado saludable)
                    cardInventario.style.display = 'block';

                    if (cardInner) {
                        cardInner.style.border = '1px solid rgba(16, 185, 129, 0.3) !important';
                    }
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
                        elDesc.textContent = `El inventario se encuentra saludable con ${totalDisp} unidades. La alerta preventiva se activará al bajar a 15 y el nivel crítico en 10 vehículos.`;
                    }
                    if (btnDetallesInv) {
                        btnDetallesInv.style.backgroundColor = 'rgba(16, 185, 129, 0.15)';
                        btnDetallesInv.style.color = '#6EE7B7';
                        btnDetallesInv.style.border = '1px solid rgba(16, 185, 129, 0.3)';
                        btnDetallesInv.onclick = () => abrirModalInventario('disponibles');
                    }
                }
            } else {
                cardInventario.style.display = 'none';
            }
        } catch (err) {
            console.error('Error al consultar inventario:', err);
            cardInventario.style.display = 'none';
        }
    } else if (cardInventario) {
        cardInventario.style.display = 'none';
    }

    // B. Evaluar Alerta de Órdenes Pendientes
    if (tienePermisoCompras && cardOrdenes) {
        try {
            const respComp = await fetch('/api/compras');
            if (respComp.ok) {
                const compras = await respComp.json();
                
                // Filtrar compras pendientes
                datosOrdenesPendientes = compras.filter(c => {
                    const est = (c.EstadoCompra || '').trim().toLowerCase();
                    return est.includes('pendiente') || est.includes('aprobar') || est.includes('proceso');
                });

                if (datosOrdenesPendientes.length > 0) {
                    cardOrdenes.style.display = 'block';
                    totalAlertasActivas++;

                    const elContador = document.getElementById('contador-ordenes-pendientes');
                    const elDesc = document.getElementById('desc-ordenes-pendientes');

                    if (elContador) {
                        elContador.textContent = `${datosOrdenesPendientes.length} orden(es) pendiente(s)`;
                    }
                    if (elDesc) {
                        elDesc.textContent = `Tienes ${datosOrdenesPendientes.length} orden(es) de compra pendientes de aprobación o recepción.`;
                    }

                    const btnDetallesOrd = document.getElementById('btn-detalles-ordenes');
                    if (btnDetallesOrd) {
                        btnDetallesOrd.onclick = () => abrirModalOrdenes(datosOrdenesPendientes);
                    }
                } else {
                    cardOrdenes.style.display = 'none';
                }
            } else {
                cardOrdenes.style.display = 'none';
            }
        } catch (err) {
            console.error('Error al consultar compras:', err);
            cardOrdenes.style.display = 'none';
        }
    } else if (cardOrdenes) {
        cardOrdenes.style.display = 'none';
    }

    // C. Indicador Global en el Header de Alertas
    if (badgeTotalAlertas) {
        if (totalAlertasActivas > 0) {
            badgeTotalAlertas.className = 'badge rounded-pill px-3 py-2 bg-danger bg-opacity-25 text-danger border border-danger border-opacity-50';
            badgeTotalAlertas.innerHTML = `<i class="bi bi-exclamation-triangle-fill me-1"></i> ${totalAlertasActivas} alerta(s) de atención`;
        } else {
            badgeTotalAlertas.className = 'badge rounded-pill px-3 py-2 bg-success bg-opacity-25 text-success border border-success border-opacity-50';
            badgeTotalAlertas.innerHTML = '<i class="bi bi-check-circle me-1"></i> Sistema al día (Sin alertas críticas)';
        }
    }
}

// 3. Abrir Modal de Inventario
function abrirModalInventario(filtro = 'disponibles') {
    const totalDisp = datosInventarioGlobal.totalDisponibles;
    const totalV = datosInventarioGlobal.totalVendidos;
    const total = datosInventarioGlobal.totalAutos;

    // Actualizar cabecera de métricas en el modal
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

// Renderizar tabla del modal de inventario según filtro
function renderizarTablaModalInventario(filtro) {
    const tbody = document.getElementById('tbody-modal-inventario');
    if (!tbody) return;

    let lista = datosInventarioGlobal.todos;
    if (filtro === 'disponibles') {
        lista = datosInventarioGlobal.disponibles;
    } else if (filtro === 'vendidos') {
        lista = datosInventarioGlobal.vendidos;
    }

    // Actualizar botones de filtro
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

// 4. Abrir Modal de Órdenes Pendientes
function abrirModalOrdenes(ordenes) {
    const tbody = document.getElementById('tbody-modal-ordenes');
    const badgeCount = document.getElementById('badge-modal-ordenes-count');

    if (badgeCount) {
        badgeCount.textContent = `${ordenes.length} órdenes`;
    }

    if (tbody) {
        tbody.innerHTML = ordenes.map((c, idx) => {
            const fechaStr = c.FechaCompra ? new Date(c.FechaCompra).toLocaleDateString('es-NI') : 'N/D';
            const totalFmt = (c.TotalCompra || 0).toLocaleString('es-NI', { style: 'currency', currency: 'USD' });
            return `
                <tr>
                    <td class="text-secondary small">${idx + 1}</td>
                    <td class="fw-bold text-white">${c.NumFactura || ('ORD-' + c.idCompra)}</td>
                    <td class="text-white">${c.Proveedor || 'Desconocido'}</td>
                    <td class="text-secondary small">${fechaStr}</td>
                    <td class="text-end fw-bold text-warning">${totalFmt}</td>
                    <td class="text-center">
                        <span class="badge badge-pendiente rounded-pill px-3 py-1">
                            <i class="bi bi-clock me-1"></i> ${c.EstadoCompra || 'Pendiente'}
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

    const modalEl = document.getElementById('modalDetallesOrdenes');
    if (modalEl) {
        const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
        modal.show();
    }
}
