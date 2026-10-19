# AMI - Sistema de Gestión Integral

Un sistema centralizado para la administración eficiente de inventario automotriz, ventas, compras, clientes y campañas de marketing. AMI está diseñado bajo una arquitectura de control de acceso basada en roles (RBAC), ofreciendo interfaces dinámicas y paneles de análisis de datos en tiempo real.

---

## Roles y Permisos

El sistema detecta automáticamente el rol del usuario tras el inicio de sesión y adapta la interfaz y las funciones disponibles según el nivel de acceso.

| Función / Módulo | Superadministrador | Administrador | Usuario Estándar | Usuario de Consulta |
| :--- | :---: | :---: | :---: | :---: |
| **Inicio / Dashboard** | ✅ | ✅ | ✅ | ✅ (Básico) |
| **Ventas e Inventario** | ✅ (CRUD) | ✅ (CRUD) | ✅ (Solo lectura) | ❌ |
| **Marketing** | ✅ (CRUD) | ✅ (CRUD) | ✅ (Solo lectura) | ❌ |
| **Recursos humanos**| ✅ | ❌ | ❌ | ❌ |
| **Costos** | ✅ (CRUD) | ✅ (CRUD) | ✅ (Solo lectura) | ❌ |
| **Reportes y Análisis** | ✅ | ❌ | ❌ | ❌ |
| **Gestión de Usuarios** | ✅ | ❌ | ❌ | ❌ |


*(CRUD: Crear, Leer, Actualizar, Eliminar)*

---

## Interfaz de Usuario (UI) y Navegación

El diseño de la aplicación está pensado para ser intuitivo y de rápido acceso:

*   **Autenticación:** Login seguro mediante correo electrónico y contraseña.
*   **Barra Superior (Navbar):** 
    *   Logo de AMI.
    *   Campanilla de notificaciones del sistema.
    *   Menú de perfil de usuario (Foto, Nombre, Correo, Rol y cambio de contraseña).
*   **Barra Lateral (Sidebar):** Menú de navegación colapsable (botón de tres puntos) para acceder a los distintos módulos del sistema.

---

## Módulos Principales

### 1. Inicio (Dashboard)
Pantalla de bienvenida personalizada (`"Bienvenido [Nombre de usuario]"`).
*   **Hero Section:** Imagen representativa de la empresa y mensaje principal (dinámicos).
*   **Tarjetas de Resumen (KPIs):** Visualización rápida de notificaciones e información vital reciente de todas las áreas de la empresa.

### 2. Inventario
Gestión completa del catálogo de vehículos.
*   **Características:** Barra de búsqueda, botón de nuevo registro y tabla de datos.
*   **Tabla de Datos:** Muestra Vehículo, Año, Precio y Estado.
*   **Acciones:** Ver detalles, editar y eliminar.
*   **Registro:** Formulario para registrar Marca, Modelo, Año y Precio.

### 3. Ventas
Control del flujo de ingresos y salidas de vehículos.
*   **Características:** Búsqueda por fecha, conteo de ventas totales e historial reciente.
*   **Registro:** Selección de Cliente, Vehículo, Fecha, Forma de pago y Precio final.

### 4. Compras
Administración de adquisiciones e inversión.
*   **Características:** Búsqueda, conteo de compras registradas y total invertido.
*   **Registro:** Selección de Proveedor, Vehículo, Fecha, Costo de adquisición y Forma de pago.

### 5. Clientes
Directorio y gestión de la cartera de clientes.
*   **Características:** Búsqueda por nombre o cédula.
*   **Acciones:** Tabla de clientes con opciones para ver detalles, agregar, editar o eliminar.

### 6. Marketing
Control de campañas publicitarias.
*   **Visualización:** Diseño basado en tarjetas (Cards) en lugar de tablas tradicionales.
*   **Datos de Campaña:** Nombre, Rango de fechas, Presupuesto e Interacciones.
*   **Acciones:** Menú contextual (tres puntos) en cada tarjeta para editar o eliminar la campaña.

---

## Módulos Especiales (Superadministrador)

### Reportes y Análisis
Panel avanzado para la toma de decisiones estratégicas.
*   **Resumen de Periodo:** Filtros por fecha de inicio y fin.
*   **Tarjetas de Rendimiento:** Cantidad de ventas, ingresos totales y unidades vendidas.
*   **Gráficos:** Rendimiento de ventas y campañas de marketing con mayor interacción.
*   **Indicadores Específicos:** Vehículos más vendidos e inventario de baja rotación.

### Administración de Usuarios
Control total sobre los accesos al sistema.
*   **Características:** Búsqueda de usuarios y registro de nuevas cuentas.
*   **Tabla de Usuarios:** Muestra Nombre, Correo, Contraseña (enmascarada) y Rol.
*   **Gestión:** Opciones para editar información, eliminar cuentas, revocar permisos o ascender de rango.

###  Salida
*   Opción segura para cerrar sesión y volver a la pantalla de Login.


---

## 🐳 Despliegue Rápido con Docker (Instalación en 1 Solo Paso)

Para que cualquier miembro del equipo ejecute el sistema completo sin necesidad de configurar SQL Server manualmente ni lidiar con versiones locales de Node:

### 1. Requisitos Previos
* Tener instalado **Docker Desktop** (en Windows, Mac o Linux) y tenerlo en ejecución.
* **Git** para clonar el repositorio.

### 2. Puesta en Marcha Inmediata
Abre una terminal en la raíz del proyecto (`AMI`) y ejecuta:

```bash
docker compose up --build
```

*(Si tu versión de Docker usa guion, también puedes usar: `docker-compose up --build`)*

### 3. ¿Qué hace este comando automáticamente?
1. 🗄️ **Levanta SQL Server 2022** en un contenedor seguro (`ami_sqlserver`).
2. 🔄 **Crea y puebla la Base de Datos `Autos_AMI`**: Al iniciar, el backend detecta automáticamente la base de datos y ejecuta el script `Autos_AMI_Backup.sql`, cargando todas las tablas, relaciones, roles, vehículos, ventas y usuarios de prueba.
3. 🚀 **Inicia el Backend y Frontend** en el puerto `3000` (`ami_backend`).

### 4. Acceso al Sistema
Una vez que en la consola veas:
```text
[InitDB] ¡Base de datos inicializada y poblada exitosamente!
Servidor corriendo en puerto 3000
```

Abre tu navegador e ingresa a:
👉 **[http://localhost:3000/Login.html](http://localhost:3000/Login.html)**

#### 🔑 Credenciales de Acceso para Pruebas:
* **Superadministrador:** `superadmin@ami.com` / Contraseña: `123`
* **Administrador:** `admin@ami.com` / Contraseña: `123`
* **Vendedor / Estándar:** `ventas@ami.com` / Contraseña: `123`

### 5. Detener los Contenedores
Para detener el entorno cuando termines tu jornada:
```bash
docker compose down
```
*(Los datos se conservan en el volumen de Docker `mssql_data` para la siguiente vez que inicies)*.
