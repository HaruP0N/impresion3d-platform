// setup.js - Script de configuración inicial
const readline = require('readline');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function setup() {
  console.log('\n╔═══════════════════════════════════════════════════╗');
  console.log('║     CONFIGURACIÓN INICIAL - IMPRESIÓN 3D PRO  ║');
  console.log('╚═══════════════════════════════════════════════════╝\n');

  // Crear carpetas necesarias
  const folders = ['uploads', 'pdfs', 'public', 'public/portfolio'];
  
  console.log(' Creando estructura de carpetas...\n');
  folders.forEach(folder => {
    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder, { recursive: true });
      console.log(`   ✓ ${folder}/`);
    }
  });

  console.log('\n Configuración de Email (opcional)');
  console.log('   Para que el sistema envíe emails automáticos, necesitas:');
  console.log('   - Una cuenta de Gmail');
  console.log('   - App Password generado (no tu contraseña normal)\n');

  const configEmail = await question('¿Deseas configurar el email ahora? (s/n): ');

  let emailConfig = {
    service: 'gmail',
    user: 'tu-email@gmail.com',
    pass: 'tu-app-password'
  };

  if (configEmail.toLowerCase() === 's') {
    emailConfig.user = await question('Ingresa tu email de Gmail: ');
    emailConfig.pass = await question('Ingresa tu App Password: ');
    
    console.log('\n✓ Configuración de email guardada');
  } else {
    console.log('\n  Podrás configurar el email después editando server.js');
  }

  // Guardar configuración en archivo
  const envContent = `
# Configuración del Servidor
PORT=3000

# Configuración de Email
EMAIL_SERVICE=${emailConfig.service}
EMAIL_USER=${emailConfig.user}
EMAIL_PASS=${emailConfig.pass}

# Nombre del Negocio
BUSINESS_NAME=Impresión 3D Pro
BUSINESS_EMAIL=contacto@impresion3dpro.cl
BUSINESS_PHONE=+56 9 1234 5678
BUSINESS_ADDRESS=Talca, Región del Maule
`;

  fs.writeFileSync('.env', envContent.trim());
  console.log('✓ Archivo .env creado\n');

  // Verificar archivos HTML
  console.log(' Verificando archivos HTML...\n');
  const htmlFiles = [
    'public/index.html',
    'public/cotizacion.html',
    'public/admin.html',
    'public/seguimiento.html'
  ];

  const missingFiles = htmlFiles.filter(file => !fs.existsSync(file));

  if (missingFiles.length > 0) {
    console.log('  Faltan los siguientes archivos HTML:');
    missingFiles.forEach(file => console.log(`   - ${file}`));
    console.log('\n   Por favor, copia los archivos HTML a la carpeta public/');
  } else {
    console.log('✓ Todos los archivos HTML están presentes\n');
  }

  // Crear archivo de inicio rápido
  const startScript = `
#!/bin/bash
echo "  Iniciando Plataforma de Impresión 3D..."
node server.js
`;

  fs.writeFileSync('start.sh', startScript.trim());
  if (process.platform !== 'win32') {
    fs.chmodSync('start.sh', '755');
  }

  console.log('\n╔═══════════════════════════════════════════════════╗');
  console.log('║               CONFIGURACIÓN COMPLETA           ║');
  console.log('╚═══════════════════════════════════════════════════╝\n');

  console.log(' Próximos pasos:\n');
  console.log('   1. Instalar dependencias:');
  console.log('      npm install\n');
  console.log('   2. Copiar tus archivos HTML a public/ (si aún no lo has hecho)\n');
  console.log('   3. Iniciar el servidor:');
  console.log('      npm start\n');
  console.log('   4. Abrir en el navegador:');
  console.log('      http://localhost:3000\n');
  
  console.log(' Credenciales de administrador:');
  console.log('   Usuario: admin');
  console.log('   Contraseña: admin123\n');

  console.log(' Consejos:');
  console.log('   - Para cambiar el puerto: edita PORT en .env');
  console.log('   - Para obtener App Password de Gmail:');
  console.log('     1. Ve a myaccount.google.com');
  console.log('     2. Seguridad → Verificación en 2 pasos');
  console.log('     3. Contraseñas de aplicaciones → Generar\n');

  rl.close();
}

setup().catch(error => {
  console.error('Error durante la configuración:', error);
  rl.close();
  process.exit(1);
});