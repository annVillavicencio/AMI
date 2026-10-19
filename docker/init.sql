USE [master];
GO

IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'Autos_AMI')
BEGIN
    CREATE DATABASE [Autos_AMI];
END
GO

USE [Autos_AMI];
GO

IF OBJECT_ID(N'[dbo].[Auto]', N'U') IS NOT NULL
    DROP TABLE [dbo].[Auto];
GO

CREATE TABLE [dbo].[Auto] (
    [idAuto] INT IDENTITY(1,1) NOT NULL,
    [idModelo] INT NOT NULL,
    [Anio] INT NOT NULL,
    [CostoAdquisicion] DECIMAL(10, 2) NOT NULL,
    [FechaIngresoInventario] DATE NOT NULL,
    [Estado] VARCHAR(20) NOT NULL,
    [Placa] VARCHAR(20) NOT NULL,
    [Precio] DECIMAL(18, 0) NOT NULL,
    [Descripcion] VARCHAR(50) NOT NULL,
    CONSTRAINT [PK_Auto] PRIMARY KEY CLUSTERED ([idAuto])
);
GO

IF OBJECT_ID(N'[dbo].[CampañasMarketing]', N'U') IS NOT NULL
    DROP TABLE [dbo].[CampañasMarketing];
GO

CREATE TABLE [dbo].[CampañasMarketing] (
    [idCampaña] INT IDENTITY(1,1) NOT NULL,
    [NombreCampaña] VARCHAR(100) NOT NULL,
    [PresupuestoInvertido] DECIMAL(18, 2) NOT NULL,
    [FechaInicio] DATE NOT NULL,
    [FechaFin] DATE NOT NULL,
    [EstadoCampana] VARCHAR(20) NOT NULL,
    CONSTRAINT [PK_CampañasMarketing] PRIMARY KEY CLUSTERED ([idCampaña])
);
GO

IF OBJECT_ID(N'[dbo].[Cargo]', N'U') IS NOT NULL
    DROP TABLE [dbo].[Cargo];
GO

CREATE TABLE [dbo].[Cargo] (
    [IdCargo] INT IDENTITY(1,1) NOT NULL,
    [NombreCargo] VARCHAR(100) NOT NULL,
    CONSTRAINT [PK_Cargo] PRIMARY KEY CLUSTERED ([IdCargo])
);
GO

IF OBJECT_ID(N'[dbo].[CategoriasCosto]', N'U') IS NOT NULL
    DROP TABLE [dbo].[CategoriasCosto];
GO

CREATE TABLE [dbo].[CategoriasCosto] (
    [idCategoria] INT IDENTITY(1,1) NOT NULL,
    [NombreCategoria] VARCHAR(50) NOT NULL,
    [Descripcion] VARCHAR(200) NOT NULL,
    CONSTRAINT [PK_CategoriasCosto] PRIMARY KEY CLUSTERED ([idCategoria])
);
GO

IF OBJECT_ID(N'[dbo].[Clientes]', N'U') IS NOT NULL
    DROP TABLE [dbo].[Clientes];
GO

CREATE TABLE [dbo].[Clientes] (
    [IdClientes] INT IDENTITY(1,1) NOT NULL,
    [Nombre] VARCHAR(50) NOT NULL,
    [Apellido] VARCHAR(50) NOT NULL,
    [Telefono] VARCHAR(20) NOT NULL,
    [Correo] VARCHAR(100) NOT NULL,
    [Cedula] VARCHAR(100) NOT NULL,
    [idOrigen] INT NOT NULL,
    [FechaRegistro] DATE NOT NULL,
    CONSTRAINT [PK_Clientes] PRIMARY KEY CLUSTERED ([IdClientes])
);
GO

IF OBJECT_ID(N'[dbo].[Compras]', N'U') IS NOT NULL
    DROP TABLE [dbo].[Compras];
GO

CREATE TABLE [dbo].[Compras] (
    [idCompra] INT IDENTITY(1,1) NOT NULL,
    [idProveedor] INT NOT NULL,
    [FechaCompra] DATE NOT NULL,
    [Descripcion] VARCHAR(100) NOT NULL,
    [EstadoCompra] VARCHAR(20) NOT NULL,
    [NumFactura] VARCHAR(50) NOT NULL,
    [TotalCompra] DECIMAL(18, 2) NOT NULL,
    CONSTRAINT [PK_Compras] PRIMARY KEY CLUSTERED ([idCompra])
);
GO

IF OBJECT_ID(N'[dbo].[CostosEstancamientos]', N'U') IS NOT NULL
    DROP TABLE [dbo].[CostosEstancamientos];
GO

CREATE TABLE [dbo].[CostosEstancamientos] (
    [idCostoEstan] INT IDENTITY(1,1) NOT NULL,
    [idAuto] INT NOT NULL,
    [idCategoria] INT NOT NULL,
    [FechaGasto] DATE NOT NULL,
    [Monto] DECIMAL(10, 2) NOT NULL,
    [Descripcion] VARCHAR(200) NULL,
    CONSTRAINT [PK_CostosEstancamientos] PRIMARY KEY CLUSTERED ([idCostoEstan])
);
GO

IF OBJECT_ID(N'[dbo].[Departamento]', N'U') IS NOT NULL
    DROP TABLE [dbo].[Departamento];
GO

CREATE TABLE [dbo].[Departamento] (
    [idDepartamento] INT IDENTITY(1,1) NOT NULL,
    [NombreDepartamento] VARCHAR(100) NOT NULL,
    CONSTRAINT [PK_Departamento] PRIMARY KEY CLUSTERED ([idDepartamento])
);
GO

IF OBJECT_ID(N'[dbo].[DetalleCompra]', N'U') IS NOT NULL
    DROP TABLE [dbo].[DetalleCompra];
GO

CREATE TABLE [dbo].[DetalleCompra] (
    [idDetalleCompra] INT IDENTITY(1,1) NOT NULL,
    [idCompra] INT NOT NULL,
    [idAuto] INT NOT NULL,
    CONSTRAINT [PK_DetalleCompra] PRIMARY KEY CLUSTERED ([idDetalleCompra])
);
GO

IF OBJECT_ID(N'[dbo].[DetalleVenta]', N'U') IS NOT NULL
    DROP TABLE [dbo].[DetalleVenta];
GO

CREATE TABLE [dbo].[DetalleVenta] (
    [idDetalleVen] INT IDENTITY(1,1) NOT NULL,
    [idVenta] INT NOT NULL,
    [idAuto] INT NOT NULL,
    [PrecioRealVendido] DECIMAL(10, 2) NOT NULL,
    CONSTRAINT [PK_DetalleVenta] PRIMARY KEY CLUSTERED ([idDetalleVen])
);
GO

IF OBJECT_ID(N'[dbo].[Empleado]', N'U') IS NOT NULL
    DROP TABLE [dbo].[Empleado];
GO

CREATE TABLE [dbo].[Empleado] (
    [IdEmpleado] VARCHAR(20) NOT NULL,
    [CodigoEmpleado] VARCHAR(20) NOT NULL,
    [NombreEmpleado] VARCHAR(100) NOT NULL,
    [ApellidoEmpleado] VARCHAR(100) NOT NULL,
    [IdCargo] INT NOT NULL,
    [idDepartamento] INT NOT NULL,
    [FechaIngreso] DATE NOT NULL,
    [SalarioBase] DECIMAL(12, 2) NOT NULL,
    [EstadoEmpleado] VARCHAR(20) NOT NULL,
    [Cedula] VARCHAR(50) NOT NULL,
    CONSTRAINT [PK_Empleado] PRIMARY KEY CLUSTERED ([IdEmpleado])
);
GO

IF OBJECT_ID(N'[dbo].[Iteracciones]', N'U') IS NOT NULL
    DROP TABLE [dbo].[Iteracciones];
GO

CREATE TABLE [dbo].[Iteracciones] (
    [idIteracciones] INT IDENTITY(1,1) NOT NULL,
    [IdClientes] INT NOT NULL,
    [idAuto] INT NOT NULL,
    [idCampaña] INT NOT NULL,
    [FechaIteraccion] DATE NOT NULL,
    [TipoMedio] VARCHAR(50) NOT NULL,
    [NivelInteres] VARCHAR(20) NOT NULL,
    CONSTRAINT [PK_Iteracciones] PRIMARY KEY CLUSTERED ([idIteracciones])
);
GO

IF OBJECT_ID(N'[dbo].[Marca]', N'U') IS NOT NULL
    DROP TABLE [dbo].[Marca];
GO

CREATE TABLE [dbo].[Marca] (
    [idMarca] INT IDENTITY(1,1) NOT NULL,
    [NombreMarca] VARCHAR(50) NOT NULL,
    CONSTRAINT [PK_Marca] PRIMARY KEY CLUSTERED ([idMarca])
);
GO

