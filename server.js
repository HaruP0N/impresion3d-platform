// server.js - Backend completo para Plataforma de Impresión 3D
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const session = require('express-session');
const PDFDocument = require('pdfkit');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(session({
  secret: 'impresion3d-secret-key-2025',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

// Crear carpetas necesarias
const dirs = ['uploads', 'pdfs', 'public'];
dirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configuración de Multer para subida de archivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueName + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.stl' || ext === '.obj') {
      cb(null, true);
    } else {
      cb(new Error('Solo se aceptan archivos STL y OBJ'));
    }
  }
});

// Base de datos SQLite
const db = new sqlite3.Database('./database.db', (err) => {
  if (err) console.error('Error al conectar BD:', err);
  else console.log('✓ Base de datos conectada');
});

// Crear tablas
db.serialize(() => {
  // Tabla de materiales
  db.run(`CREATE TABLE IF NOT EXISTS materiales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    precio_gramo REAL NOT NULL,
    colores TEXT NOT NULL
  )`);

  // Tabla de cotizaciones
  db.run(`CREATE TABLE IF NOT EXISTS cotizaciones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    numero_referencia TEXT UNIQUE NOT NULL,
    nombre_cliente TEXT NOT NULL,
    email_cliente TEXT NOT NULL,
    telefono_cliente TEXT,
    archivo_nombre TEXT NOT NULL,
    archivo_path TEXT NOT NULL,
    material TEXT NOT NULL,
    color TEXT NOT NULL,
    cantidad INTEGER NOT NULL,
    urgente BOOLEAN DEFAULT 0,
    comentarios TEXT,
    precio_total REAL NOT NULL,
    estado TEXT DEFAULT 'pendiente',
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Tabla de pedidos
  db.run(`CREATE TABLE IF NOT EXISTS pedidos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    numero_pedido TEXT UNIQUE NOT NULL,
    cotizacion_id INTEGER NOT NULL,
    estado TEXT DEFAULT 'confirmado',
    fecha_entrega_estimada DATE,
    link_seguimiento TEXT UNIQUE NOT NULL,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cotizacion_id) REFERENCES cotizaciones(id)
  )`);

  // Tabla de historial de estados
  db.run(`CREATE TABLE IF NOT EXISTS historial_estados (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pedido_id INTEGER NOT NULL,
    estado TEXT NOT NULL,
    descripcion TEXT,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pedido_id) REFERENCES pedidos(id)
  )`);

  // Tabla de portafolio
  db.run(`CREATE TABLE IF NOT EXISTS portafolio (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    titulo TEXT NOT NULL,
    descripcion TEXT,
    imagen_path TEXT NOT NULL,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Tabla de admin
  db.run(`CREATE TABLE IF NOT EXISTS admin (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL
  )`);

  // Insertar materiales por defecto
  db.get("SELECT COUNT(*) as count FROM materiales", (err, row) => {
    if (row.count === 0) {
      const materiales = [
        { nombre: 'PLA', precio: 1500, colores: 'Blanco,Negro,Rojo,Azul,Verde,Amarillo' },
        { nombre: 'ABS', precio: 2000, colores: 'Negro,Blanco,Gris' },
        { nombre: 'PETG', precio: 2500, colores: 'Transparente,Negro,Azul' }
      ];
      
      materiales.forEach(mat => {
        db.run("INSERT INTO materiales (nombre, precio_gramo, colores) VALUES (?, ?, ?)",
          [mat.nombre, mat.precio, mat.colores]);
      });
      console.log('✓ Materiales por defecto insertados');
    }
  });

  // Crear usuario admin por defecto (usuario: admin, password: admin123)
  db.get("SELECT COUNT(*) as count FROM admin", async (err, row) => {
    if (row.count === 0) {
      const hash = await bcrypt.hash('admin123', 10);
      db.run("INSERT INTO admin (usuario, password_hash) VALUES (?, ?)", ['admin', hash]);
      console.log('✓ Usuario admin creado (usuario: admin, password: admin123)');
    }
  });
});

// Configurar transporte de email (usar Gmail o servicio SMTP)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'tu-email@gmail.com', // Configurar
    pass: 'tu-password-app' // Usar App Password de Gmail
  }
});

// ============ FUNCIONES AUXILIARES ============

function generarNumeroReferencia() {
  const fecha = new Date();
  const año = fecha.getFullYear();
  const numero = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `COT-${año}-${numero}`;
}

