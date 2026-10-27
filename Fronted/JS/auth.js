/**
 * AMI - Sistema de Autenticación y Control de Acceso por Roles (RBAC)
 */

(function () {
    // 1. Obtener la sesión del usuario guardada
    const usuarioSesion = localStorage.getItem('usuario_ami');
    const rutaActual = window.location.pathname.toLowerCase();
    const esPaginaLogin = rutaActual.endsWith('login.html');
    const esPaginaSalir = rutaActual.endsWith('salir.html');

    // Si no ha iniciado sesión y no está en el login ni en salir, redirigir al Login
    if (!usuarioSesion) {
        if (!esPaginaLogin && !esPaginaSalir) {
            const rutaLogin = window.location.pathname.includes('/Pages/') ? '../Login.html' : 'Login.html';
            window.location.href = rutaLogin;
        }
        return;
    }

    const usuario = JSON.parse(usuarioSesion);

    // Mapeo entre los enlaces del Sidebar y los nombres de módulos en la BD
    const mapaModulos = {
        'inventario.html': 'Inventario',
        'ventas.html': 'Ventas',
        'compras.html': 'Compras',
        'clientes.html': 'Clientes',
        'marketing.html': 'Marketing',
        'costos.html': 'Costos',
        'finanzas.html': 'Costos',
        'reportes.html': 'Analisis',
        'usuarios.html': 'Usuarios',
        'recursoshumanos.html': 'Personal',
        'index.html': 'Dashboard'
    };

    // Función global para consultar permisos desde cualquier pantalla
    window.tienePermiso = function (modulo, accion = 'puedeVer') {
        if (!usuario || !usuario.permisos) return false;
        // El Superadministrador siempre tiene permiso total
        if (usuario.rol === 'Superadministrador' || usuario.idRol === 4) return true;

        const permisoModulo = usuario.permisos.find(p => p.modulo.toLowerCase() === modulo.toLowerCase());
        if (!permisoModulo) return false;
        return !!permisoModulo[accion];
    };

    // Función global para cerrar sesión limpiamente
    window.cerrarSesion = function () {
        localStorage.removeItem('usuario_ami');
        const rutaLogin = window.location.pathname.includes('/Pages/') ? '../Login.html' : 'Login.html';
        window.location.href = rutaLogin;
    };

    // Función que aplica los permisos a la interfaz
    function aplicarPermisosYPerfil() {
        // A. Mostrar nombre y rol en la barra superior
        const elNombreUsuario = document.getElementById('nombre-usuario');
        if (elNombreUsuario) {
            elNombreUsuario.innerHTML = `${usuario.nombre} <small class="text-secondary fw-normal">(${usuario.rol})</small> <i class="bi bi-chevron-down ms-1 text-muted"></i>`;
        }

        // B. Mostrar nombre en el saludo del Dashboard si existe
        const elSaludo = document.getElementById('nombre-saludo');
        if (elSaludo) {
            elSaludo.textContent = (usuario.nombre || '').split(' ')[0];
        }

        // C. Configurar menú desplegable del perfil de usuario (Ver perfil / Cerrar sesión)
        const dropdownUsuario = elNombreUsuario ? elNombreUsuario.closest('.dropdown') : document.querySelector('.dropdown');
        if (dropdownUsuario) {
            const menuDropdown = dropdownUsuario.querySelector('.dropdown-menu');
            if (menuDropdown) {
                const enPaginas = window.location.pathname.includes('/Pages/');
                const rutaPerfil = enPaginas ? 'Perfil.html' : 'Pages/Perfil.html';
                menuDropdown.innerHTML = `
                    <li>
                        <a class="dropdown-item py-2 d-flex align-items-center" href="${rutaPerfil}">
                            <i class="bi bi-person me-2 text-muted fs-6"></i> Ver perfil
                        </a>
                    </li>
                    <li><hr class="dropdown-divider border-secondary my-1 opacity-25"></li>
                    <li>
                        <a class="dropdown-item py-2 d-flex align-items-center text-danger" href="#" onclick="window.cerrarSesion(); return false;">
                            <i class="bi bi-box-arrow-right me-2 text-danger fs-6"></i> Cerrar sesión
                        </a>
                    </li>
                `;
            }
        }

        // D. Filtrar enlaces del Sidebar según permisos
        const linksSidebar = document.querySelectorAll('.sidebar-menu a, .sidebar a');
        linksSidebar.forEach(link => {
            const href = (link.getAttribute('href') || '').toLowerCase();
            for (const [archivo, modulo] of Object.entries(mapaModulos)) {
                if (href.includes(archivo)) {
                    if (!window.tienePermiso(modulo, 'puedeVer')) {
                        link.classList.add('d-none');
                        link.style.setProperty('display', 'none', 'important');
                    }
                    break;
                }
            }
        });

        // E. Si la página actual no tiene permiso de ser vista, bloquear el acceso
        const paginaActual = window.location.pathname.split('/').pop().toLowerCase();
        const moduloActual = mapaModulos[paginaActual];
        if (moduloActual && !window.tienePermiso(moduloActual, 'puedeVer')) {
            alert('No tienes permiso para acceder al módulo de ' + moduloActual);
            const rutaInicio = window.location.pathname.includes('/Pages/') ? '../index.html' : 'index.html';
            window.location.href = rutaInicio;
        }

        // F. Hacer que los botones de "Salir" cierren sesión automáticamente
        const linksSalir = document.querySelectorAll('a[href*="Salir.html"], a[href*="salir.html"]');
        linksSalir.forEach(btn => {
            btn.addEventListener('click', function (e) {
                e.preventDefault();
                window.cerrarSesion();
            });
        });
    }

    // Ejecutar de inmediato o esperar al DOM si aún está cargando
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', aplicarPermisosYPerfil);
    } else {
        aplicarPermisosYPerfil();
    }

    // Guardar usuario en window para acceso global
    window.usuarioAMI = usuario;
})();