IF OBJECT_ID(N'[dbo].[Modelos]', N'U') IS NOT NULL
    DROP TABLE [dbo].[Modelos];
GO

CREATE TABLE [dbo].[Modelos] (
    [idModelo] INT IDENTITY(1,1) NOT NULL,
    [idMarca] INT NOT NULL,
    [NombreModelo] VARCHAR(50) NOT NULL,
    CONSTRAINT [PK_Modelos] PRIMARY KEY CLUSTERED ([idModelo])
);
GO

IF OBJECT_ID(N'[dbo].[OrigenesClientes]', N'U') IS NOT NULL
    DROP TABLE [dbo].[OrigenesClientes];
GO

CREATE TABLE [dbo].[OrigenesClientes] (
    [idOrigen] INT IDENTITY(1,1) NOT NULL,
    [NombreCanal] VARCHAR(50) NOT NULL,
    CONSTRAINT [PK_OrigenesClientes] PRIMARY KEY CLUSTERED ([idOrigen])
);
GO

IF OBJECT_ID(N'[dbo].[Permisos]', N'U') IS NOT NULL
    DROP TABLE [dbo].[Permisos];
GO

CREATE TABLE [dbo].[Permisos] (
    [idPermiso] INT IDENTITY(1,1) NOT NULL,
    [idRol] INT NOT NULL,
    [modulo] VARCHAR(50) NOT NULL,
    [puedeVer] BIT NOT NULL DEFAULT ((0)),
    [puedeAgregar] BIT NOT NULL DEFAULT ((0)),
    [puedeEditar] BIT NOT NULL DEFAULT ((0)),
    [puedeEliminar] BIT NOT NULL DEFAULT ((0)),
    CONSTRAINT [PK_Permisos] PRIMARY KEY CLUSTERED ([idPermiso])
);
GO

IF OBJECT_ID(N'[dbo].[Planilla]', N'U') IS NOT NULL
    DROP TABLE [dbo].[Planilla];
GO

CREATE TABLE [dbo].[Planilla] (
    [IdPlanilla] INT IDENTITY(1,1) NOT NULL,
    [IdEmpleado] VARCHAR(20) NOT NULL,
    [FechaInicioPeriodo] DATE NOT NULL,
    [FechaFinPeriodo] DATE NOT NULL,
    [FechaPago] DATE NULL,
    [SalarioBase] DECIMAL(12, 2) NOT NULL DEFAULT ((0)),
    [DiasTrabajados] INT NOT NULL DEFAULT ((0)),
    [HorasExtra] INT NOT NULL DEFAULT ((0)),
    [Bonificaciones] DECIMAL(18, 2) NOT NULL DEFAULT ((0)),
    [Comisiones] DECIMAL(18, 2) NOT NULL DEFAULT ((0)),
    [OtrosIngresos] DECIMAL(18, 2) NOT NULL DEFAULT ((0)),
    [SalarioBruto] DECIMAL(18, 2) NOT NULL DEFAULT ((0)),
    [INSS] DECIMAL(18, 2) NOT NULL DEFAULT ((0)),
    [IR] DECIMAL(18, 2) NOT NULL DEFAULT ((0)),
    [OtrasDeducciones] DECIMAL(18, 2) NOT NULL DEFAULT ((0)),
    [TotalIngresos] DECIMAL(18, 2) NOT NULL DEFAULT ((0)),
    [TotalDeducciones] DECIMAL(18, 2) NOT NULL DEFAULT ((0)),
    [SalarioNeto] DECIMAL(18, 2) NOT NULL DEFAULT ((0)),
    [INSSPatronal] DECIMAL(18, 2) NOT NULL DEFAULT ((0)),
    [TotalAPagar] DECIMAL(18, 2) NOT NULL DEFAULT ((0)),
    [Estado] VARCHAR(10) NOT NULL,
    CONSTRAINT [PK_Planilla] PRIMARY KEY CLUSTERED ([IdPlanilla])
);
GO

IF OBJECT_ID(N'[dbo].[Proveedores]', N'U') IS NOT NULL
    DROP TABLE [dbo].[Proveedores];
GO

CREATE TABLE [dbo].[Proveedores] (
    [idProveedor] INT IDENTITY(1,1) NOT NULL,
    [NomProveedor] VARCHAR(100) NOT NULL,
    [Telefono] VARCHAR(20) NOT NULL,
    [Direccion] VARCHAR(150) NOT NULL,
    CONSTRAINT [PK_Proveedores] PRIMARY KEY CLUSTERED ([idProveedor])
);
GO

IF OBJECT_ID(N'[dbo].[rol]', N'U') IS NOT NULL
    DROP TABLE [dbo].[rol];
GO

CREATE TABLE [dbo].[rol] (
    [idRol] INT IDENTITY(1,1) NOT NULL,
    [NombreRol] VARCHAR(50) NOT NULL,
    [Descripcion] VARCHAR(200) NOT NULL,
    CONSTRAINT [PK_rol] PRIMARY KEY CLUSTERED ([idRol])
);
GO

IF OBJECT_ID(N'[dbo].[Usuarios]', N'U') IS NOT NULL
    DROP TABLE [dbo].[Usuarios];
GO

CREATE TABLE [dbo].[Usuarios] (
    [idUsuario] INT IDENTITY(1,1) NOT NULL,
    [correo] VARCHAR(100) NOT NULL,
    [contrasena] VARCHAR(255) NOT NULL,
    [idRol] INT NOT NULL,
    [fechaCreacion] DATETIME NOT NULL DEFAULT (getdate()),
    [EstadoUser] VARCHAR(20) NOT NULL,
    [CodigoEmpleado] VARCHAR(20) NOT NULL,
    CONSTRAINT [PK_Usuarios] PRIMARY KEY CLUSTERED ([idUsuario])
);
GO

IF OBJECT_ID(N'[dbo].[Ventas]', N'U') IS NOT NULL
    DROP TABLE [dbo].[Ventas];
GO

CREATE TABLE [dbo].[Ventas] (
    [idVenta] INT IDENTITY(1,1) NOT NULL,
    [IdClientes] INT NOT NULL,
    [FechaVenta] DATE NOT NULL,
    [FormaPago] VARCHAR(20) NOT NULL,
    [TotalVenta] DECIMAL(12, 2) NOT NULL,
    [EstadoVenta] VARCHAR(20) NOT NULL,
    CONSTRAINT [PK_Ventas] PRIMARY KEY CLUSTERED ([idVenta])
);
GO

