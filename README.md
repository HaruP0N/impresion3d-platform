# impresion3d-platform
# 🖨️ Plataforma Web de Pedidos y Cotización de Impresiones 3D

Sistema completo para gestionar cotizaciones y pedidos de impresión 3D con panel de administración integrado.

## 📋 Características Implementadas

### Módulo de Cotización (RF-01 a RF-07)
- ✅ Subida de archivos 3D (STL, OBJ) hasta 50MB
- ✅ Selección de material y color
- ✅ Especificación de cantidad
- ✅ Cálculo automático de precios
- ✅ Generación de número de referencia
- ✅ Envío de confirmación por email
- ✅ Generación de PDF de cotización

### Módulo de Administración (RF-08 a RF-13, RF-18)
- ✅ Dashboard con estadísticas
- ✅ Gestión de cotizaciones pendientes
- ✅ Conversión de cotizaciones a pedidos
- ✅ Actualización de estados de pedidos
- ✅ Gestión de materiales
- ✅ Gestión de portafolio
- ✅ Filtros por fecha

### Módulo de Seguimiento (RF-11, RF-20)
- ✅ Links únicos de seguimiento
- ✅ Visualización de estado del pedido
- ✅ Descarga de PDF de cotización

### Validaciones y Procesamiento (RF-16, RF-17, RF-19)
- ✅ Validación de formato de email
- ✅ Almacenamiento de datos de contacto
- ✅ Recargo por servicio urgente

## 🚀 Instalación

### Requisitos Previos
- Node.js 16+ instalado
- npm o yarn

### Paso 1: Crear estructura de carpetas

```bash
mkdir impresion3d-platform
cd impresion3d-platform
```

### Paso 2: Crear estructura de archivos

```
impresion3d-platform/
├── server.js           # Backend (copiar del artifact)
├── package.json        # Dependencias (copiar del artifact)
├── public/
│   ├── index.html      # Página principal
│   ├── cotizacion.html # Formulario de cotización
│   ├── admin.html      # Panel de administración
│   ├── seguimiento.html # Página de seguimiento
│   └── portfolio/      # Carpeta para imágenes del portafolio
├── uploads/            # Se crea automáticamente
├── pdfs/              # Se crea automáticamente
└── database.db        # Se crea automáticamente
```

### Paso 3: Instalar dependencias

```bash
npm install
```

### Paso 4: Configurar email (Opcional pero recomendado)

Editar `server.js` líneas 85-90:

```javascript
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'tu-email@gmail.com',     // ← Cambiar aquí
    pass: 'tu-app-password'         // ← App Password de Gmail
  }
});
```

**Para obtener App Password de Gmail:**
1. Ve a tu cuenta de Google
2. Seguridad → Verificación en 2 pasos (activar)
3. Contraseñas de aplicaciones → Generar
4. Copia el código de 16 caracteres

### Paso 5: Iniciar el servidor

```bash
npm start
```

El servidor estará disponible en: **http://localhost:3000**

## 🔑 Credenciales de Administrador

- **Usuario:** `admin`
- **Contraseña:** `admin123`

## 📁 Estructura de Archivos HTML

### Copiar los archivos HTML a la carpeta `public/`:

1. **index.html** - Usa tu archivo `home.html` existente
2. **cotizacion.html** - Usa el artifact "Cotización Funcional"
3. **admin.html** - Usa el artifact "Panel Admin Funcional"
4. **seguimiento.html** - Actualizar para conectar con backend

## 🔧 Uso del Sistema

### Para Clientes:

1. **Solicitar Cotización:**
   - Ir a http://localhost:3000/cotizacion.html
   - Subir archivo 3D (STL o OBJ)
   - Seleccionar material, color y cantidad
   - Ingresar datos de contacto
   - Recibir número de referencia

2. **Hacer Seguimiento:**
   - Usar el link único recibido por email
   - Ver estado del pedido en tiempo real

### Para Administradores:

1. **Acceder al Panel:**
   - Ir a http://localhost:3000/admin.html
   - Iniciar sesión (admin / admin123)

