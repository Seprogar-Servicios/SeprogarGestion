/**
 * Carga datos de prueba: especialidades, técnicos y tareas
 * (pendiente / en progreso / completada / cancelada).
 *
 * Uso: node scripts/seedDemoData.js
 */
require('dotenv').config({ path: '.env' });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const config = require('../src/config');
const Usuario = require('../src/models/User');
const Especialidad = require('../src/models/Especialidad');
const Tarea = require('../src/models/Tarea');
// Registrar schema para el post-save de Tarea
require('../src/models/TareaLiquidacion');

const TECH_PASSWORD = 'Tecnico123!';

const ymd = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const addDays = (base, days) => {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
};

async function upsertEspecialidad(nombre, descripcion) {
  let esp = await Especialidad.findOne({ nombre });
  if (!esp) {
    esp = await Especialidad.create({ nombre, descripcion });
    console.log(`  + Especialidad: ${nombre}`);
  } else {
    console.log(`  · Especialidad ya existe: ${nombre}`);
  }
  return esp;
}

async function upsertTecnico({ nombre, email, telefono, direccion, especialidadId }) {
  let user = await Usuario.findOne({ email });
  const hash = await bcrypt.hash(TECH_PASSWORD, 10);
  if (!user) {
    user = await Usuario.create({
      nombre,
      email,
      password: hash,
      rol: 'usuario',
      aprobado: true,
      telefono,
      direccion,
      especialidad: especialidadId,
      porcentajeTecnico: 0.7,
    });
    console.log(`  + Técnico: ${email}`);
  } else {
    user.nombre = nombre;
    user.aprobado = true;
    user.rol = 'usuario';
    user.telefono = telefono;
    user.direccion = direccion;
    user.especialidad = especialidadId;
    user.password = hash;
    await user.save();
    console.log(`  · Técnico actualizado: ${email}`);
  }
  return user;
}

async function upsertTarea(data) {
  let tarea = await Tarea.findOne({ numero: data.numero });
  if (!tarea) {
    tarea = await Tarea.create(data);
    console.log(`  + Tarea ${data.numero} [${data.estado}]`);
  } else {
    Object.assign(tarea, data);
    if (data.ubicacionMapa === null) {
      tarea.ubicacionMapa = undefined;
      tarea.markModified('ubicacionMapa');
    }
    await tarea.save();
    console.log(`  · Tarea actualizada ${data.numero} [${data.estado}]`);
  }
  return tarea;
}