/* Data for [dbo].[Auto] (45 rows) */
SET IDENTITY_INSERT [dbo].[Auto] ON;
INSERT INTO [dbo].[Auto] ([idAuto], [idModelo], [Anio], [CostoAdquisicion], [FechaIngresoInventario], [Estado], [Placa], [Precio], [Descripcion]) VALUES
    (1, 5, 2024, 31000, '2025-02-12 00:00:00.000', N'Disponible', N'M015TY', 37000, N'Toyota Tacoma color rojo'),
    (2, 5, 2024, 31000, '2025-02-20 00:00:00.000', N'Vendido', N'M025TY', 35000, N'Toyota Tacoma color blanco'),
    (3, 5, 2024, 31000, '2025-01-12 00:00:00.000', N'Disponible', N'M035TY', 37000, N'Toyota Tacoma color negro'),
    (4, 7, 2023, 39000, '2026-02-18 00:00:00.000', N'Vendido', N'M006TY', 46000, N'Toyota Tundra pickup'),
    (5, 8, 2024, 36000, '2026-02-25 00:00:00.000', N'Disponible', N'M007TY', 43000, N'Toyota Highlander SUV'),
    (6, 10, 2023, 55000, '2026-03-02 00:00:00.000', N'Disponible', N'M008TY', 65000, N'Toyota Land Cruiser SUV'),
    (7, 13, 2024, 21000, '2026-01-12 00:00:00.000', N'Vendido', N'M009HO', 25500, N'Honda Civic sedan'),
    (8, 14, 2025, 28000, '2026-01-28 00:00:00.000', N'Disponible', N'M010HO', 33500, N'Honda CR-V SUV'),
    (9, 15, 2024, 30000, '2026-02-10 00:00:00.000', N'Disponible', N'M011HO', 36000, N'Honda Ridgeline pickup'),
    (10, 17, 2023, 23500, '2026-01-18 00:00:00.000', N'Vendido', N'M012NI', 28500, N'Nissan Frontier una cabina color rojo'),
    (11, 18, 2024, 27000, '2026-02-03 00:00:00.000', N'Disponible', N'M013NI', 32500, N'Nissan Frontier doble cabina color azul'),
    (12, 19, 2024, 15500, '2026-02-15 00:00:00.000', N'Vendido', N'M014NI', 19000, N'Nissan Versa sedan, color blanco'),
    (13, 20, 2025, 18500, '2026-03-05 00:00:00.000', N'Disponible', N'M015NI', 22500, N'Nissan Sentra sedan'),
    (14, 21, 2024, 23000, '2026-01-22 00:00:00.000', N'Disponible', N'M016HY', 28000, N'Hyundai Tucson SUV'),
    (15, 22, 2024, 17000, '2026-02-08 00:00:00.000', N'Vendido', N'M017HY', 21000, N'Hyundai Elantra sedan'),
    (16, 27, 2025, 30000, '2026-02-20 00:00:00.000', N'Disponible', N'M018HY', 36000, N'Hyundai Santa Fe SUV'),
    (17, 25, 2024, 21500, '2026-03-08 00:00:00.000', N'Disponible', N'M019HY', 26000, N'Hyundai Creta Grand'),
    (18, 28, 2024, 12500, '2026-01-25 00:00:00.000', N'Vendido', N'M020KI', 15500, N'Kia Picanto compacto'),
    (19, 30, 2024, 17500, '2026-02-22 00:00:00.000', N'Vendido', N'M022KI', 21500, N'Kia K3 sedan'),
    (20, 33, 2024, 32000, '2026-03-10 00:00:00.000', N'Disponible', N'M023KI', 38000, N'Kia Carnival familiar'),
    (21, 37, 2024, 20500, '2026-01-30 00:00:00.000', N'Disponible', N'M024CH', 25000, N'Chevrolet Tracker SUV'),
    (22, 40, 2024, 14500, '2026-02-12 00:00:00.000', N'Vendido', N'M025CH', 18000, N'Chevrolet Onix sedan'),
    (23, 44, 2023, 38000, '2026-02-28 00:00:00.000', N'Disponible', N'M026CH', 45000, N'Chevrolet Silverado pickup'),
    (24, 43, 2024, 50000, '2026-03-12 00:00:00.000', N'Disponible', N'M027CH', 59000, N'Chevrolet Tahoe SUV'),
    (25, 45, 2024, 28000, '2026-01-17 00:00:00.000', N'Vendido', N'M028FO', 34000, N'Ford Ranger pickup'),
    (26, 46, 2024, 24000, '2026-02-05 00:00:00.000', N'Disponible', N'M029FO', 29500, N'Ford Maverick pickup'),
    (27, 47, 2023, 35000, '2026-02-18 00:00:00.000', N'Disponible', N'M030FO', 42000, N'Ford F-150 pickup'),
    (28, 50, 2024, 37000, '2026-03-15 00:00:00.000', N'Vendido', N'M031FO', 44000, N'Ford Explorer SUV'),
    (29, 52, 2024, 22000, '2026-01-26 00:00:00.000', N'Disponible', N'M032JE', 27000, N'Jeep Renegade SUV'),
    (30, 53, 2024, 26000, '2025-02-09 00:00:00.000', N'Vendido', N'M033JE', 31500, N'Jeep Compass SUV'),
    (31, 54, 2023, 39000, '2025-03-01 00:00:00.000', N'Disponible', N'M034JE', 47000, N'Jeep Wrangler'),
    (32, 60, 2024, 13500, '2026-01-14 00:00:00.000', N'Vendido', N'M035SU', 17000, N'Suzuki Swift compacto'),
    (33, 61, 2024, 19000, '2026-02-11 00:00:00.000', N'Disponible', N'M036SU', 23000, N'Suzuki Jimny SUV'),
    (34, 59, 2024, 11000, '2026-01-04 00:00:00.000', N'Disponible', N'M037SU', 14000, N'Suzuki Celerio compacto'),
    (35, 67, 2024, 35000, '2025-01-31 00:00:00.000', N'Vendido', N'M038TE', 42000, N'Tesla Model 3 electrico'),
    (36, 66, 2023, 65000, '2025-02-25 00:00:00.000', N'Disponible', N'M039TE', 76000, N'Tesla Model S electrico'),
    (37, 65, 2024, 50000, '2026-01-16 00:00:00.000', N'Disponible', N'M040TE', 60000, N'Tesla Cybertruck electrico'),
    (38, 68, 2024, 33000, '2026-01-19 00:00:00.000', N'Vendido', N'M041BM', 40000, N'BMW Sedan Serie 1'),
    (39, 69, 2024, 37000, '2026-02-14 00:00:00.000', N'Disponible', N'M042BM', 44000, N'BMW Sedan Serie 2'),
    (40, 70, 2025, 39000, '2026-03-06 00:00:00.000', N'Disponible', N'M043BM', 47000, N'BMW SUV X1'),
    (41, 71, 2024, 42000, '2026-03-18 00:00:00.000', N'Vendido', N'M044BM', 50000, N'BMW SUV X2'),
    (42, 5, 2024, 31000, '2025-02-12 00:00:00.000', N'Disponible', N'M015TY', 37000, N'Toyota Tacoma color rojo'),
    (43, 5, 2024, 31000, '2025-02-12 00:00:00.000', N'Vendido', N'M015TY', 37000, N'Toyota Tacoma color rojo'),
    (44, 11, 2024, 31000, '2025-02-12 00:00:00.000', N'Vendido', N'M001TY', 31000, N'Toyota Prado color gris'),
    (45, 11, 2024, 30000, '2025-01-12 00:00:00.000', N'Disponible', N'M002TY', 35000, N'Toyota Prado color blanco');
SET IDENTITY_INSERT [dbo].[Auto] OFF;
GO

/* Data for [dbo].[CampañasMarketing] (5 rows) */
SET IDENTITY_INSERT [dbo].[CampañasMarketing] ON;
INSERT INTO [dbo].[CampañasMarketing] ([idCampaña], [NombreCampaña], [PresupuestoInvertido], [FechaInicio], [FechaFin], [EstadoCampana]) VALUES
    (1, N'Feria de Verano 2026', 2500, '2026-01-15 00:00:00.000', '2026-03-15 00:00:00.000', N'Finalizada'),
    (2, N'Liquidación Pickups y SUVs', 3200, '2026-04-01 00:00:00.000', '2026-05-31 00:00:00.000', N'Finalizada'),
    (3, N'Mes de las Madres - Estrena Auto', 1800, '2026-05-01 00:00:00.000', '2026-05-31 00:00:00.000', N'Finalizada'),
    (4, N'Gran Venta Patria 2026', 4500, '2026-08-15 00:00:00.000', '2026-09-30 00:00:00.000', N'Activa'),
    (5, N'Feria visperas navideñas', 5000, '2026-11-15 00:00:00.000', '2026-11-30 00:00:00.000', N'Programada');
SET IDENTITY_INSERT [dbo].[CampañasMarketing] OFF;
GO

/* Data for [dbo].[Cargo] (12 rows) */
SET IDENTITY_INSERT [dbo].[Cargo] ON;
INSERT INTO [dbo].[Cargo] ([IdCargo], [NombreCargo]) VALUES
    (1, N'Gerente General'),
    (2, N'Administrador'),
    (3, N'Vendedor de ventas'),
    (4, N'Asesor de ventas'),
    (5, N'Contador'),
    (6, N'Encargador de inventario'),
    (7, N'Encargado de Marketing'),
    (8, N'Mecanico'),
    (9, N'Recepcionista'),
    (10, N'Encargado de RR.HH'),
    (11, N'Encargado de crdito y financiamiento'),
    (12, N'Asesor de IT');
SET IDENTITY_INSERT [dbo].[Cargo] OFF;
GO

/* Data for [dbo].[CategoriasCosto] (6 rows) */
SET IDENTITY_INSERT [dbo].[CategoriasCosto] ON;
INSERT INTO [dbo].[CategoriasCosto] ([idCategoria], [NombreCategoria], [Descripcion]) VALUES
    (1, N'Mantenimiento', N'Costo por mantenimiento'),
    (2, N'Reparacion', N'Se reparo el aire acondicionado'),
    (3, N'Repuestos', N'Se compro un vidrio de repuesto'),
    (4, N'Seguros', N'Gasto por seguros mensuales'),
    (5, N'Almacenamiento', N'Costo almacenamiento por un mes '),
    (6, N'Otros', N'Otros costo');
SET IDENTITY_INSERT [dbo].[CategoriasCosto] OFF;
GO