2. **Gestionar Cotizaciones:**
   - Ver todas las cotizaciones pendientes
   - Convertir cotizaciones aprobadas en pedidos
   - Generar link de seguimiento automáticamente

3. **Gestionar Pedidos:**
   - Actualizar estados: Confirmado → En Cola → En Impresión → Finalizado → Entregado
   - Ver detalles de cada pedido
   - Compartir links de seguimiento

4. **Gestionar Materiales:**
   - Agregar nuevos materiales
   - Definir precios por gramo
   - Especificar colores disponibles

## 📊 API Endpoints

### Públicos
- `POST /api/cotizacion` - Crear nueva cotización
- `GET /api/cotizacion/:numero/pdf` - Descargar PDF
- `GET /api/seguimiento/:link` - Obtener estado del pedido
- `GET /api/materiales` - Listar materiales disponibles
- `GET /api/portafolio` - Obtener proyectos del portafolio

### Administración (requieren autenticación)
- `POST /api/admin/login` - Iniciar sesión
- `POST /api/admin/logout` - Cerrar sesión
- `GET /api/admin/cotizaciones` - Listar cotizaciones
- `POST /api/admin/cotizacion/:id/convertir` - Convertir a pedido
- `GET /api/admin/pedidos` - Listar pedidos
- `PUT /api/admin/pedido/:id/estado` - Actualizar estado
- `POST /api/admin/materiales` - Agregar material
- `POST /api/admin/portafolio` - Agregar proyecto al portafolio

## 🗄️ Base de Datos

El sistema usa SQLite con las siguientes tablas:
- `materiales` - Catálogo de materiales disponibles
- `cotizaciones` - Solicitudes de cotización
- `pedidos` - Pedidos activos
- `historial_estados` - Historial de cambios de estado
- `portafolio` - Proyectos destacados
- `admin` - Usuarios administradores

## 🔒 Seguridad

- Contraseñas encriptadas con bcrypt
- Sesiones con express-session
- Validación de archivos (tipo y tamaño)
- Sanitización de inputs
- Links únicos no predecibles para seguimiento

## 📧 Notificaciones

El sistema envía emails automáticamente para:
- ✅ Confirmación de cotización recibida
- ✅ Número de referencia
- ✅ Detalles del pedido

## 🎨 Personalización

### Cambiar colores del tema:
Editar en los archivos HTML las variables CSS:
- `#BAFF39` - Color primario (verde lima)
- `#6E6E6E` - Color secundario (gris)
- `#667eea` - Color de acento (púrpura)

### Agregar más estados de pedido:
Editar `server.js` línea 224:
```javascript
const estadosValidos = ['confirmado', 'en_cola', 'en_impresion', 'finalizado', 'listo_retiro', 'entregado'];
```

## 🐛 Solución de Problemas

### Error: "Cannot find module"
```bash
rm -rf node_modules
npm install
```

### Error: "Port 3000 already in use"
Cambiar puerto en `server.js` línea 13:
```javascript
const PORT = 3001; // O cualquier otro puerto
```

### Los emails no se envían
- Verificar credenciales de Gmail
- Activar "Verificación en 2 pasos"
- Generar App Password específica
- Verificar conexión a internet

### La base de datos no se crea
- Verificar permisos de escritura en la carpeta
- Ejecutar: `touch database.db`

## 📈 Mejoras Futuras

- [ ] Procesamiento real de archivos 3D para calcular volumen exacto
- [ ] Integración con pasarelas de pago
- [ ] Notificaciones por WhatsApp
- [ ] Sistema de usuarios múltiples
- [ ] Reportes y estadísticas avanzadas
- [ ] Calculadora de precios en tiempo real con vista 3D

## 📝 Licencia

Este proyecto fue desarrollado para la asignatura INF-424 Ingeniería de Software I

## 👥 Equipo de Desarrollo

- Roberto Barros
- Nicolás Rojas
- Nicolás Tobar
- Leandro Torres

---

**Universidad Católica del Maule**  
**Ingeniería Civil Informática**  
**Noviembre 2025**