function generarNumeroPedido() {
  const fecha = new Date();
  const año = fecha.getFullYear();
  const numero = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `PED-${año}-${numero}`;
}

function generarLinkSeguimiento() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function calcularPrecio(material, cantidad, urgente) {
  const precios = { 'pla': 1500, 'abs': 2000, 'petg': 2500 };
  const volumenEstimado = 50; // gramos estimados por defecto
  const precioBase = precios[material.toLowerCase()] * volumenEstimado * cantidad;
  const recargo = urgente ? precioBase * 0.3 : 0;
  return Math.round(precioBase + recargo);
}

async function enviarEmailCotizacion(cotizacion) {
  const mailOptions = {
    from: 'ImpresiónPro <tu-email@gmail.com>',
    to: cotizacion.email_cliente,
    subject: `Cotización ${cotizacion.numero_referencia}`,
    html: `
      <h2>¡Gracias por tu solicitud!</h2>
      <p>Hola ${cotizacion.nombre_cliente},</p>
      <p>Tu cotización ha sido procesada exitosamente.</p>
      <h3>Detalles:</h3>
      <ul>
        <li>Número de referencia: <strong>${cotizacion.numero_referencia}</strong></li>
        <li>Material: ${cotizacion.material}</li>
        <li>Color: ${cotizacion.color}</li>
        <li>Cantidad: ${cotizacion.cantidad} unidad(es)</li>
        <li>Precio total: $${cotizacion.precio_total.toLocaleString('es-CL')} CLP</li>
      </ul>
      <p>Nos pondremos en contacto contigo pronto para confirmar tu pedido.</p>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('✓ Email enviado a:', cotizacion.email_cliente);
  } catch (error) {
    console.error('Error al enviar email:', error.message);
  }
}

function generarPDF(cotizacion, callback) {
  const doc = new PDFDocument();
  const filename = `cotizacion-${cotizacion.numero_referencia}.pdf`;
  const filepath = path.join('pdfs', filename);

  doc.pipe(fs.createWriteStream(filepath));

  doc.fontSize(20).text('COTIZACIÓN', { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).text(`Número: ${cotizacion.numero_referencia}`);
  doc.text(`Fecha: ${new Date().toLocaleDateString('es-CL')}`);
  doc.moveDown();
  doc.text(`Cliente: ${cotizacion.nombre_cliente}`);
  doc.text(`Email: ${cotizacion.email_cliente}`);
  doc.moveDown();
  doc.text('DETALLES DEL PEDIDO:', { underline: true });
  doc.text(`Material: ${cotizacion.material}`);
  doc.text(`Color: ${cotizacion.color}`);
  doc.text(`Cantidad: ${cotizacion.cantidad} unidad(es)`);
  doc.text(`Servicio urgente: ${cotizacion.urgente ? 'Sí' : 'No'}`);
  doc.moveDown();
  doc.fontSize(16).text(`TOTAL: $${cotizacion.precio_total.toLocaleString('es-CL')} CLP`, { bold: true });

  doc.end();
  doc.on('finish', () => callback(filepath));
}

// Middleware de autenticación
function requireAuth(req, res, next) {
  if (req.session && req.session.adminLoggedIn) {
    next();
  } else {
    res.status(401).json({ error: 'No autorizado' });
  }
}

// ============ RUTAS API ============

// RF-01 a RF-07: Módulo de Cotización
app.post('/api/cotizacion', upload.single('archivo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Archivo 3D requerido' });
    }

    const { nombre, email, telefono, material, color, cantidad, urgente, comentarios } = req.body;

    // Validación RF-16: formato email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Email inválido' });
    }

    // RF-05: Calcular precio automáticamente
    const precioTotal = calcularPrecio(material, parseInt(cantidad), urgente === 'true');

    const numeroRef = generarNumeroReferencia();

    // RF-17: Almacenar datos de contacto
    const query = `INSERT INTO cotizaciones 
      (numero_referencia, nombre_cliente, email_cliente, telefono_cliente, 
       archivo_nombre, archivo_path, material, color, cantidad, urgente, 
       comentarios, precio_total) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    db.run(query, [
      numeroRef, nombre, email, telefono || null,
      req.file.originalname, req.file.path, material, color,
      parseInt(cantidad), urgente === 'true' ? 1 : 0,
      comentarios || null, precioTotal
    ], async function(err) {
      if (err) {
        console.error('Error BD:', err);
        return res.status(500).json({ error: 'Error al procesar cotización' });
      }

      const cotizacionId = this.lastID;

      // Obtener cotización completa
      db.get("SELECT * FROM cotizaciones WHERE id = ?", [cotizacionId], async (err, cotizacion) => {
        if (err || !cotizacion) {
          return res.status(500).json({ error: 'Error al recuperar cotización' });
        }

        // RF-07: Enviar confirmación por email
        await enviarEmailCotizacion(cotizacion);

        // RF-06: Mostrar precio total
        res.json({
          success: true,
          numeroReferencia: numeroRef,
          precioTotal: precioTotal,
          mensaje: 'Cotización creada exitosamente'
        });
      });
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// RF-20: Generar PDF de cotización
app.get('/api/cotizacion/:numero/pdf', (req, res) => {
  const numero = req.params.numero;

  db.get("SELECT * FROM cotizaciones WHERE numero_referencia = ?", [numero], (err, cotizacion) => {
    if (err || !cotizacion) {
      return res.status(404).json({ error: 'Cotización no encontrada' });
    }

    generarPDF(cotizacion, (filepath) => {
      res.download(filepath);
    });
  });
});

// RF-08: Obtener todas las cotizaciones pendientes (Admin)
app.get('/api/admin/cotizaciones', requireAuth, (req, res) => {
  const estado = req.query.estado || 'pendiente';
  
  db.all("SELECT * FROM cotizaciones WHERE estado = ? ORDER BY fecha_creacion DESC", 
    [estado], (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Error al consultar cotizaciones' });
      }
      res.json(rows);
    });
});

// RF-09: Convertir cotización a pedido (Admin)
app.post('/api/admin/cotizacion/:id/convertir', requireAuth, (req, res) => {
  const cotizacionId = req.params.id;

  db.get("SELECT * FROM cotizaciones WHERE id = ?", [cotizacionId], (err, cotizacion) => {
    if (err || !cotizacion) {
      return res.status(404).json({ error: 'Cotización no encontrada' });
    }

    const numeroPedido = generarNumeroPedido();
    const linkSeguimiento = generarLinkSeguimiento();
    const fechaEntrega = new Date();
    fechaEntrega.setDate(fechaEntrega.getDate() + 7); // 7 días después

    db.run(`INSERT INTO pedidos (numero_pedido, cotizacion_id, estado, fecha_entrega_estimada, link_seguimiento)
            VALUES (?, ?, ?, ?, ?)`,
      [numeroPedido, cotizacionId, 'confirmado', fechaEntrega.toISOString().split('T')[0], linkSeguimiento],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Error al crear pedido' });
        }

        const pedidoId = this.lastID;

        // Registrar estado inicial
        db.run("INSERT INTO historial_estados (pedido_id, estado, descripcion) VALUES (?, ?, ?)",
          [pedidoId, 'confirmado', 'Pedido confirmado y en proceso']);

        // Actualizar estado de cotización
        db.run("UPDATE cotizaciones SET estado = 'aceptada' WHERE id = ?", [cotizacionId]);

        res.json({
          success: true,
          numeroPedido: numeroPedido,
          linkSeguimiento: `/seguimiento/${linkSeguimiento}`
        });
      });
  });
});

// RF-10: Modificar estado del pedido (Admin)
app.put('/api/admin/pedido/:id/estado', requireAuth, (req, res) => {
  const pedidoId = req.params.id;
  const { estado, descripcion } = req.body;

  const estadosValidos = ['confirmado', 'en_cola', 'en_impresion', 'finalizado', 'listo_retiro', 'entregado'];
  
  if (!estadosValidos.includes(estado)) {
    return res.status(400).json({ error: 'Estado inválido' });
  }

  db.run("UPDATE pedidos SET estado = ?, fecha_actualizacion = CURRENT_TIMESTAMP WHERE id = ?",
    [estado, pedidoId], (err) => {
      if (err) {
        return res.status(500).json({ error: 'Error al actualizar estado' });
      }

      // Registrar en historial
      db.run("INSERT INTO historial_estados (pedido_id, estado, descripcion) VALUES (?, ?, ?)",
        [pedidoId, estado, descripcion || '']);

      res.json({ success: true, mensaje: 'Estado actualizado' });
    });
});

// RF-11: Página de seguimiento por link único
app.get('/api/seguimiento/:link', (req, res) => {
  const link = req.params.link;

  db.get(`SELECT p.*, c.* FROM pedidos p 
          JOIN cotizaciones c ON p.cotizacion_id = c.id 
          WHERE p.link_seguimiento = ?`, [link], (err, pedido) => {
    if (err || !pedido) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    db.all("SELECT * FROM historial_estados WHERE pedido_id = ? ORDER BY fecha ASC",
      [pedido.id], (err, historial) => {
        res.json({
          pedido: pedido,
          historial: historial || []
        });
      });
  });
});

// RF-12: Registrar nuevo material (Admin)
app.post('/api/admin/materiales', requireAuth, (req, res) => {
  const { nombre, precio_gramo, colores } = req.body;

  db.run("INSERT INTO materiales (nombre, precio_gramo, colores) VALUES (?, ?, ?)",
    [nombre, parseFloat(precio_gramo), colores], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Error al agregar material' });
      }
      res.json({ success: true, id: this.lastID });
    });
});