async function main() {
  if (!config.mongoUri) {
    throw new Error('MONGODB_URI no configurada');
  }

  await mongoose.connect(config.mongoUri);
  console.log('✅ Conectado a MongoDB\n');

  const creador =
    (await Usuario.findOne({ rol: 'super_admin' })) ||
    (await Usuario.findOne({ rol: 'admin' }));

  if (!creador) {
    throw new Error('No hay Super Admin/Admin. Corré primero initAdmin / resetSuperAdminPassword.');
  }

  console.log('Especialidades');
  const espGas = await upsertEspecialidad('Gas', 'Instalaciones y revisiones de gas');
  const espElec = await upsertEspecialidad('Electricidad', 'Trabajos eléctricos');
  const espCalef = await upsertEspecialidad('Calefacción', 'Calderas y radiadores');

  console.log('\nTécnicos (password: Tecnico123!)');
  const tech1 = await upsertTecnico({
    nombre: 'Juan Pérez',
    email: 'juan.perez@demo.seprogar.com',
    telefono: '1144556677',
    direccion: 'Av. Santa Fe 3200, Palermo, CABA',
    especialidadId: espGas._id,
  });
  const tech2 = await upsertTecnico({
    nombre: 'María Gómez',
    email: 'maria.gomez@demo.seprogar.com',
    telefono: '1155667788',
    direccion: 'Av. Rivadavia 5200, Caballito, CABA',
    especialidadId: espElec._id,
  });
  const tech3 = await upsertTecnico({
    nombre: 'Carlos Ruiz',
    email: 'carlos.ruiz@demo.seprogar.com',
    telefono: '1166778899',
    direccion: 'Alsina 850, Lomas de Zamora, Buenos Aires',
    especialidadId: espCalef._id,
  });

  const today = new Date();
  today.setHours(12, 0, 0, 0);

  console.log('\nTareas');
  const tareasSeed = [
    {
      numero: 'DEMO-1001',
      titulo: 'Revisión de medidor de gas',
      descripcion: 'Cliente reporta olor a gas. Verificar conexiones.',
      estado: 'en progreso',
      tecnicos: [tech1._id],
      fechaEjecucion: ymd(today),
      franja_horaria: '09:00 - 12:00',
      cliente: 'Ana López',
      numeroTitular: '1199887766',
      direccion: 'Av. Córdoba 2500, CABA',
      origen: 'web',
      creadoPor: creador._id,
      ubicacionMapa: {
        lat: -34.5990,
        lng: -58.4050,
        fuente: 'direccion',
        actualizadoAt: new Date(),
      },
    },
    {
      numero: 'DEMO-1002',
      titulo: 'Cambio de tablero eléctrico',
      descripcion: 'Reemplazo de tablero monofásico.',
      estado: 'en progreso',
      tecnicos: [tech2._id],
      fechaEjecucion: ymd(today),
      franja_horaria: '14:00 - 18:00',
      cliente: 'Edificio Norte SA',
      numeroTitular: '1144332211',
      direccion: 'Av. Callao 1200, CABA',
      origen: 'web',
      creadoPor: creador._id,
      ubicacionMapa: {
        lat: -34.5975,
        lng: -58.3925,
        fuente: 'gps',
        actualizadoAt: new Date(),
      },
    },
    {
      numero: 'DEMO-1003',
      titulo: 'Mantenimiento de caldera',
      descripcion: 'Service anual de caldera mural.',
      estado: 'completada',
      tecnicos: [tech3._id],
      fechaEjecucion: ymd(addDays(today, -1)),
      franja_horaria: '10:00 - 13:00',
      cliente: 'Roberto Díaz',
      numeroTitular: '1133221100',
      direccion: 'Mitre 450, Lomas de Zamora',
      origen: 'web',
      creadoPor: creador._id,
      ubicacionMapa: null,
    },
    {
      numero: 'DEMO-1004',
      titulo: 'Instalación de termotanque',
      descripcion: 'Instalar termotanque eléctrico 80L.',
      estado: 'pendiente',
      tecnicos: [tech1._id, tech2._id],
      fechaEjecucion: ymd(addDays(today, 1)),
      franja_horaria: '09:00 - 13:00',
      cliente: 'Laura Fernández',
      numeroTitular: '1177001122',
      direccion: 'Av. Cabildo 2800, Belgrano, CABA',
      origen: 'web',
      creadoPor: creador._id,
      ubicacionMapa: null,
    },
    {
      numero: 'DEMO-1005',
      titulo: 'Prueba de estanqueidad',
      descripcion: 'Prueba reglamentaria post-obra.',
      estado: 'pendiente',
      tecnicos: [tech1._id],
      fechaEjecucion: ymd(addDays(today, 2)),
      franja_horaria: '15:00 - 18:00',
      cliente: 'Consorcio Sol',
      numeroTitular: '1155112233',
      direccion: 'Av. Corrientes 3800, Almagro, CABA',
      origen: 'web',
      creadoPor: creador._id,
      ubicacionMapa: null,
    },
    {
      numero: 'DEMO-1006',
      titulo: 'Reparación de artefacto',
      descripcion: 'Cocina no enciende. Cancelada por cliente.',
      estado: 'cancelada',
      tecnicos: [tech2._id],
      fechaEjecucion: ymd(addDays(today, -2)),
      franja_horaria: '11:00 - 14:00',
      cliente: 'Pedro Sánchez',
      numeroTitular: '1166443322',
      direccion: 'Lavalle 800, CABA',
      origen: 'web',
      creadoPor: creador._id,
      ubicacionMapa: null,
    },
    {
      numero: 'DEMO-1007',
      titulo: 'Inspección de calefacción',
      descripcion: 'Radiadores sin calor en living.',
      estado: 'en progreso',
      tecnicos: [tech3._id],
      fechaEjecucion: ymd(today),
      franja_horaria: '08:00 - 11:00',
      cliente: 'Silvia Méndez',
      numeroTitular: '1188776655',
      direccion: 'Av. Hipólito Yrigoyen 8900, Lomas de Zamora',
      origen: 'web',
      creadoPor: creador._id,
      ubicacionMapa: {
        lat: -34.7580,
        lng: -58.4020,
        fuente: 'tecnico',
        actualizadoAt: new Date(),
      },
    },
    {
      numero: 'DEMO-1008',
      titulo: 'Conexión de cocina',
      descripcion: 'Nueva conexión a red de gas.',
      estado: 'completada',
      tecnicos: [tech1._id],
      fechaEjecucion: ymd(today),
      franja_horaria: '16:00 - 19:00',
      cliente: 'Martín Acosta',
      numeroTitular: '1122334455',
      direccion: 'Scalabrini Ortiz 1500, Palermo, CABA',
      origen: 'web',
      creadoPor: creador._id,
      ubicacionMapa: null,
    },
  ];

  for (const t of tareasSeed) {
    await upsertTarea(t);
  }

  console.log('\n========== RESUMEN ==========');
  console.log('Login Super Admin: admin@futurgas.com / SuperAdmin123!');
  console.log('Login técnicos (todos): Tecnico123!');
  console.log('  - juan.perez@demo.seprogar.com');
  console.log('  - maria.gomez@demo.seprogar.com');
  console.log('  - carlos.ruiz@demo.seprogar.com');
  console.log('\nEstados de tareas DEMO:');
  console.log('  en progreso → DEMO-1001, DEMO-1002, DEMO-1007 (aparecen en Mapa en vivo)');
  console.log('  completada  → DEMO-1003, DEMO-1008');
  console.log('  pendiente   → DEMO-1004, DEMO-1005');
  console.log('  cancelada   → DEMO-1006');
  console.log('=============================\n');

  await mongoose.disconnect();
  process.exit(0);
}

main().catch(async (err) => {
  console.error('❌ Error:', err.message);
  try {
    await mongoose.disconnect();
  } catch (_) {}
  process.exit(1);
});
