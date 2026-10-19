// ==========================================================================
// AMI - Módulo de Usuarios (usuarios.js)
// Gestión integral de accesos, roles, estados, KPIs y CRUD completo
// ==========================================================================

let usuariosData = [];
let rolesData = [];
let usuarioEnEdicion = null;

document.addEventListener("DOMContentLoaded", () => {
    cargarDatos();

    // 1. Buscador en tiempo real
    const searchInput = document.getElementById('input-busqueda-usuario');
    if (searchInput) {
        searchInput.addEventListener('input', () => { renderizarTabla(); });
        searchInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') renderizarTabla();
        });
    }

    // 2. Filtros de Rol y Estado
    const filtroRol = document.getElementById('filtro-rol-usuario');
    if (filtroRol) {
        filtroRol.addEventListener('change', () => { renderizarTabla(); });
    }

    const filtroEstado = document.getElementById('filtro-estado-usuario');
    if (filtroEstado) {
        filtroEstado.addEventListener('change', () => { renderizarTabla(); });
    }

    // 3. Botón y formulario para Guardar Usuario
    const btnGuardar = document.getElementById('btn-guardar-usuario');
    if (btnGuardar) {
        btnGuardar.addEventListener('click', guardarUsuario);
    }

    const formUsuario = document.getElementById('formUsuario');
    if (formUsuario) {
        formUsuario.addEventListener('submit', (e) => {
            e.preventDefault();
            guardarUsuario();
        });
    }

    // 4. Limpieza del modal al cerrarse
    const modalEl = document.getElementById('modalUsuario');
    if (modalEl) {
        modalEl.addEventListener('hidden.bs.modal', () => {
            limpiarFormularioUsuario();
        });
    }
});

// --------------------------------------------------------------------------
// CARGAR DATOS DESDE LA API
// --------------------------------------------------------------------------
async function cargarDatos() {
    try {
        const [resUsers, resRoles] = await Promise.all([
            fetch('/api/usuarios'),
            fetch('/api/usuarios/roles').catch(() => null)
        ]);

        if (!resUsers.ok) throw new Error('Error al cargar usuarios');
        usuariosData = await resUsers.json();

        if (resRoles && resRoles.ok) {
            rolesData = await resRoles.json();
            poblarSelectsRoles();
        }

        renderizarTabla();
        actualizarKPIs(usuariosData);
    } catch (err) {
        console.error('Error al cargar usuarios:', err);
        const tbody = document.getElementById("usuarios-table-body");
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center text-danger py-4"><i class="bi bi-exclamation-triangle-fill me-2"></i> Error al cargar usuarios del servidor.</td></tr>';
        }
    }
}

// --------------------------------------------------------------------------
// POBLAR SELECTS DE ROLES
// --------------------------------------------------------------------------
function poblarSelectsRoles() {
    // Select del modal
    const selModal = document.getElementById('usuario-rol');
    if (selModal) {
        selModal.innerHTML = '<option value="" selected disabled>Seleccione un rol</option>';
        rolesData.forEach(r => {
            const opt = document.createElement('option');
            opt.value = r.idRol;
            opt.textContent = r.NombreRol;
            selModal.appendChild(opt);
        });
    }

    // Select de filtro en tabla
    const selFiltro = document.getElementById('filtro-rol-usuario');
    if (selFiltro) {
        selFiltro.innerHTML = '<option value="Todos">Todos los roles</option>';
        rolesData.forEach(r => {
            const opt = document.createElement('option');
            opt.value = r.idRol;
            opt.textContent = r.NombreRol;
            selFiltro.appendChild(opt);
        });
    }
}