/* Data for [dbo].[Clientes] (22 rows) */
SET IDENTITY_INSERT [dbo].[Clientes] ON;
INSERT INTO [dbo].[Clientes] ([IdClientes], [Nombre], [Apellido], [Telefono], [Correo], [Cedula], [idOrigen], [FechaRegistro]) VALUES
    (1, N'Carlos', N'Mejía', N'8812-3456', N'carlos.mejia@email.com', N'001-120385-0001F', 1, '2026-01-15 00:00:00.000'),
    (2, N'María', N'González', N'7721-4567', N'mgonzalez@email.com', N'281-220490-0002M', 2, '2026-02-10 00:00:00.000'),
    (3, N'Roberto', N'Pérez', N'8934-5678', N'rperez22@email.com', N'001-150888-0003K', 1, '2026-02-15 00:00:00.000'),
    (4, N'Ana', N'López', N'8845-6789', N'analopez.nic@email.com', N'401-100295-0004P', 3, '2026-03-01 00:00:00.000'),
    (5, N'Luis', N'Martínez', N'7756-7890', N'luis.mtz89@email.com', N'001-050582-0005W', 4, '2026-03-20 00:00:00.000'),
    (6, N'Carmen', N'Ríos', N'8867-8901', N'carmenrios@email.com', N'001-201193-0006T', 1, '2026-04-05 00:00:00.000'),
    (7, N'Jorge', N'Silva', N'8978-9012', N'jsilva.auto@email.com', N'001-300180-0007H', 2, '2026-04-18 00:00:00.000'),
    (8, N'Lucía', N'Mendoza', N'7889-0123', N'luciamendoza@email.com', N'281-140698-0008C', 1, '2026-05-10 00:00:00.000'),
    (9, N'Mario', N'Cruz', N'8890-1234', N'mcruz99@email.com', N'001-251275-0009R', 3, '2026-05-22 00:00:00.000'),
    (10, N'Rosa', N'Gómez', N'7901-2345', N'rosagomez.nic@email.com', N'401-080986-0010S', 4, '2026-06-05 00:00:00.000'),
    (11, N'Miguel', N'Bermúdez', N'8812-9876', N'miguel.bermudez@email.com', N'001-170792-0011Y', 1, '2026-06-15 00:00:00.000'),
    (12, N'Sofía', N'Ramírez', N'8923-8765', N'sramirez88@email.com', N'001-030391-0012U', 2, '2026-07-01 00:00:00.000'),
    (13, N'Fernando', N'Castillo', N'7734-7654', N'fcastillo@email.com', N'281-190587-0013X', 1, '2026-07-20 00:00:00.000'),
    (14, N'Gabriela', N'Flores', N'8845-6543', N'gabyflores@email.com', N'001-111195-0014D', 3, '2026-08-05 00:00:00.000'),
    (15, N'Ricardo', N'Vargas', N'8956-5432', N'rvargas.nic@email.com', N'401-220884-0015L', 2, '2026-08-12 00:00:00.000'),
    (16, N'Elena', N'Castro', N'7867-4321', N'elenacastro@email.com', N'001-160290-0016N', 1, '2026-08-18 00:00:00.000'),
    (17, N'Oscar', N'Navarro', N'8878-3210', N'oscarnavarro@email.com', N'001-270983-0017V', 4, '2026-08-25 00:00:00.000'),
    (18, N'Valeria', N'Blandón', N'8989-2109', N'vblandon@email.com', N'281-050497-0018G', 1, '2026-09-02 00:00:00.000'),
    (19, N'Pedro', N'Aguilar', N'7790-1098', N'pedro.aguilar@email.com', N'001-131089-0019B', 7, '2026-09-10 00:00:00.000'),
    (20, N'Juana', N'Salinas', N'8801-0987', N'jsalinas77@email.com', N'401-090181-0020E', 3, '2026-09-15 00:00:00.000'),
    (21, N'Ernesto', N'Mayorga', N'8912-8765', N'emayorga@email.com', N'001-301294-0021A', 1, '2026-09-16 00:00:00.000'),
    (22, N'Teresa', N'Guido', N'7823-7654', N'teresaguido@email.com', N'001-140296-0022Q', 2, '2026-09-17 00:00:00.000');
SET IDENTITY_INSERT [dbo].[Clientes] OFF;
GO

/* Data for [dbo].[Compras] (6 rows) */
SET IDENTITY_INSERT [dbo].[Compras] ON;
INSERT INTO [dbo].[Compras] ([idCompra], [idProveedor], [FechaCompra], [Descripcion], [EstadoCompra], [NumFactura], [TotalCompra]) VALUES
    (2, 2, '2025-02-12 00:00:00.000', N'Lote de 2 Toyota Tacoma (Rojo y Negro)', N'Completado', N'F-8841', 62000),
    (3, 4, '2026-02-18 00:00:00.000', N'Lote de Pickups grandes (Tundra y F-150)', N'Completado', N'F-7734', 74000),
    (4, 1, '2026-03-02 00:00:00.000', N'Adquisición de Toyota Land Cruiser', N'Completado', N'F-1025', 55000),
    (5, 6, '2026-01-10 00:00:00.000', N'Adquisición de flota (Civic, Frontier)', N'Completado', N'F-2211', 71500),
    (6, 3, '2026-01-20 00:00:00.000', N'Lote de vehículos Hyundai', N'Completado', N'F-0092', 40000),
    (7, 10, '2025-01-25 00:00:00.000', N'Pedido inicial de Tesla Model 3 y Model S', N'Completado', N'F-5521', 100000);
SET IDENTITY_INSERT [dbo].[Compras] OFF;
GO

/* Data for [dbo].[CostosEstancamientos] (12 rows) */
SET IDENTITY_INSERT [dbo].[CostosEstancamientos] ON;
INSERT INTO [dbo].[CostosEstancamientos] ([idCostoEstan], [idAuto], [idCategoria], [FechaGasto], [Monto], [Descripcion]) VALUES
    (1, 1, 1, '2025-03-15 00:00:00.000', 120, N'Cambio de aceite y revisión general de Toyota Tacoma'),
    (2, 6, 1, '2026-04-10 00:00:00.000', 250, N'Mantenimiento preventivo Land Cruiser'),
    (3, 14, 2, '2026-02-15 00:00:00.000', 450, N'Reparación del aire acondicionado (Hyundai Tucson)'),
    (4, 35, 2, '2025-03-20 00:00:00.000', 800, N'Calibración de sensores (Tesla Model 3)'),
    (5, 27, 3, '2026-03-05 00:00:00.000', 180, N'Cambio de espejo retrovisor derecho (Ford F-150)'),
    (6, 11, 3, '2026-02-28 00:00:00.000', 95, N'Filtros de cabina y aire nuevos (Nissan Frontier)'),
    (7, 4, 4, '2026-03-01 00:00:00.000', 150, N'Póliza de seguro mensual (Toyota Tundra)'),
    (8, 36, 4, '2025-03-01 00:00:00.000', 300, N'Póliza de seguro premium (Tesla Model S)'),
    (9, 1, 5, '2025-04-01 00:00:00.000', 100, N'Costo de almacenamiento en bodega central por un mes'),
    (10, 6, 5, '2026-05-01 00:00:00.000', 120, N'Costo de piso mensual en sala de exhibición'),
    (11, 7, 6, '2026-02-10 00:00:00.000', 45, N'Lavado profundo y detallado exterior (Honda Civic)'),
    (12, 24, 6, '2026-04-05 00:00:00.000', 75, N'Trámite de inspección vehicular (Chevrolet Tahoe)');
SET IDENTITY_INSERT [dbo].[CostosEstancamientos] OFF;
GO

/* Data for [dbo].[Departamento] (11 rows) */
SET IDENTITY_INSERT [dbo].[Departamento] ON;
INSERT INTO [dbo].[Departamento] ([idDepartamento], [NombreDepartamento]) VALUES
    (1, N'Ventas'),
    (2, N'Administracion'),
    (3, N'Taller'),
    (4, N'Contabilidad'),
    (5, N'Ventas'),
    (6, N'Administracion'),
    (7, N'Taller'),
    (8, N'Recursos Humanos'),
    (9, N'Marketing'),
    (10, N'IT'),
    (11, N'Contabilidad');
SET IDENTITY_INSERT [dbo].[Departamento] OFF;
GO

/* Data for [dbo].[DetalleCompra] (12 rows) */
SET IDENTITY_INSERT [dbo].[DetalleCompra] ON;
INSERT INTO [dbo].[DetalleCompra] ([idDetalleCompra], [idCompra], [idAuto]) VALUES
    (3, 2, 1),
    (4, 2, 3),
    (5, 3, 4),
    (6, 3, 27),
    (7, 4, 6),
    (8, 5, 7),
    (9, 5, 10),
    (10, 5, 11),
    (11, 6, 14),
    (12, 6, 15),
    (13, 7, 35),
    (14, 7, 36);
SET IDENTITY_INSERT [dbo].[DetalleCompra] OFF;
GO

