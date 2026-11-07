/**
 * Seed de datos ficticios SOLO para desarrollo / QA local.
 *
 * Cubre: especialidades, técnicos (localidad + geo), tareas (cuentas IKE/VAITTY/…),
 * mapa en vivo, ruta del día, liquidaciones, reclamos/calidad, consorcio.
 *
 * Uso:
 *   npm run seed:demo
 *   node scripts/seedDemoData.js
 *
 * Seguridad: aborta si NODE_ENV=production salvo ALLOW_DEMO_SEED=true
 */
require('dotenv').config({ path: '.env' });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const config = require('../src/config');
const Usuario = require('../src/models/User');
const Especialidad = require('../src/models/Especialidad');
const Tarea = require('../src/models/Tarea');
const TareaLiquidacion = require('../src/models/TareaLiquidacion');
const Reclamo = require('../src/models/Reclamo');
const TareaConsorcio = require('../src/models/TareaConsorcio');

const TECH_PASSWORD = 'Tecnico123!';
const ADMIN_CONSORCIO_PASSWORD = 'Consorcio123!';

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
    console.log(`  · Especialidad: ${nombre}`);
  }
  return esp;
}

async function upsertTecnico(data) {
  const {
    nombre,
    email,
    telefono,
    localidad,
    ubicacionBase,
    especialidadId,
    porcentajeTecnico = 0.7,
  } = data;

  let user = await Usuario.findOne({ email });
  const hash = await bcrypt.hash(TECH_PASSWORD, 10);
  const payload = {
    nombre,
    email,
    password: hash,
    rol: 'usuario',
    aprobado: true,
    telefono,
    localidad: localidad || '',
    direccion: localidad || '',
    ubicacionBase: ubicacionBase || null,
    especialidad: especialidadId,
    porcentajeTecnico,
  };

  if (!user) {
    user = await Usuario.create(payload);
    console.log(`  + Técnico: ${email} (${localidad})`);
  } else {
    Object.assign(user, payload);
    await user.save();
    console.log(`  · Técnico actualizado: ${email}`);
  }
  return user;
}

async function upsertAdminConsorcio() {
  const email = 'admin.consorcio@demo.seprogar.com';
  let user = await Usuario.findOne({ email });
  const hash = await bcrypt.hash(ADMIN_CONSORCIO_PASSWORD, 10);
  if (!user) {
    user = await Usuario.create({
      nombre: 'Admin Consorcio Demo',
      email,
      password: hash,
      rol: 'adminConsorcio',
      aprobado: true,
      telefono: '1144001122',
    });
    console.log(`  + Admin Consorcio: ${email}`);
  } else {
    user.password = hash;
    user.aprobado = true;
    user.rol = 'adminConsorcio';
    await user.save();
    console.log(`  · Admin Consorcio actualizado: ${email}`);
  }
  return user;
}

async function upsertTarea(data) {
  let tarea = await Tarea.findOne({ numero: data.numero });
  if (!tarea) {
    tarea = await Tarea.create(data);
    console.log(`  + Tarea ${data.numero} [${data.estado}] ${data.cuentaCliente || ''}`);
  } else {
    Object.assign(tarea, data);
    if (data.ubicacionMapa === null) {
      tarea.ubicacionMapa = undefined;
      tarea.markModified('ubicacionMapa');
    }
    await tarea.save();
    console.log(`  · Tarea ${data.numero} [${data.estado}]`);
  }
  return tarea;
}

async function upsertLiquidacion(tareaId, fields) {
  let liq = await TareaLiquidacion.findOne({ tarea: tareaId });
  if (!liq) {
    liq = await TareaLiquidacion.create({ tarea: tareaId, ...fields });
  } else {
    Object.assign(liq, fields);
    await liq.save();
  }
  return liq;
}

async function upsertReclamo(key, data) {
  // Idempotencia por descripción prefijada DEMO
  const marker = `[DEMO:${key}]`;
  let rec = await Reclamo.findOne({ descripcion: { $regex: marker.replace(/[[\]]/g, '\\$&') } });
  const payload = {
    ...data,
    descripcion: `${marker} ${data.descripcion || ''}`.trim(),
  };
  if (!rec) {
    rec = await Reclamo.create(payload);
    console.log(`  + Reclamo ${key} [${payload.estado}]`);
  } else {
    Object.assign(rec, payload);
    await rec.save();
    console.log(`  · Reclamo ${key}`);
  }
  return rec;
}