// --------------------------------------------------------------------------
// RENDERIZAR TABLA CON FILTROS
// --------------------------------------------------------------------------
function renderizarTabla() {
    const tbody = document.getElementById("usuarios-table-body");
    if (!tbody) return;
    tbody.innerHTML = "";

    const searchInput = document.getElementById('input-busqueda-usuario');
    const busqueda = searchInput ? searchInput.value.trim().toLowerCase() : '';

    const filtroRol = document.getElementById('filtro-rol-usuario');
    const rolVal = filtroRol ? filtroRol.value : 'Todos';

    const filtroEstado = document.getElementById('filtro-estado-usuario');
    const estadoVal = filtroEstado ? filtroEstado.value.trim().toLowerCase() : 'todos los estados';

    const filtrados = usuariosData.filter(u => {
        const id = u.idUsuario ? String(u.idUsuario) : "";
        const nom = (u.Nombre || '').toLowerCase();
        const ape = (u.Apellido || '').toLowerCase();
        const correo = (u.correo || '').toLowerCase();
        const rol = (u.NombreRol || '').toLowerCase();

        const coincideBusqueda = !busqueda ||
            id.includes(busqueda) ||
            nom.includes(busqueda) ||
            ape.includes(busqueda) ||
            correo.includes(busqueda) ||
            rol.includes(busqueda);

        const coincideRol = (rolVal === 'Todos' || !rolVal) || String(u.idRol) === String(rolVal);

        const est = (u.EstadoUser || '').trim().toLowerCase();
        const coincideEstado = (estadoVal === 'todos los estados' || estadoVal === 'todos' || !estadoVal) ||
            est === estadoVal;

        return coincideBusqueda && coincideRol && coincideEstado;
    });

    actualizarKPIs(filtrados);

    const contador = document.getElementById('contador-usuarios');
    if (contador) {
        contador.innerText = `Mostrando ${filtrados.length} de ${usuariosData.length} usuarios`;
    }

    if (filtrados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4"><i class="bi bi-inbox fs-4 d-block mb-1"></i> No se encontraron usuarios registrados.</td></tr>';
        return;
    }

    filtrados.forEach(u => {
        const tr = document.createElement("tr");
        tr.style.borderBottom = '1px solid rgba(255,255,255,0.05)';

        const fecha = u.fechaCreacion ? new Date(u.fechaCreacion).toISOString().split('T')[0] : 'N/A';
        const esActivo = (u.EstadoUser || '').trim().toLowerCase() === 'activo';

        let badgeRol = 'role-super';
        const rolLower = (u.NombreRol || '').toLowerCase();
        if (rolLower.includes('admin') && !rolLower.includes('super')) badgeRol = 'role-admin';
        else if (rolLower.includes('revision') || rolLower.includes('estandar')) badgeRol = 'role-colab';

        tr.innerHTML = `
            <td class="text-secondary fw-bold text-center">#${u.idUsuario}</td>
            <td class="text-white fw-bold">${u.Nombre || '-'}</td>
            <td class="text-white">${u.Apellido || '-'}</td>
            <td class="text-secondary">${u.correo}</td>
            <td><span class="role-badge ${badgeRol}"><i class="bi bi-award me-1"></i> ${u.NombreRol}</span></td>
            <td class="text-secondary text-center">${fecha}</td>
            <td class="text-center">
                <span class="status-badge ${esActivo ? 'status-active' : 'status-inactive'}">
                    <span class="status-dot ${esActivo ? 'dot-active' : 'dot-inactive'}"></span>
                    ${u.EstadoUser || 'Activo'}
                </span>
            </td>
            <td class="text-center">
                <div class="dropdown">
                    <button class="btn btn-link text-secondary p-0 border-0" type="button" data-bs-toggle="dropdown" aria-expanded="false" title="Acciones">
                        <i class="bi bi-three-dots-vertical fs-5"></i>
                    </button>
                    <ul class="dropdown-menu dropdown-menu-dark dropdown-menu-end shadow" style="background-color: #1A2218; border: 1px solid rgba(255,255,255,0.1);">
                        <li>
                            <a class="dropdown-item text-white py-2" href="javascript:void(0)" onclick="abrirModalEditarUsuario(${u.idUsuario})">
                                <i class="bi bi-pencil-square me-2" style="color: #DBFF99;"></i> Editar
                            </a>
                        </li>
                        <li><hr class="dropdown-divider border-secondary opacity-25 my-1"></li>
                        <li>
                            <a class="dropdown-item text-danger py-2" href="javascript:void(0)" onclick="eliminarUsuario(${u.idUsuario})">
                                <i class="bi bi-trash me-2"></i> Eliminar
                            </a>
                        </li>
                    </ul>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// --------------------------------------------------------------------------
// GUARDAR USUARIO (CREAR O EDITAR)
// --------------------------------------------------------------------------
async function guardarUsuario(e) {
    if (e && e.preventDefault) e.preventDefault();

    const nombre = document.getElementById('usuario-nombre')?.value.trim();
    const apellido = document.getElementById('usuario-apellido')?.value.trim();
    const correo = document.getElementById('usuario-correo')?.value.trim();
    const contrasena = document.getElementById('usuario-contrasena')?.value;
    const idRol = document.getElementById('usuario-rol')?.value;
    const estado = document.getElementById('usuario-estado')?.value;

    if (!correo || !idRol) {
        alert('Por favor complete los campos obligatorios: Correo y Rol.');
        return;
    }

    if (!usuarioEnEdicion && !contrasena) {
        alert('La contraseña es obligatoria para nuevos usuarios.');
        return;
    }

    const payload = {
        nombre: nombre || '',
        apellido: apellido || '',
        correo: correo,
        contrasena: contrasena || '',
        idRol: parseInt(idRol),
        estado: estado || 'Activo'
    };

    const url = usuarioEnEdicion ? `/api/usuarios/${usuarioEnEdicion}` : '/api/usuarios';
    const method = usuarioEnEdicion ? 'PUT' : 'POST';

    const btnGuardar = document.getElementById('btn-guardar-usuario');
    const txtOriginal = btnGuardar ? btnGuardar.innerText : 'Guardar Usuario';

    try {
        if (btnGuardar) {
            btnGuardar.disabled = true;
            btnGuardar.innerText = 'Guardando...';
        }

        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (btnGuardar) {
            btnGuardar.disabled = false;
            btnGuardar.innerText = txtOriginal;
        }

        if (!res.ok) {
            const errJson = await res.json().catch(() => ({}));
            throw new Error(errJson.error || 'Error al guardar usuario en el servidor');
        }

        const modalEl = document.getElementById('modalUsuario');
        if (modalEl) {
            const modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();
        }

        limpiarFormularioUsuario();
        await cargarDatos();
        alert(usuarioEnEdicion ? 'Usuario actualizado con éxito.' : 'Usuario registrado con éxito.');
    } catch (err) {
        if (btnGuardar) {
            btnGuardar.disabled = false;
            btnGuardar.innerText = txtOriginal;
        }
        console.error('Error al guardar usuario:', err);
        alert('Error al guardar usuario: ' + err.message);
    }
}

// --------------------------------------------------------------------------
// ABRIR MODAL PARA EDITAR
// --------------------------------------------------------------------------
function abrirModalEditarUsuario(id) {
    const user = usuariosData.find(u => u.idUsuario === id);
    if (!user) {
        alert('No se encontró el usuario seleccionado.');
        return;
    }

    usuarioEnEdicion = id;

    const elId = document.getElementById('usuario-id');
    if (elId) elId.value = id;

    const elNom = document.getElementById('usuario-nombre');
    if (elNom) elNom.value = user.Nombre || '';

    const elApe = document.getElementById('usuario-apellido');
    if (elApe) elApe.value = user.Apellido || '';

    const elCorreo = document.getElementById('usuario-correo');
    if (elCorreo) elCorreo.value = user.correo || '';

    const elPass = document.getElementById('usuario-contrasena');
    if (elPass) {
        elPass.value = '';
        elPass.placeholder = '•••••••• (Dejar en blanco para no cambiar)';
    }

    const elRol = document.getElementById('usuario-rol');
    if (elRol && user.idRol) elRol.value = user.idRol;

    const elEstado = document.getElementById('usuario-estado');
    if (elEstado) elEstado.value = user.EstadoUser || 'Activo';

    const label = document.getElementById('modalUsuarioLabel');
    if (label) {
        label.innerHTML = `<i class="bi bi-pencil-square text-neon-green me-2"></i>Editar Usuario #${id}`;
    }

    const btnGuardar = document.getElementById('btn-guardar-usuario');
    if (btnGuardar) btnGuardar.innerText = 'Guardar Cambios';

    const modalEl = document.getElementById('modalUsuario');
    if (modalEl) {
        const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
        modal.show();
    }
}

// --------------------------------------------------------------------------
// ELIMINAR USUARIO
// --------------------------------------------------------------------------
async function eliminarUsuario(id) {
    if (!confirm(`¿Estás seguro de que deseas eliminar el usuario con ID #${id}?`)) return;

    try {
        const res = await fetch(`/api/usuarios/${id}`, {
            method: 'DELETE'
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || 'No se pudo eliminar el usuario.');
        }

        await cargarDatos();
        alert('Usuario eliminado con éxito.');
    } catch (err) {
        console.error('Error eliminando usuario:', err);
        alert('Error al eliminar usuario: ' + err.message);
    }
}

// --------------------------------------------------------------------------
// LIMPIAR FORMULARIO
// --------------------------------------------------------------------------
function limpiarFormularioUsuario() {
    usuarioEnEdicion = null;
    const form = document.getElementById('formUsuario');
    if (form) form.reset();

    const elPass = document.getElementById('usuario-contrasena');
    if (elPass) elPass.placeholder = 'Dejar en blanco para conservar al editar';

    const label = document.getElementById('modalUsuarioLabel');
    if (label) {
        label.innerHTML = '<i class="bi bi-person-plus text-neon-green me-2"></i> Nuevo Usuario';
    }

    const btnGuardar = document.getElementById('btn-guardar-usuario');
    if (btnGuardar) btnGuardar.innerText = 'Guardar Usuario';
}

window.abrirModalEditarUsuario = abrirModalEditarUsuario;
window.eliminarUsuario = eliminarUsuario;

// --------------------------------------------------------------------------
// ACTUALIZAR KPIS
// --------------------------------------------------------------------------
function actualizarKPIs(data) {
    const total = data.length;
    const activos = data.filter(u => (u.EstadoUser || '').trim().toLowerCase() === 'activo').length;
    const inactivos = total - activos;

    const eTotal = document.getElementById('kpi-total-usuarios');
    if (eTotal) eTotal.innerText = total;

    const eAct = document.getElementById('kpi-activos-usuarios');
    if (eAct) eAct.innerText = activos;

    const eInact = document.getElementById('kpi-inactivos-usuarios');
    if (eInact) eInact.innerText = inactivos;
}