/* Data for [dbo].[DetalleVenta] (16 rows) */
SET IDENTITY_INSERT [dbo].[DetalleVenta] ON;
INSERT INTO [dbo].[DetalleVenta] ([idDetalleVen], [idVenta], [idAuto], [PrecioRealVendido]) VALUES
    (2, 2, 2, 35000),
    (3, 3, 4, 45500),
    (4, 4, 7, 25000),
    (5, 5, 10, 28000),
    (6, 5, 12, 19000),
    (7, 6, 15, 21000),
    (8, 7, 18, 15500),
    (9, 8, 19, 21000),
    (10, 9, 22, 18000),
    (11, 10, 25, 34000),
    (12, 11, 28, 43500),
    (13, 12, 30, 31500),
    (14, 13, 32, 16800),
    (15, 14, 35, 42000),
    (16, 15, 38, 40000),
    (17, 16, 41, 50000);
SET IDENTITY_INSERT [dbo].[DetalleVenta] OFF;
GO

/* Data for [dbo].[Empleado] (21 rows) */
INSERT INTO [dbo].[Empleado] ([IdEmpleado], [CodigoEmpleado], [NombreEmpleado], [ApellidoEmpleado], [IdCargo], [idDepartamento], [FechaIngreso], [SalarioBase], [EstadoEmpleado], [Cedula]) VALUES
    (N'1', N'EMP001', N'Andrea', N'Villavicencio Rivas', 1, 2, '2022-10-10 00:00:00.000', 65000, N'Activo', N'001-060107-1025N'),
    (N'10', N'EMP010', N'Sofía', N'Navarro Pérez', 7, 5, '2023-01-16 00:00:00.000', 30000, N'Activo', N'001-160398-0010K'),
    (N'11', N'EMP011', N'Miguel', N'Torres Hernández', 8, 3, '2022-11-07 00:00:00.000', 24000, N'Activo', N'001-071190-0011L'),
    (N'12', N'EMP012', N'Fernando', N'Mendoza Ruiz', 8, 3, '2024-02-19 00:00:00.000', 23000, N'Activo', N'001-190696-0012M'),
    (N'13', N'EMP013', N'Kevin', N'López Martínez', 8, 3, '2025-01-13 00:00:00.000', 22000, N'Activo', N'001-130902-0013N'),
    (N'14', N'EMP014', N'Andrea', N'Vega Castillo', 9, 3, '2023-06-12 00:00:00.000', 27000, N'Activo', N'001-120994-0014P'),
    (N'15', N'EMP015', N'Laura', N'Morales Gómez', 10, 4, '2022-04-11 00:00:00.000', 32000, N'Activo', N'001-110286-0015Q'),
    (N'16', N'EMP016', N'Jorge', N'Cruz Navarro', 11, 2, '2023-10-02 00:00:00.000', 33000, N'Activo', N'001-021089-0016R'),
    (N'17', N'EMP017', N'Ricardo', N'Gutiérrez Silva', 12, 6, '2022-08-22 00:00:00.000', 36000, N'Activo', N'001-220184-0017S'),
    (N'18', N'EMP018', N'Valeria', N'Rivas Torres', 12, 6, '2024-03-04 00:00:00.000', 34000, N'Activo', N'001-040900-0018T'),
    (N'19', N'EMP019', N'Elena', N'Pineda Morales', 4, 1, '2025-03-17 00:00:00.000', 20000, N'Activo', N'001-170901-0019U'),
    (N'2', N'EMP002', N'Gabriel', N'Quintanilla Rivas', 2, 2, '2022-03-15 00:00:00.000', 38000, N'Activo', N'001-061106-0002B'),
    (N'20', N'EMP020', N'Oscar', N'Díaz Herrera', 8, 3, '2024-09-09 00:00:00.000', 23000, N'Inactivo', N'001-090695-0020V'),
    (N'3', N'EMP003', N'Fernando', N'Amador Morales', 3, 1, '2023-02-06 00:00:00.000', 22000, N'Activo', N'001-210406-0003C'),
    (N'4', N'EMP004', N'Ana', N'Rodríguez López', 3, 1, '2023-05-22 00:00:00.000', 22000, N'Activo', N'001-220797-0004D'),
    (N'5', N'EMP005', N'Luis', N'Hernández Torres', 4, 1, '2024-01-08 00:00:00.000', 20000, N'Activo', N'001-080699-0005E'),
    (N'6', N'EMP006', N'Gabriela', N'Castillo Morales', 4, 1, '2024-04-15 00:00:00.000', 20000, N'Activo', N'001-150900-0006F'),
    (N'66225152', N'EMP021', N'Prueba Editada', N'Automatica Editada', 1, 1, '2026-10-18 00:00:00.000', 0, N'Activo', N'001-182297-6067U'),
    (N'7', N'EMP007', N'Roberto', N'Romano Mendoza', 5, 7, '2022-07-18 00:00:00.000', 35000, N'Activo', N'001-180287-0007G'),
    (N'8', N'EMP008', N'Patricia', N'Sánchez Flores', 5, 7, '2024-08-12 00:00:00.000', 34000, N'Activo', N'001-120194-0008H'),
    (N'9', N'EMP009', N'Daniel', N'Ramírez Castro', 6, 2, '2023-09-04 00:00:00.000', 28000, N'Activo', N'001-040390-0009J');
GO

/* Data for [dbo].[Iteracciones] (15 rows) */
SET IDENTITY_INSERT [dbo].[Iteracciones] ON;
INSERT INTO [dbo].[Iteracciones] ([idIteracciones], [IdClientes], [idAuto], [idCampaña], [FechaIteraccion], [TipoMedio], [NivelInteres]) VALUES
    (1, 1, 2, 1, '2026-02-10 00:00:00.000', N'Facebook', N'Alto'),
    (2, 3, 7, 1, '2026-01-20 00:00:00.000', N'WhatsApp', N'Medio'),
    (3, 6, 18, 1, '2026-02-05 00:00:00.000', N'Visita Física', N'Alto'),
    (4, 11, 14, 1, '2026-03-01 00:00:00.000', N'Llamada', N'Bajo'),
    (5, 2, 4, 2, '2026-04-05 00:00:00.000', N'Visita Física', N'Alto'),
    (6, 8, 28, 2, '2026-05-15 00:00:00.000', N'Facebook', N'Medio'),
    (7, 9, 25, 2, '2026-05-22 00:00:00.000', N'WhatsApp', N'Alto'),
    (8, 10, 30, 2, '2026-04-20 00:00:00.000', N'Correo', N'Bajo'),
    (9, 4, 19, 3, '2026-05-05 00:00:00.000', N'Facebook', N'Alto'),
    (10, 15, 12, 3, '2026-05-18 00:00:00.000', N'Llamada', N'Medio'),
    (11, 16, 15, 3, '2026-05-25 00:00:00.000', N'WhatsApp', N'Bajo'),
    (12, 18, 32, 4, '2026-08-25 00:00:00.000', N'Visita Física', N'Alto'),
    (13, 20, 35, 4, '2026-09-10 00:00:00.000', N'WhatsApp', N'Alto'),
    (14, 22, 38, 4, '2026-09-15 00:00:00.000', N'Facebook', N'Alto'),
    (15, 19, 24, 4, '2026-09-05 00:00:00.000', N'Llamada', N'Medio');
SET IDENTITY_INSERT [dbo].[Iteracciones] OFF;
GO

/* Data for [dbo].[Marca] (13 rows) */
SET IDENTITY_INSERT [dbo].[Marca] ON;
INSERT INTO [dbo].[Marca] ([idMarca], [NombreMarca]) VALUES
    (1, N'Toyota'),
    (2, N'Chevrolet'),
    (3, N'Honda'),
    (4, N'Hyundai'),
    (5, N'Kia'),
    (6, N'Nissan'),
    (7, N'Ford'),
    (8, N'BMW'),
    (9, N'Jeep'),
    (10, N'Suzuki'),
    (11, N'Tesla'),
    (12, N'PruebaMarca'),
    (13, N'PruebaMarcaEditada');
SET IDENTITY_INSERT [dbo].[Marca] OFF;
GO