// Obtener materiales
app.get('/api/materiales', (req, res) => {
  db.all("SELECT * FROM materiales", (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Error al consultar materiales' });
    }
    res.json(rows);
  });
});

// RF-13: Subir imagen al portafolio (Admin)
const uploadPortfolio = multer({
  storage: multer.diskStorage({
    destination: 'public/portfolio/',
    filename: (req, file, cb) => {
      cb(null, Date.now() + path.extname(file.originalname));
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.jpg' || ext === '.jpeg' || ext === '.png') {
      cb(null, true);
    } else {
      cb(new Error('Solo imágenes JPG/PNG'));
    }
  }
});

app.post('/api/admin/portafolio', requireAuth, uploadPortfolio.single('imagen'), (req, res) => {
  const { titulo, descripcion } = req.body;

  if (!req.file) {
    return res.status(400).json({ error: 'Imagen requerida' });
  }

  db.run("INSERT INTO portafolio (titulo, descripcion, imagen_path) VALUES (?, ?, ?)",
    [titulo, descripcion, `/portfolio/${req.file.filename}`], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Error al agregar al portafolio' });
      }
      res.json({ success: true, id: this.lastID });
    });
});

// RF-14: Obtener portafolio (público)
app.get('/api/portafolio', (req, res) => {
  db.all("SELECT * FROM portafolio ORDER BY fecha_creacion DESC", (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Error al consultar portafolio' });
    }
    res.json(rows);
  });
});