async function upsertConsorcio(data) {
  let t = await TareaConsorcio.findOne({ numero: data.numero });
  if (!t) {
    t = await TareaConsorcio.create(data);
    console.log(`  + Consorcio ${data.numero} [${data.estado}]`);
  } else {
    Object.assign(t, data);
    await t.save();
    console.log(`  · Consorcio ${data.numero}`);
  }
  return t;
}

async function main() {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEMO_SEED !== 'true') {
    throw new Error(
      'Seed demo bloqueado en production. Usá ALLOW_DEMO_SEED=true solo si estás seguro.'
    );
  }

  if (!config.mongoUri) {
    throw new Error('MONGODB_URI no configurada');
  }

  await mongoose.connect(config.mongoUri);
  console.log('✅ Conectado a MongoDB (seed DEMO)\n');

  const creador =
    (await Usuario.findOne({ rol: 'super_admin' })) ||
    (await Usuario.findOne({ rol: 'admin' }));

  if (!creador) {
    throw new Error('No hay Super Admin/Admin. Corré primero: node scripts/initAdmin.js');
  }

  // --- Especialidades (alineadas al informe) ---
  console.log('Especialidades');
  const espGas = await upsertEspecialidad('Gas / Plomería', 'Gas y plomería (especialidad unificada)');
  const espRefri = await upsertEspecialidad('Refrigeración', 'Aire acondicionado y frío');
  const espCerra = await upsertEspecialidad('Cerrajería', 'Cerraduras y accesos');
  const espElec = await upsertEspecialidad('Electricidad', 'Trabajos eléctricos');

  // --- Técnicos con localidad + punto base ---
  console.log('\nTécnicos (password: Tecnico123!)');
  const techs = {
    joaquin: await upsertTecnico({
      nombre: 'Joaquín Moya',
      email: 'joaquin.moya@demo.seprogar.com',
      telefono: '1111000001',
      localidad: 'Palermo, CABA',
      ubicacionBase: { lat: -34.5875, lng: -58.4205, actualizadoAt: new Date() },
      especialidadId: espGas._id,
    }),
    pablo: await upsertTecnico({
      nombre: 'Pablo Ceccato',
      email: 'pablo.ceccato@demo.seprogar.com',
      telefono: '1111000002',
      localidad: 'Caballito, CABA',
      ubicacionBase: { lat: -34.6195, lng: -58.4410, actualizadoAt: new Date() },
      especialidadId: espGas._id,
    }),
    nahuel: await upsertTecnico({
      nombre: 'Nahuel Konz',
      email: 'nahuel.konz@demo.seprogar.com',
      telefono: '1111000003',
      localidad: 'Lomas de Zamora',
      ubicacionBase: { lat: -34.7580, lng: -58.4020, actualizadoAt: new Date() },
      especialidadId: espRefri._id,
    }),
    hernan: await upsertTecnico({
      nombre: 'Hernán Torres',
      email: 'hernan.torres@demo.seprogar.com',
      telefono: '1111000004',
      localidad: 'Quilmes',
      ubicacionBase: { lat: -34.7205, lng: -58.2545, actualizadoAt: new Date() },
      especialidadId: espGas._id,
    }),
    lautaro: await upsertTecnico({
      nombre: 'Lautaro Demo',
      email: 'lautaro@demo.seprogar.com',
      telefono: '1111000005',
      localidad: 'La Plata',
      ubicacionBase: { lat: -34.9214, lng: -57.9544, actualizadoAt: new Date() },
      especialidadId: espElec._id,
      porcentajeTecnico: 0.65,
    }),
    maria: await upsertTecnico({
      nombre: 'María Gómez',
      email: 'maria.gomez@demo.seprogar.com',
      telefono: '1111000006',
      localidad: 'Belgrano, CABA',
      ubicacionBase: { lat: -34.5627, lng: -58.4584, actualizadoAt: new Date() },
      especialidadId: espCerra._id,
    }),
  };

  console.log('\nAdmin Consorcio');
  const adminConsorcio = await upsertAdminConsorcio();

  const today = new Date();
  today.setHours(12, 0, 0, 0);

  // Puntos CABA / GBA para mapa y ruta
  const pts = {
    cordoba: { lat: -34.599, lng: -58.405 },
    callao: { lat: -34.5975, lng: -58.3925 },
    cabildo: { lat: -34.558, lng: -58.456 },
    corrientes: { lat: -34.6037, lng: -58.411 },
    santaFe: { lat: -34.5955, lng: -58.4112 },
    rivadavia: { lat: -34.618, lng: -58.437 },
    lomas: { lat: -34.758, lng: -58.402 },
    quilmes: { lat: -34.7205, lng: -58.2545 },
    palermo: { lat: -34.5875, lng: -58.4205 },
    retiro: { lat: -34.591, lng: -58.374 },
  };

  const pin = (p, fuente = 'direccion') => ({
    lat: p.lat,
    lng: p.lng,
    fuente,
    actualizadoAt: new Date(),
  });

  console.log('\nTareas DEMO');
  const tareasDefs = [
    // En progreso (mapa vivo)
    {
      numero: 'DEMO-2001',
      titulo: 'Revisión medidor gas VAITTY',
      descripcion: 'Olor a gas reportado por asegurado.',
      estado: 'en progreso',
      tecnicos: [techs.joaquin._id],
      fechaEjecucion: ymd(today),
      franja_horaria: '09:00 - 12:00',
      cliente: 'VAITTY - Ana López',
      cuentaCliente: 'VAITTY',
      direccion: 'Av. Córdoba 2500, CABA',
      ubicacionMapa: pin(pts.cordoba, 'gps'),
      origen: 'web',
    },
    {
      numero: 'DEMO-2002',
      titulo: 'Tablero eléctrico IKE',
      descripcion: 'Cambio de tablero monofásico.',
      estado: 'en progreso',
      tecnicos: [techs.lautaro._id],
      fechaEjecucion: ymd(today),
      franja_horaria: '14:00 - 18:00',
      cliente: 'IKE - Edificio Norte',
      cuentaCliente: 'IKE',
      direccion: 'Av. Callao 1200, CABA',
      ubicacionMapa: pin(pts.callao, 'gps'),
      origen: 'sistema',
    },
    {
      numero: 'DEMO-2003',
      titulo: 'AC sin frío VAITTY',
      descripcion: 'Split no enfría.',
      estado: 'en progreso',
      tecnicos: [techs.nahuel._id],
      fechaEjecucion: ymd(today),
      franja_horaria: '08:00 - 11:00',
      cliente: 'VAITTY - Silvia Méndez',
      cuentaCliente: 'VAITTY',
      direccion: 'Av. Hipólito Yrigoyen 8900, Lomas',
      ubicacionMapa: pin(pts.lomas, 'tecnico'),
      origen: 'whatsapp',
    },
    // Hoy con coords (ruta sugerida)
    {
      numero: 'DEMO-2010',
      titulo: 'Termotanque IKE',
      descripcion: 'Instalación termotanque 80L.',
      estado: 'pendiente',
      tecnicos: [techs.pablo._id],
      fechaEjecucion: ymd(today),
      franja_horaria: '09:00 - 12:00',
      cliente: 'IKE - Laura Fernández',
      cuentaCliente: 'IKE',
      direccion: 'Av. Cabildo 2800, Belgrano',
      ubicacionMapa: pin(pts.cabildo),
      origen: 'web',
    },
    {
      numero: 'DEMO-2011',
      titulo: 'Estanqueidad VAITTY',
      descripcion: 'Prueba post-obra.',
      estado: 'pendiente',
      tecnicos: [techs.joaquin._id],
      fechaEjecucion: ymd(today),
      franja_horaria: '09:00 - 12:00',
      cliente: 'VAITTY - Consorcio Sol',
      cuentaCliente: 'VAITTY',
      direccion: 'Av. Corrientes 3800, Almagro',
      ubicacionMapa: pin(pts.corrientes),
      origen: 'web',
    },
    {
      numero: 'DEMO-2012',
      titulo: 'Cocina gas Particular',
      descripcion: 'Conexión nueva.',
      estado: 'pendiente',
      tecnicos: [techs.hernan._id],
      fechaEjecucion: ymd(today),
      franja_horaria: '14:00 - 18:00',
      cliente: 'Particular - Martín Acosta',
      cuentaCliente: 'Particular',
      direccion: 'Scalabrini Ortiz 1500, Palermo',
      ubicacionMapa: pin(pts.palermo),
      origen: 'web',
    },
    {
      numero: 'DEMO-2013',
      titulo: 'Cerradura IKE',
      descripcion: 'Cambio de bombín.',
      estado: 'pendiente',
      tecnicos: [techs.maria._id],
      fechaEjecucion: ymd(today),
      franja_horaria: '14:00 - 18:00',
      cliente: 'IKE - Roberto Díaz',
      cuentaCliente: 'IKE',
      direccion: 'Av. Santa Fe 3200, Palermo',
      ubicacionMapa: pin(pts.santaFe),
      origen: 'web',
    },
    {
      numero: 'DEMO-2014',
      titulo: 'Pérdida plomería VAITTY',
      descripcion: 'Pérdida bajo pileta.',
      estado: 'pendiente',
      tecnicos: [techs.pablo._id],
      fechaEjecucion: ymd(today),
      franja_horaria: '14:00 - 18:00',
      cliente: 'VAITTY - Pedro Sánchez',
      cuentaCliente: 'VAITTY',
      direccion: 'Av. Rivadavia 5200, Caballito',
      ubicacionMapa: pin(pts.rivadavia),
      origen: 'web',
    },
    // Completadas (analytics / liquidaciones / reclamos)
    {
      numero: 'DEMO-2101',
      titulo: 'Caldera VAITTY completada',
      descripcion: 'Service anual.',
      estado: 'completada',
      tecnicos: [techs.joaquin._id],
      fechaEjecucion: ymd(addDays(today, -2)),
      franja_horaria: '10:00 - 13:00',
      cliente: 'VAITTY - Familia Ruiz',
      cuentaCliente: 'VAITTY',
      direccion: 'Mitre 450, Lomas de Zamora',
      ubicacionMapa: pin(pts.lomas),
      fechaCompletado: addDays(today, -2),
      origen: 'web',
      liq: { manoObra: 45000, materiales: 12000, cobertura: 50000, excedente: 7000 },
    },
    {
      numero: 'DEMO-2102',
      titulo: 'Electricidad IKE OK',
      descripcion: 'Cambio de tomas.',
      estado: 'completada',
      tecnicos: [techs.lautaro._id],
      fechaEjecucion: ymd(addDays(today, -3)),
      franja_horaria: '09:00 - 12:00',
      cliente: 'IKE - Oficina Centro',
      cuentaCliente: 'IKE',
      direccion: 'Lavalle 800, CABA',
      ubicacionMapa: pin(pts.retiro),
      fechaCompletado: addDays(today, -3),
      origen: 'sistema',
      liq: { manoObra: 38000, materiales: 9000, cobertura: 42000, excedente: 5000 },
    },
    {
      numero: 'DEMO-2103',
      titulo: 'Refri VAITTY con reclamo',
      descripcion: 'Carga de gas — luego reclamo.',
      estado: 'completada',
      tecnicos: [techs.lautaro._id],
      fechaEjecucion: ymd(addDays(today, -5)),
      franja_horaria: '14:00 - 17:00',
      cliente: 'VAITTY - Comercio Sur',
      cuentaCliente: 'VAITTY',
      direccion: 'Alsina 850, Lomas',
      ubicacionMapa: pin(pts.lomas),
      fechaCompletado: addDays(today, -5),
      origen: 'web',
      liq: { manoObra: 52000, materiales: 15000, cobertura: 55000, excedente: 12000 },
    },
    {
      numero: 'DEMO-2104',
      titulo: 'Gas IKE sin reclamo',
      descripcion: 'Revisión rutinaria.',
      estado: 'completada',
      tecnicos: [techs.pablo._id],
      fechaEjecucion: ymd(addDays(today, -4)),
      franja_horaria: '11:00 - 14:00',
      cliente: 'IKE - Familia Ortega',
      cuentaCliente: 'IKE',
      direccion: 'Av. Rivadavia 4800, Caballito',
      ubicacionMapa: pin(pts.rivadavia),
      fechaCompletado: addDays(today, -4),
      origen: 'web',
      liq: { manoObra: 41000, materiales: 8000, cobertura: 45000, excedente: 4000 },
    },
    {
      numero: 'DEMO-2105',
      titulo: 'MDO refrigeración',
      descripcion: 'Cámara frigorífica chica.',
      estado: 'completada',
      tecnicos: [techs.nahuel._id],
      fechaEjecucion: ymd(addDays(today, -6)),
      franja_horaria: '08:00 - 12:00',
      cliente: 'MDO - Local Comercial',
      cuentaCliente: 'MDO',
      direccion: 'Calle 12 500, Quilmes',
      ubicacionMapa: pin(pts.quilmes),
      fechaCompletado: addDays(today, -6),
      origen: 'web',
      liq: { manoObra: 70000, materiales: 20000, cobertura: 80000, excedente: 10000 },
    },
    {
      numero: 'DEMO-2106',
      titulo: 'VAITTY demora',
      descripcion: 'Trabajo reprogramado varias veces.',
      estado: 'completada',
      tecnicos: [techs.lautaro._id],
      fechaEjecucion: ymd(addDays(today, -1)),
      franja_horaria: '15:00 - 18:00',
      cliente: 'VAITTY - Cliente Impaciente',
      cuentaCliente: 'VAITTY',
      direccion: 'Av. Santa Fe 1800, CABA',
      ubicacionMapa: pin(pts.santaFe),
      fechaCompletado: addDays(today, -1),
      origen: 'whatsapp',
      liq: { manoObra: 35000, materiales: 5000, cobertura: 40000, excedente: 0 },
    },
    {
      numero: 'DEMO-2107',
      titulo: 'IKE cerrajería OK',
      descripcion: 'Apertura y cambio de llave.',
      estado: 'completada',
      tecnicos: [techs.maria._id],
      fechaEjecucion: ymd(addDays(today, -7)),
      franja_horaria: '10:00 - 12:00',
      cliente: 'IKE - Depto 4B',
      cuentaCliente: 'IKE',
      direccion: 'Av. Callao 900, CABA',
      ubicacionMapa: pin(pts.callao),
      fechaCompletado: addDays(today, -7),
      origen: 'web',
      liq: { manoObra: 28000, materiales: 6000, cobertura: 30000, excedente: 4000 },
    },
    {
      numero: 'DEMO-2108',
      titulo: 'VAITTY incompleto',
      descripcion: 'Quedó pendiente sellado.',
      estado: 'completada',
      tecnicos: [techs.lautaro._id],
      fechaEjecucion: ymd(addDays(today, -8)),
      franja_horaria: '09:00 - 11:00',
      cliente: 'VAITTY - Casa Azul',
      cuentaCliente: 'VAITTY',
      direccion: 'Av. Córdoba 1800, CABA',
      ubicacionMapa: pin(pts.cordoba),
      fechaCompletado: addDays(today, -8),
      origen: 'web',
      liq: { manoObra: 32000, materiales: 4000, cobertura: 35000, excedente: 1000 },
    },
    {
      numero: 'DEMO-2199',
      titulo: 'Cancelada por cliente',
      descripcion: 'Cliente no estuvo.',
      estado: 'cancelada',
      tecnicos: [techs.hernan._id],
      fechaEjecucion: ymd(addDays(today, -3)),
      franja_horaria: '11:00 - 14:00',
      cliente: 'Particular - No Show',
      cuentaCliente: 'Particular',
      direccion: 'Lavalle 500, CABA',
      ubicacionMapa: null,
      origen: 'web',
    },
  ];

  const tareasByNumero = {};
  for (const def of tareasDefs) {
    const { liq, ...rest } = def;
    const tarea = await upsertTarea({
      ...rest,
      numeroTitular: '1100000000',
      creadoPor: creador._id,
    });
    tareasByNumero[tarea.numero] = tarea;
    if (liq && tarea.estado === 'completada') {
      await upsertLiquidacion(tarea._id, {
        ...liq,
        materialReal: liq.materiales || 0,
        observacionesFinancieras: 'Seed DEMO',
      });
    }
  }

  console.log('\nReclamos (calidad)');
  await upsertReclamo('R1', {
    tarea: tareasByNumero['DEMO-2103']._id,
    cliente: 'VAITTY - Comercio Sur',
    cuentaCliente: 'VAITTY',
    tecnicos: [techs.lautaro._id],
    motivo: 'problema_tecnico',
    estado: 'resuelto',
    descripcion: 'El equipo volvió a fallar a las 48 hs.',
    fechaReclamo: addDays(today, -4),
    fechaResolucion: addDays(today, -3),
    creadoPor: creador._id,
    resueltoPor: creador._id,
  });
  await upsertReclamo('R2', {
    tarea: tareasByNumero['DEMO-2106']._id,
    cliente: 'VAITTY - Cliente Impaciente',
    cuentaCliente: 'VAITTY',
    tecnicos: [techs.lautaro._id],
    motivo: 'demora',
    estado: 'abierto',
    descripcion: 'Demora reiterada en la visita.',
    fechaReclamo: addDays(today, -1),
    creadoPor: creador._id,
  });
  await upsertReclamo('R3', {
    tarea: tareasByNumero['DEMO-2108']._id,
    cliente: 'VAITTY - Casa Azul',
    cuentaCliente: 'VAITTY',
    tecnicos: [techs.lautaro._id],
    motivo: 'trabajo_incompleto',
    estado: 'reabierto',
    descripcion: 'Faltó sellado final.',
    fechaReclamo: addDays(today, -7),
    creadoPor: creador._id,
  });
  await upsertReclamo('R4', {
    tarea: tareasByNumero['DEMO-2102']._id,
    cliente: 'IKE - Oficina Centro',
    cuentaCliente: 'IKE',
    tecnicos: [techs.lautaro._id],
    motivo: 'mala_atencion',
    estado: 'resuelto',
    descripcion: 'Trato brusco según reclamo IKE.',
    fechaReclamo: addDays(today, -2),
    fechaResolucion: addDays(today, -1),
    creadoPor: creador._id,
    resueltoPor: creador._id,
  });
  await upsertReclamo('R5', {
    tarea: tareasByNumero['DEMO-2101']._id,
    cliente: 'VAITTY - Familia Ruiz',
    cuentaCliente: 'VAITTY',
    tecnicos: [techs.joaquin._id],
    motivo: 'otro',
    estado: 'resuelto',
    descripcion: 'Consulta menor post-servicio.',
    fechaReclamo: addDays(today, -1),
    fechaResolucion: today,
    creadoPor: creador._id,
    resueltoPor: creador._id,
  });

  console.log('\nTareas consorcio');
  await upsertConsorcio({
    numero: 'DEMO-C-3001',
    titulo: 'Pintura hall consorcio',
    descripcion: 'Presupuesto aceptado.',
    estado: 'confirmado',
    precio: 185000,
    cliente: 'Consorcio Las Heras',
    direccion: 'Av. Las Heras 2100, CABA',
    fechaEjecucion: ymd(addDays(today, 3)),
    franja_horaria: '09:00 - 17:00',
    tecnicos: [techs.maria._id],
    administradorConsorcio: adminConsorcio._id,
    creadoPor: creador._id,
    origen: 'sistema',
  });
  await upsertConsorcio({
    numero: 'DEMO-C-3002',
    titulo: 'Reparación bomba de agua',
    descripcion: 'Trabajo finalizado, pendiente pago.',
    estado: 'PENDIENTE_PAGO',
    precio: 95000,
    cliente: 'Consorcio Rivadavia',
    direccion: 'Av. Rivadavia 6100, CABA',
    fechaEjecucion: ymd(addDays(today, -2)),
    franja_horaria: '10:00 - 14:00',
    tecnicos: [techs.pablo._id],
    administradorConsorcio: adminConsorcio._id,
    creadoPor: creador._id,
    origen: 'sistema',
  });
  await upsertConsorcio({
    numero: 'DEMO-C-3003',
    titulo: 'Cerrajería portal',
    descripcion: 'Pagado.',
    estado: 'PAGADO',
    precio: 62000,
    cliente: 'Consorcio Callao',
    direccion: 'Av. Callao 1500, CABA',
    fechaEjecucion: ymd(addDays(today, -10)),
    franja_horaria: '15:00 - 18:00',
    tecnicos: [techs.maria._id],
    administradorConsorcio: adminConsorcio._id,
    creadoPor: creador._id,
    origen: 'sistema',
  });

  console.log('\n========== SEED DEMO LISTO ==========');
  console.log('Admin: el que creó initAdmin (ej. superadmin@seprogar.com / SuperAdmin123!)');
  console.log('\nTécnicos (pass: Tecnico123!):');
  Object.values(techs).forEach((t) => console.log(`  - ${t.email}`));
  console.log(`\nAdmin Consorcio: admin.consorcio@demo.seprogar.com / ${ADMIN_CONSORCIO_PASSWORD}`);
  console.log('\nQué probar:');
  console.log('  • Mapa en vivo → Técnicos (DEMO-2001/2002/2003 en progreso)');
  console.log('  • Mapa → Tareas + fecha hoy → ruta sugerida (DEMO-201x)');
  console.log('  • Análisis → Cierre/Calidad (reclamos VAITTY + Lautaro)');
  console.log('  • Reclamos (menú Análisis)');
  console.log('  • Liquidaciones con MO/materiales separados');
  console.log('  • Tareas consorcio + Análisis tab Consorcio');
  console.log('  • Asignar tarea → recomendación por localidad');
  console.log('=====================================\n');

  await mongoose.disconnect();
  process.exit(0);
}

main().catch(async (err) => {
  console.error('❌ Error seed:', err.message);
  try {
    await mongoose.disconnect();
  } catch (_) {}
  process.exit(1);
});