/* Data for [dbo].[Modelos] (74 rows) */
SET IDENTITY_INSERT [dbo].[Modelos] ON;
INSERT INTO [dbo].[Modelos] ([idModelo], [idMarca], [NombreModelo]) VALUES
    (1, 1, N'Corolla'),
    (2, 1, N'Hilux'),
    (3, 1, N'Yaris'),
    (4, 1, N'Yaris Cross'),
    (5, 1, N'Tacoma'),
    (6, 1, N'Yaris'),
    (7, 1, N'Tundra'),
    (8, 1, N'Highlander'),
    (9, 1, N'GR Yaris'),
    (10, 1, N'Land Cruiser'),
    (11, 1, N'Prado'),
    (12, 1, N'Corolla Cross'),
    (13, 3, N'Civic'),
    (14, 3, N'CR-V'),
    (15, 3, N'Ridgeline'),
    (16, 3, N'Suv de tres filas'),
    (17, 6, N'Frontier una cabina'),
    (18, 6, N'Frontier doble cabina'),
    (19, 6, N'Sedan Versa'),
    (20, 6, N'Sedan Sentra'),
    (21, 4, N'Tucson'),
    (22, 4, N'Elantra'),
    (23, 4, N'Van'),
    (24, 4, N'Mighty'),
    (25, 4, N'Creta Grand'),
    (26, 4, N'Venue'),
    (27, 4, N'Santa Fe'),
    (28, 5, N'Picanto'),
    (29, 5, N'Soluto'),
    (30, 5, N'K3'),
    (31, 5, N'Sonet'),
    (32, 5, N'K3 Cross'),
    (33, 5, N'Carnival'),
    (34, 5, N'K2700'),
    (35, 5, N'Tasman'),
    (36, 5, N'K3000'),
    (37, 2, N'Tracker'),
    (38, 2, N'Groove'),
    (39, 2, N'Spark EUV'),
    (40, 2, N'Onix'),
    (41, 2, N'Aveo'),
    (42, 2, N'Suburban'),
    (43, 2, N'Tahoe'),
    (44, 2, N'Silverado'),
    (45, 7, N'Ranger'),
    (46, 7, N'Maverick'),
    (47, 7, N'F-150'),
    (48, 7, N'Everest'),
    (49, 7, N'Edge'),
    (50, 7, N'Explorer');
INSERT INTO [dbo].[Modelos] ([idModelo], [idMarca], [NombreModelo]) VALUES
    (51, 9, N'Avenger'),
    (52, 9, N'Renegade'),
    (53, 9, N'Compass'),
    (54, 9, N'Wrangler'),
    (55, 9, N'Gladiator'),
    (56, 9, N'Wagonner'),
    (57, 10, N'Alto'),
    (58, 10, N'S-Presso'),
    (59, 10, N'Celerio'),
    (60, 10, N'Swift'),
    (61, 10, N'Jimny'),
    (62, 10, N'Carry'),
    (63, 10, N'EECO'),
    (64, 10, N'APV Bus'),
    (65, 11, N'Cybertuck'),
    (66, 11, N'Model S'),
    (67, 11, N'Model 3'),
    (68, 8, N'Sedan Serie 1'),
    (69, 8, N'Sedan Serie 2'),
    (70, 8, N'SUVs X1'),
    (71, 8, N'SUVs X2'),
    (72, 8, N'Gran Coupe serie 2'),
    (73, 12, N'PruebaModelo'),
    (74, 13, N'PruebaModeloEditado');
SET IDENTITY_INSERT [dbo].[Modelos] OFF;
GO

/* Data for [dbo].[OrigenesClientes] (7 rows) */
SET IDENTITY_INSERT [dbo].[OrigenesClientes] ON;
INSERT INTO [dbo].[OrigenesClientes] ([idOrigen], [NombreCanal]) VALUES
    (1, N'Instagram'),
    (2, N'TikTok'),
    (3, N'Google'),
    (4, N'Visita al local'),
    (5, N'Publicidad'),
    (6, N'Facebook'),
    (7, N'Feria o evento');
SET IDENTITY_INSERT [dbo].[OrigenesClientes] OFF;
GO

/* Data for [dbo].[Permisos] (40 rows) */
SET IDENTITY_INSERT [dbo].[Permisos] ON;
INSERT INTO [dbo].[Permisos] ([idPermiso], [idRol], [modulo], [puedeVer], [puedeAgregar], [puedeEditar], [puedeEliminar]) VALUES
    (1, 4, N'Dashboard', 1, 1, 1, 1),
    (2, 4, N'Inventario', 1, 1, 1, 1),
    (3, 4, N'Ventas', 1, 1, 1, 1),
    (4, 4, N'Compras', 1, 1, 1, 1),
    (5, 4, N'Clientes', 1, 1, 1, 1),
    (6, 4, N'Marketing', 1, 1, 1, 1),
    (7, 4, N'Costos', 1, 1, 1, 1),
    (8, 4, N'Analisis', 1, 1, 1, 1),
    (9, 4, N'Usuarios', 1, 1, 1, 1),
    (10, 4, N'Personal', 1, 1, 1, 1),
    (11, 5, N'Dashboard', 1, 0, 0, 0),
    (12, 5, N'Inventario', 1, 1, 1, 1),
    (13, 5, N'Ventas', 1, 1, 1, 1),
    (14, 5, N'Compras', 1, 1, 1, 1),
    (15, 5, N'Clientes', 1, 1, 1, 1),
    (16, 5, N'Marketing', 1, 1, 1, 1),
    (17, 5, N'Costos', 1, 1, 1, 1),
    (18, 5, N'Analisis', 1, 1, 1, 1),
    (19, 5, N'Usuarios', 0, 0, 0, 0),
    (20, 5, N'Personal', 1, 1, 1, 1),
    (21, 6, N'Dashboard', 1, 0, 0, 0),
    (22, 6, N'Inventario', 1, 0, 0, 0),
    (23, 6, N'Ventas', 1, 0, 0, 0),
    (24, 6, N'Compras', 1, 0, 0, 0),
    (25, 6, N'Clientes', 1, 0, 0, 0),
    (26, 6, N'Marketing', 1, 0, 0, 0),
    (27, 6, N'Costos', 1, 0, 0, 0),
    (28, 6, N'Analisis', 1, 0, 0, 0),
    (29, 6, N'Usuarios', 0, 0, 0, 0),
    (30, 6, N'Personal', 0, 0, 0, 0),
    (31, 7, N'Dashboard', 1, 0, 0, 0),
    (32, 7, N'Inventario', 0, 0, 0, 0),
    (33, 7, N'Ventas', 0, 0, 0, 0),
    (34, 7, N'Compras', 0, 0, 0, 0),
    (35, 7, N'Clientes', 0, 0, 0, 0),
    (36, 7, N'Marketing', 0, 0, 0, 0),
    (37, 7, N'Costos', 0, 0, 0, 0),
    (38, 7, N'Analisis', 1, 0, 0, 0),
    (39, 7, N'Usuarios', 0, 0, 0, 0),
    (40, 7, N'Personal', 0, 0, 0, 0);
SET IDENTITY_INSERT [dbo].[Permisos] OFF;
GO