// RF-18: Filtrar pedidos por fecha (Admin)
app.get('/api/admin/pedidos', requireAuth, (req, res) => {
  const { fecha_inicio, fecha_fin, estado } = req.query;
  
  let query = "SELECT p.*, c.nombre_cliente, c.email_cliente FROM pedidos p JOIN cotizaciones c ON p.cotizacion_id = c.id WHERE 1=1";
  let params = [];

  if (fecha_inicio && fecha_fin) {
    query += " AND p.fecha_entrega_estimada BETWEEN ? AND ?";
    params.push(fecha_inicio, fecha_fin);
  }

  if (estado) {
    query += " AND p.estado = ?";
    params.push(estado);
  }

  query += " ORDER BY p.fecha_entrega_estimada ASC";

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Error al consultar pedidos' });
    }
    res.json(rows);
  });
});

// Login Admin
app.post('/api/admin/login', async (req, res) => {
  const { usuario, password } = req.body;

  db.get("SELECT * FROM admin WHERE usuario = ?", [usuario], async (err, admin) => {
    if (err || !admin) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const match = await bcrypt.compare(password, admin.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    req.session.adminLoggedIn = true;
    req.session.adminId = admin.id;
    res.json({ success: true, mensaje: 'Login exitoso' });
  });
});

// Logout Admin
app.post('/api/admin/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// Verificar sesión
app.get('/api/admin/check-session', (req, res) => {
  res.json({ loggedIn: !!req.session.adminLoggedIn });
});

// ============ SERVIDOR ============

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════╗
║     SERVIDOR IMPRESIÓN 3D PRO - INICIADO      ║
╠═══════════════════════════════════════════════════╣
║   Puerto: ${PORT}                                    ║
║   URL: http://localhost:${PORT}                      ║
║                                                   ║
║   Credenciales Admin:                             ║
║   Usuario: admin                                  ║
║   Password: admin123                              ║
╚═══════════════════════════════════════════════════╝
  `);
});