/* Data for [dbo].[Planilla] (20 rows) */
SET IDENTITY_INSERT [dbo].[Planilla] ON;
INSERT INTO [dbo].[Planilla] ([IdPlanilla], [IdEmpleado], [FechaInicioPeriodo], [FechaFinPeriodo], [FechaPago], [SalarioBase], [DiasTrabajados], [HorasExtra], [Bonificaciones], [Comisiones], [OtrosIngresos], [SalarioBruto], [INSS], [IR], [OtrasDeducciones], [TotalIngresos], [TotalDeducciones], [SalarioNeto], [INSSPatronal], [TotalAPagar], [Estado]) VALUES
    (1, N'1', '2026-08-01 00:00:00.000', '2026-08-31 00:00:00.000', '2026-08-31 00:00:00.000', 65000, 31, 0, 0, 0, 0, 65000, 4550, 0, 0, 65000, 4550, 60450, 14625, 60450, N'Pagada'),
    (2, N'2', '2026-08-01 00:00:00.000', '2026-08-31 00:00:00.000', '2026-08-31 00:00:00.000', 38000, 31, 4, 1000, 0, 0, 39950, 2796.5, 1800, 500, 39950, 5096.5, 34853.5, 8988.75, 34853.5, N'Pagada'),
    (3, N'3', '2026-08-01 00:00:00.000', '2026-08-31 00:00:00.000', '2026-08-31 00:00:00.000', 22000, 31, 6, 1500, 3500, 0, 27825, 1947.75, 1200, 300, 27825, 3447.75, 24377.25, 6260.62, 24377.25, N'Pagada'),
    (4, N'4', '2026-08-01 00:00:00.000', '2026-08-31 00:00:00.000', '2026-08-31 00:00:00.000', 22000, 31, 4, 1000, 3000, 0, 26550, 1858.5, 1100, 250, 26550, 3208.5, 23341.5, 5973.75, 23341.5, N'Pagada'),
    (5, N'5', '2026-08-01 00:00:00.000', '2026-08-31 00:00:00.000', '2026-08-31 00:00:00.000', 20000, 31, 8, 1200, 2800, 0, 25000, 1750, 1000, 200, 25000, 2950, 22050, 5625, 22050, N'Pagada'),
    (6, N'6', '2026-08-01 00:00:00.000', '2026-08-31 00:00:00.000', '2026-08-31 00:00:00.000', 20000, 31, 5, 1000, 2500, 0, 24125, 1688.75, 1000, 150, 24125, 2838.75, 21286.25, 5428.12, 21286.25, N'Pagada'),
    (7, N'7', '2026-08-01 00:00:00.000', '2026-08-31 00:00:00.000', '2026-08-31 00:00:00.000', 35000, 31, 3, 1500, 0, 0, 37156.25, 2600.94, 1500, 400, 37156.25, 4500.94, 32655.31, 8360.16, 32655.31, N'Pagada'),
    (8, N'8', '2026-08-01 00:00:00.000', '2026-08-31 00:00:00.000', '2026-08-31 00:00:00.000', 34000, 31, 2, 1000, 0, 500, 35925, 2514.75, 1400, 350, 35925, 4264.75, 31660.25, 8083.12, 31660.25, N'Pagada'),
    (9, N'9', '2026-08-01 00:00:00.000', '2026-08-31 00:00:00.000', '2026-08-31 00:00:00.000', 28000, 31, 5, 1500, 0, 0, 30375, 2126.25, 1200, 300, 30375, 3626.25, 26748.75, 6834.37, 26748.75, N'Pagada'),
    (10, N'10', '2026-08-01 00:00:00.000', '2026-08-31 00:00:00.000', '2026-08-31 00:00:00.000', 30000, 31, 4, 2000, 0, 1000, 33750, 2362.5, 1500, 250, 33750, 4112.5, 29637.5, 7593.75, 29637.5, N'Pagada'),
    (11, N'11', '2026-08-01 00:00:00.000', '2026-08-31 00:00:00.000', '2026-08-31 00:00:00.000', 24000, 31, 10, 1000, 0, 0, 26500, 1855, 1200, 200, 26500, 3255, 23245, 5962.5, 23245, N'Pagada'),
    (12, N'12', '2026-08-01 00:00:00.000', '2026-08-31 00:00:00.000', '2026-08-31 00:00:00.000', 23000, 31, 6, 500, 0, 0, 24362.5, 1705.37, 1100, 150, 24362.5, 2955.37, 21407.12, 5481.56, 21407.12, N'Pagada'),
    (13, N'13', '2026-08-01 00:00:00.000', '2026-08-31 00:00:00.000', '2026-08-31 00:00:00.000', 22000, 31, 8, 800, 0, 0, 23900, 1673, 1000, 100, 23900, 2773, 21127, 5377.5, 21127, N'Pagada'),
    (14, N'14', '2026-08-01 00:00:00.000', '2026-08-31 00:00:00.000', '2026-08-31 00:00:00.000', 27000, 31, 4, 1000, 0, 500, 29175, 2042.25, 1200, 200, 29175, 3442.25, 25732.75, 6564.38, 25732.75, N'Pagada'),
    (15, N'15', '2026-08-01 00:00:00.000', '2026-08-31 00:00:00.000', '2026-08-31 00:00:00.000', 32000, 31, 3, 1500, 0, 0, 34100, 2387, 1400, 300, 34100, 4087, 30013, 7672.5, 30013, N'Pagada'),
    (16, N'16', '2026-08-01 00:00:00.000', '2026-08-31 00:00:00.000', '2026-08-31 00:00:00.000', 33000, 31, 2, 1000, 0, 0, 34412.5, 2408.88, 1400, 250, 34412.5, 4058.88, 30353.63, 7742.81, 30353.63, N'Pagada'),
    (17, N'17', '2026-08-01 00:00:00.000', '2026-08-31 00:00:00.000', '2026-08-31 00:00:00.000', 36000, 31, 4, 1200, 0, 0, 38100, 2667, 1600, 300, 38100, 4567, 33533, 8572.5, 33533, N'Pagada'),
    (18, N'18', '2026-08-01 00:00:00.000', '2026-08-31 00:00:00.000', '2026-08-31 00:00:00.000', 34000, 31, 6, 1000, 0, 0, 36275, 2539.25, 1500, 250, 36275, 4289.25, 31985.75, 8161.87, 31985.75, N'Pagada'),
    (19, N'19', '2026-08-01 00:00:00.000', '2026-08-31 00:00:00.000', '2026-08-31 00:00:00.000', 20000, 31, 5, 1000, 2500, 0, 24125, 1688.75, 1000, 200, 24125, 2888.75, 21236.25, 5428.12, 21236.25, N'Pagada'),
    (20, N'20', '2026-08-01 00:00:00.000', '2026-08-31 00:00:00.000', '2026-08-31 00:00:00.000', 23000, 31, 0, 0, 0, 0, 23000, 1610, 0, 0, 23000, 1610, 21390, 5175, 21390, N'Pagada');
SET IDENTITY_INSERT [dbo].[Planilla] OFF;
GO

/* Data for [dbo].[Proveedores] (10 rows) */
SET IDENTITY_INSERT [dbo].[Proveedores] ON;
INSERT INTO [dbo].[Proveedores] ([idProveedor], [NomProveedor], [Telefono], [Direccion]) VALUES
    (1, N'Auto Importaciones Nicaragua', N'2255-1001', N'Managua, Nicaragua'),
    (2, N'Distribuidora Toyota', N'2255-1002', N'Managua, Nicaragua'),
    (3, N'Repuestos del Norte', N'2255-1003', N'Matagalpa, Nicaragua'),
    (4, N'Importadora Centroamericana', N'2255-1004', N'Managua, Nicaragua'),
    (5, N'Autopartes del Pacífico', N'2255-1005', N'León, Nicaragua'),
    (6, N'Servicios Automotrices AMI', N'2255-1006', N'Managua, Nicaragua'),
    (7, N'Distribuidora Nacional de Vehículos', N'2255-1007', N'Masaya, Nicaragua'),
    (8, N'Importaciones del Caribe', N'2255-1008', N'Managua, Nicaragua'),
    (9, N'Proveedora Automotriz del Sur', N'2255-1009', N'Rivas, Nicaragua'),
    (10, N'Auto Nica', N'8881-5240', N'Managua, Nicaragua');
SET IDENTITY_INSERT [dbo].[Proveedores] OFF;
GO

/* Data for [dbo].[rol] (8 rows) */
SET IDENTITY_INSERT [dbo].[rol] ON;
INSERT INTO [dbo].[rol] ([idRol], [NombreRol], [Descripcion]) VALUES
    (4, N'Superadministrador', N'Responsable de administrar el correcto funcionamiento del sistema. Configurar permisos y aspectos generales del sistema.'),
    (5, N'Administrador', N'Tiene acceso a la informacion de las tablas, puede hacer CRUD'),
    (6, N'Usuario estandar', N'Solo puede ver informacion de la tabla de reportes'),
    (7, N'Usuario de revision', N'Solo puede ver la informacion de los reportes'),
    (9, N'Encargado de inventario', N'Responsable de mantener actualizada la información del negocio (productos, entradas, existencias, compras y reportes).'),
    (10, N'Vendedores', N'Gestionar el ciclo comercial de las ventas, administrar la relación con los clientes y campañas de marketing.'),
    (11, N'Encargado de la contabilidad', N'Responsable de la elaboración de estados financieros (compras, ventas, costos y pagos).'),
    (12, N'Recursos Humanos', N'Encargado de administrar la información relacionada con el personal y la nómina.');
SET IDENTITY_INSERT [dbo].[rol] OFF;
GO

/* Data for [dbo].[Usuarios] (15 rows) */
SET IDENTITY_INSERT [dbo].[Usuarios] ON;
INSERT INTO [dbo].[Usuarios] ([idUsuario], [correo], [contrasena], [idRol], [fechaCreacion], [EstadoUser], [CodigoEmpleado]) VALUES
    (6, N'Andrea.villavicencio@ami.com', N'Ami2026#001', 4, '2023-01-10 00:00:00.000', N'Activo', N'EMP001'),
    (7, N'Gabriel.quintanilla@ami.com', N'Ami2026#002', 5, '2022-05-15 00:00:00.000', N'Activo', N'EMP002'),
    (8, N'fernando.ramirez@ami.com', N'Ami2026#009', 5, '2023-09-04 00:00:00.000', N'Activo', N'EMP009'),
    (9, N'sofia.navarro@ami.com', N'Ami2026#010', 5, '2023-01-16 00:00:00.000', N'Activo', N'EMP010'),
    (10, N'jose.perez@ami.com', N'Ami2026#003', 6, '2023-02-06 00:00:00.000', N'Activo', N'EMP003'),
    (11, N'ana.rodriguez@ami.com', N'Ami2026#004', 6, '2023-05-22 00:00:00.000', N'Activo', N'EMP004'),
    (12, N'luis.hernandez@ami.com', N'Ami2026#005', 6, '2024-01-08 00:00:00.000', N'Activo', N'EMP005'),
    (13, N'gabriela.castillo@ami.com', N'Ami2026#006', 6, '2024-04-15 00:00:00.000', N'Activo', N'EMP006'),
    (14, N'patricia.sanchez@ami.com', N'Ami2026#008', 6, '2024-08-12 00:00:00.000', N'Activo', N'EMP008'),
    (15, N'miguel.torres@ami.com', N'Ami2026#011', 6, '2022-11-07 00:00:00.000', N'Activo', N'EMP011'),
    (16, N'fernando.mendoza@ami.com', N'Ami2026#012', 7, '2024-02-19 00:00:00.000', N'Activo', N'EMP012'),
    (17, N'ricardo.gutierrez@ami.com', N'Ami2026#017', 7, '2022-08-22 00:00:00.000', N'Activo', N'EMP017'),
    (18, N'valeria.rivas@ami.com', N'Ami2026#018', 7, '2024-03-04 00:00:00.000', N'Activo', N'EMP018'),
    (19, N'elena.pineda@ami.com', N'Ami2026#019', 7, '2025-03-17 00:00:00.000', N'Activo', N'EMP019'),
    (20, N'oscar.diaz@ami.com', N'Ami2026#020', 7, '2024-09-09 00:00:00.000', N'Inactivo', N'EMP020');
SET IDENTITY_INSERT [dbo].[Usuarios] OFF;
GO

/* Data for [dbo].[Ventas] (15 rows) */
SET IDENTITY_INSERT [dbo].[Ventas] ON;
INSERT INTO [dbo].[Ventas] ([idVenta], [IdClientes], [FechaVenta], [FormaPago], [TotalVenta], [EstadoVenta]) VALUES
    (2, 1, '2026-03-15 00:00:00.000', N'Transferencia', 35000, N'Finalizada'),
    (3, 2, '2026-04-10 00:00:00.000', N'Financiado', 45500, N'Finalizada'),
    (4, 3, '2026-02-05 00:00:00.000', N'Efectivo', 25000, N'Finalizada'),
    (5, 4, '2026-05-20 00:00:00.000', N'Transferencia', 47000, N'Finalizada'),
    (6, 5, '2026-03-25 00:00:00.000', N'Financiado', 21000, N'Finalizada'),
    (7, 6, '2026-02-15 00:00:00.000', N'Efectivo', 15500, N'Finalizada'),
    (8, 7, '2026-04-18 00:00:00.000', N'Transferencia', 21000, N'Finalizada'),
    (9, 8, '2026-05-10 00:00:00.000', N'Financiado', 18000, N'Finalizada'),
    (10, 10, '2026-06-05 00:00:00.000', N'Transferencia', 34000, N'Finalizada'),
    (11, 12, '2026-07-01 00:00:00.000', N'Financiado', 43500, N'Finalizada'),
    (12, 15, '2026-08-12 00:00:00.000', N'Efectivo', 31500, N'Finalizada'),
    (13, 18, '2026-09-02 00:00:00.000', N'Transferencia', 16800, N'Pendiente'),
    (14, 20, '2026-09-15 00:00:00.000', N'Financiado', 42000, N'Pendiente'),
    (15, 22, '2026-09-17 00:00:00.000', N'Transferencia', 40000, N'Finalizada'),
    (16, 9, '2026-06-20 00:00:00.000', N'Financiado', 50000, N'Finalizada');
SET IDENTITY_INSERT [dbo].[Ventas] OFF;
GO

/* Foreign Key Constraints */
ALTER TABLE [dbo].[Auto] WITH CHECK ADD CONSTRAINT [FK_Auto_Modelo] FOREIGN KEY([idModelo])
REFERENCES [dbo].[Modelos] ([idModelo]);
GO
ALTER TABLE [dbo].[Clientes] WITH CHECK ADD CONSTRAINT [FK_Clientes_OrigenesClientes] FOREIGN KEY([idOrigen])
REFERENCES [dbo].[OrigenesClientes] ([idOrigen]);
GO
ALTER TABLE [dbo].[Compras] WITH CHECK ADD CONSTRAINT [FK_Compras_Proveedores] FOREIGN KEY([idProveedor])
REFERENCES [dbo].[Proveedores] ([idProveedor]);
GO
ALTER TABLE [dbo].[CostosEstancamientos] WITH CHECK ADD CONSTRAINT [FK_CostosEstancamientos_Auto] FOREIGN KEY([idAuto])
REFERENCES [dbo].[Auto] ([idAuto]);
GO
ALTER TABLE [dbo].[CostosEstancamientos] WITH CHECK ADD CONSTRAINT [FK_CostosEstancamientos_CategoriasCosto] FOREIGN KEY([idCategoria])
REFERENCES [dbo].[CategoriasCosto] ([idCategoria]);
GO
ALTER TABLE [dbo].[DetalleCompra] WITH CHECK ADD CONSTRAINT [FK_DetalleCompra_Auto] FOREIGN KEY([idAuto])
REFERENCES [dbo].[Auto] ([idAuto]);
GO
ALTER TABLE [dbo].[DetalleCompra] WITH CHECK ADD CONSTRAINT [FK_DetalleCompra_Compras] FOREIGN KEY([idCompra])
REFERENCES [dbo].[Compras] ([idCompra]);
GO
ALTER TABLE [dbo].[DetalleVenta] WITH CHECK ADD CONSTRAINT [FK_DetalleVenta_Auto] FOREIGN KEY([idAuto])
REFERENCES [dbo].[Auto] ([idAuto]);
GO
ALTER TABLE [dbo].[DetalleVenta] WITH CHECK ADD CONSTRAINT [FK_DetalleVenta_Ventas] FOREIGN KEY([idVenta])
REFERENCES [dbo].[Ventas] ([idVenta]);
GO
ALTER TABLE [dbo].[Empleado] WITH CHECK ADD CONSTRAINT [FK_Empleado_Cargo] FOREIGN KEY([IdCargo])
REFERENCES [dbo].[Cargo] ([IdCargo]);
GO
ALTER TABLE [dbo].[Empleado] WITH CHECK ADD CONSTRAINT [FK_Empleado_Departamento] FOREIGN KEY([idDepartamento])
REFERENCES [dbo].[Departamento] ([idDepartamento]);
GO
ALTER TABLE [dbo].[Iteracciones] WITH CHECK ADD CONSTRAINT [FK_Iteracciones_Auto] FOREIGN KEY([idAuto])
REFERENCES [dbo].[Auto] ([idAuto]);
GO
ALTER TABLE [dbo].[Iteracciones] WITH CHECK ADD CONSTRAINT [FK_Iteracciones_CampañasMarketing] FOREIGN KEY([idCampaña])
REFERENCES [dbo].[CampañasMarketing] ([idCampaña]);
GO
ALTER TABLE [dbo].[Iteracciones] WITH CHECK ADD CONSTRAINT [FK_Iteracciones_Clientes] FOREIGN KEY([IdClientes])
REFERENCES [dbo].[Clientes] ([IdClientes]);
GO
ALTER TABLE [dbo].[Modelos] WITH CHECK ADD CONSTRAINT [FK_Modelos_Marca] FOREIGN KEY([idMarca])
REFERENCES [dbo].[Marca] ([idMarca]);
GO
ALTER TABLE [dbo].[Permisos] WITH CHECK ADD CONSTRAINT [FK_Permisos_rol] FOREIGN KEY([idRol])
REFERENCES [dbo].[rol] ([idRol]);
GO
ALTER TABLE [dbo].[Planilla] WITH CHECK ADD CONSTRAINT [FK_Planilla_Empleado] FOREIGN KEY([IdEmpleado])
REFERENCES [dbo].[Empleado] ([IdEmpleado]);
GO
ALTER TABLE [dbo].[Usuarios] WITH CHECK ADD CONSTRAINT [FK_Usuarios_Empleado_Codigo] FOREIGN KEY([CodigoEmpleado])
REFERENCES [dbo].[Empleado] ([CodigoEmpleado]);
GO
ALTER TABLE [dbo].[Usuarios] WITH CHECK ADD CONSTRAINT [FK_Usuarios_rol] FOREIGN KEY([idRol])
REFERENCES [dbo].[rol] ([idRol]);
GO
ALTER TABLE [dbo].[Ventas] WITH CHECK ADD CONSTRAINT [FK_Ventas_Clientes] FOREIGN KEY([IdClientes])
REFERENCES [dbo].[Clientes] ([IdClientes]);
GO

