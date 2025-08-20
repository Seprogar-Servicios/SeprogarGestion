const ExcelJS = require('exceljs');
const Especialidad = require('../models/Especialidad');
const Usuario = require('../models/User');
const Tarea = require('../models/Tarea');
const bcrypt = require('bcryptjs');

// Función para normalizar texto (quitar acentos y pasar a minúsculas)
const normalizeText = (text) => {
  if (!text) return '';
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
};

// Función para validar y limpiar datos de especialidades
const validateEspecialidad = (data) => {
  const nombres = new Set();
  const result = [];
  
  console.log(`Validando ${data.length} especialidades...`);
  
  data.forEach((item, index) => {
    // Verificar que el ítem tenga nombre válido
    if (!item || !item.nombre) {
      console.log(`Omitiendo especialidad en índice ${index}: datos incompletos`);
      return; // Saltar este ítem
    }
    
    const nombre = item.nombre.toString().trim();
    
    // Verificar que el nombre no esté vacío
    if (!nombre) {
      console.log(`Omitiendo especialidad con nombre vacío en índice ${index}`);
      return; // Saltar este ítem
    }
    
    // Verificar que el nombre no esté duplicado
    if (nombres.has(normalizeText(nombre))) {
      console.log(`Omitiendo especialidad duplicada: ${nombre}`);
      return; // Saltar este ítem
    }
    
    nombres.add(normalizeText(nombre));
    result.push({
      nombre,
      nombreNormalizado: normalizeText(nombre),
      descripcion: item.descripcion?.toString().trim() || ''
    });
  });
  
  console.log(`Especialidades validadas: ${result.length} de ${data.length}`);
  return result;
};

// Función para validar y limpiar datos de usuarios
const validateUsuario = (data) => {
  const emails = new Set();
  const result = [];
  
  console.log(`Validando ${data.length} usuarios...`);
  
  data.forEach((item, index) => {
    // Verificar que el ítem tenga email válido
    if (!item || !item.email) {
      console.log(`Omitiendo usuario en índice ${index}: sin email`);
      return; // Saltar este ítem
    }
    
    const email = item.email.toString().toLowerCase().trim();
    
    // Verificar que el email no esté vacío
    if (!email) {
      console.log(`Omitiendo usuario con email vacío en índice ${index}`);
      return; // Saltar este ítem
    }
    
    // Verificar que el email no esté duplicado
    if (emails.has(email)) {
      console.log(`Omitiendo usuario con email duplicado: ${email}`);
      return; // Saltar este ítem
    }
    
    emails.add(email);
    
    // Procesar especialidades como texto para luego convertirlas a IDs
    let especialidadesTexto = [];
    if (item.especialidades) {
      if (typeof item.especialidades === 'string') {
        especialidadesTexto = item.especialidades.split(',').map(e => e.trim()).filter(Boolean);
      } else if (Array.isArray(item.especialidades)) {
        especialidadesTexto = item.especialidades.map(e => e?.toString().trim()).filter(Boolean);
      }
    }
    
    // Normalizar nombres de especialidades para facilitar búsqueda posterior
    const especialidadesNormalizadas = especialidadesTexto.map(e => ({
      nombre: e,
      nombreNormalizado: normalizeText(e)
    }));
    
    result.push({
      nombre: item.nombre?.toString().trim() || '',
      email,
      emailNormalizado: normalizeText(email),
      telefono: item.telefono?.toString().trim() || '',
      rol: ['admin', 'usuario'].includes(item.rol?.toLowerCase()) ? item.rol.toLowerCase() : 'usuario',
      password: bcrypt.hashSync('password123', 10), // Contraseña por defecto
      especialidadesTexto: especialidadesNormalizadas, // Guardamos los nombres normalizados
      especialidades: [] // Este array se llenará después con los IDs
    });
  });
  
  console.log(`Usuarios validados: ${result.length} de ${data.length}`);
  return result;
};

// Función para validar y limpiar datos de tareas
const validateTarea = (data) => {
  const numeros = new Set();
  const result = [];
  
  console.log(`Validando ${data.length} tareas...`);
  
  data.forEach((item, index) => {
    // Verificar que el ítem tenga número y título válidos
    if (!item || !item.numero || !item.titulo) {
      console.log(`Omitiendo tarea en índice ${index}: datos incompletos`);
      return; // Saltar este ítem
    }
    
    const numero = item.numero.toString().trim();
    const titulo = item.titulo.toString().trim();
    
    // Verificar que el número y título no estén vacíos
    if (!numero || !titulo) {
      console.log(`Omitiendo tarea con número/título vacío: ${numero || '[sin número]'} - ${titulo || '[sin título]'}`);
      return; // Saltar este ítem
    }
    
    // Verificar que el número no esté duplicado
    if (numeros.has(numero)) {
      console.log(`Omitiendo tarea duplicada: ${numero} - ${titulo}`);
      return; // Saltar este ítem
    }
    
    numeros.add(numero);
    
    // Procesar técnicos como texto para luego convertirlos a IDs
    let tecnicosTexto = [];
    if (item.tecnicos) {
      if (typeof item.tecnicos === 'string') {
        tecnicosTexto = item.tecnicos.split(',').map(t => t.trim()).filter(Boolean);
      } else if (Array.isArray(item.tecnicos)) {
        tecnicosTexto = item.tecnicos.map(t => t?.toString().trim()).filter(Boolean);
      }
    }
    
    // Normalizar nombres de técnicos para facilitar búsqueda posterior
    const tecnicosNormalizados = tecnicosTexto.map(t => ({
      nombre: t,
      nombreNormalizado: normalizeText(t)
    }));
    
    // Guardar el creador como texto para luego convertirlo a ID
    const creadoPorTexto = item['creado por']?.toString().trim() || '';
    
    result.push({
      numero,
      titulo,
      descripcion: item.descripcion?.toString().trim() || '',
      estado: ['pendiente', 'en progreso', 'completada'].includes(item.estado?.toLowerCase()) 
        ? item.estado.toLowerCase() 
        : 'pendiente',
      fechaCreacion: new Date(),
      fechaEjecucion: item.fechaEjecucion || null, // Mantener la fecha de ejecución procesada
      creadoPorTexto,
      creadoPor: null, // Se llenará después con el ID
      tecnicosTexto: tecnicosNormalizados, // Guardamos los nombres normalizados
      tecnicos: [], // Este array se llenará después con los IDs
      cliente: item.cliente?.toString().trim() || '',
      numeroTitular: item.numeroTitular?.toString().trim() || '',
      direccion: item.direccion?.toString().trim() || ''
    });
  });
  
  console.log(`Tareas validadas: ${result.length} de ${data.length}`);
  return result;
};

// Importar datos desde archivo Excel
exports.importData = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ 
      success: false,
      message: 'No se ha subido ningún archivo' 
    });
  }
  
  // Primero validar si todos los datos son duplicados
  let allDataIsDuplicate = false;
  try {
    // Validar el archivo para detectar duplicados
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    
    // Verificar si todos los datos son duplicados
    const sheetsToCheck = ['Especialidades', 'Usuarios', 'Tareas'];
    let hasAnyData = false;
    allDataIsDuplicate = true;
    
    // Verificar especialidades duplicadas
    if (workbook.getWorksheet('Especialidades')) {
      const especialidadesExistentes = await Especialidad.find({}).lean();
      const especialidadesMap = new Map();
      especialidadesExistentes.forEach(esp => {
        especialidadesMap.set(normalizeText(esp.nombre), esp);
      });
      
      const especialidadesWS = workbook.getWorksheet('Especialidades');
      const nombreIndex = especialidadesWS.getRow(1).values
        .findIndex(h => normalizeHeader(h) === 'nombre');
      
      if (nombreIndex > 0) {
        let allEspecialidadesExist = true;
        let hasEspecialidades = false;
        
        for (let i = 2; i <= especialidadesWS.rowCount; i++) {
          const nombre = especialidadesWS.getRow(i).getCell(nombreIndex).text.trim();
          if (nombre) {
            hasEspecialidades = true;
            hasAnyData = true;
            if (!especialidadesMap.has(normalizeText(nombre))) {
              allEspecialidadesExist = false;
              break;
            }
          }
        }
        
        if (hasEspecialidades && !allEspecialidadesExist) {
          allDataIsDuplicate = false;
        }
      }
    }
    
    // Verificar usuarios duplicados
    if (allDataIsDuplicate && workbook.getWorksheet('Usuarios')) {
      const usuariosExistentes = await Usuario.find({}).lean();
      const usuariosMap = new Map();
      usuariosExistentes.forEach(user => {
        usuariosMap.set(normalizeText(user.email), user);
      });
      
      const usuariosWS = workbook.getWorksheet('Usuarios');
      const emailIndex = usuariosWS.getRow(1).values
        .findIndex(h => normalizeHeader(h) === 'email');
      
      if (emailIndex > 0) {
        let allUsuariosExist = true;
        let hasUsuarios = false;
        
        for (let i = 2; i <= usuariosWS.rowCount; i++) {
          const email = usuariosWS.getRow(i).getCell(emailIndex).text.trim();
          if (email) {
            hasUsuarios = true;
            hasAnyData = true;
            if (!usuariosMap.has(normalizeText(email))) {
              allUsuariosExist = false;
              break;
            }
          }
        }
        
        if (hasUsuarios && !allUsuariosExist) {
          allDataIsDuplicate = false;
        }
      }
    }
    
    // Verificar tareas duplicadas
    if (allDataIsDuplicate && workbook.getWorksheet('Tareas')) {
      const tareasExistentes = await Tarea.find({}).lean();
      const tareasMap = new Map();
      tareasExistentes.forEach(tarea => {
        // Normalizar el número de tarea eliminando ceros a la izquierda
        const numeroNormalizado = String(tarea.numero).trim().replace(/^0+/, '');
        tareasMap.set(numeroNormalizado, tarea);
        // También guardar con el formato original para mayor seguridad
        tareasMap.set(String(tarea.numero).trim(), tarea);
      });
      
      const tareasWS = workbook.getWorksheet('Tareas');
      const numeroIndex = tareasWS.getRow(1).values
        .findIndex(h => normalizeHeader(h) === 'numero');
      
      if (numeroIndex > 0) {
        let allTareasExist = true;
        let hasTareas = false;
        
        for (let i = 2; i <= tareasWS.rowCount; i++) {
          const numero = tareasWS.getRow(i).getCell(numeroIndex).text.trim();
          if (numero) {
            hasTareas = true;
            hasAnyData = true;
            // Normalizar el número de tarea eliminando ceros a la izquierda
            const numeroNormalizado = String(numero).trim().replace(/^0+/, '');
            if (!tareasMap.has(numeroNormalizado) && !tareasMap.has(numero)) {
              allTareasExist = false;
              break;
            }
          }
        }
        
        if (hasTareas && !allTareasExist) {
          allDataIsDuplicate = false;
        }
      }
    }
    
    // Manejar el caso de archivo vacío
    if (!hasAnyData) {
      return res.status(400).json({
        success: false,
        message: 'El archivo no contiene datos válidos para importar'
      });
    }
    
    // Si todos los datos son duplicados, marcar como warning pero permitir la importación
    if (allDataIsDuplicate) {
      return res.status(200).json({
        success: true,
        data: {
          isValid: true,
          allDataIsDuplicate: true,
          warnings: ['Todos los datos en el archivo ya existen en el sistema'],
          stats: {
            especialidades: 0,
            usuarios: 0,
            tareas: 0,
            especialidadesExistentes: 0,
            usuariosExistentes: 0,
            tareasExistentes: 0,
            especialidadesNuevas: 0,
            usuariosNuevos: 0,
            tareasNuevas: 0
          }
        }
      });
    }
  } catch (validationError) {
    console.error('Error al validar duplicados:', validationError);
    // Si hay un error en la validación, continuamos con la importación normal
  }

  try {
    console.log('=== INICIANDO IMPORTACIÓN DE DATOS ===');
    console.log('Nombre del archivo:', req.file.originalname);
    
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);

    // Procesar especialidades
    const especialidadesWS = workbook.getWorksheet('Especialidades');
    if (!especialidadesWS) {
      throw new Error('No se encontró la hoja de Especialidades');
    }
    
    // Obtener índices de columnas por nombre (case insensitive)
    // Obtener encabezados y asegurar que no sean undefined
    const rawHeaders = especialidadesWS.getRow(1).values || [];
    console.log('Encabezados brutos de Especialidades:', rawHeaders);
    
    // Filtrar valores nulos y convertir a formato adecuado
    const especialidadesHeaders = [];
    for (let i = 0; i < rawHeaders.length; i++) {
      if (rawHeaders[i]) {
        especialidadesHeaders.push({
          header: normalizeHeader(rawHeaders[i].toString().trim()),
          index: i
        });
      }
    }
    
    console.log('Encabezados procesados de Especialidades:', especialidadesHeaders);
    
    const getEspecialidadColumnIndex = (name) => {
      const normalizedName = normalizeHeader(name);
      const found = especialidadesHeaders.find(h => h.header === normalizedName);
      return found ? found.index : -1;
    };
    
    const nombreIndex = getEspecialidadColumnIndex('nombre');
    const descripcionIndex = getEspecialidadColumnIndex('descripcion');
    
    if (nombreIndex === -1) {
      throw new Error('No se encontró la columna "nombre" en la hoja Especialidades');
    }
    
    // Leer datos de la hoja de Excel
    let especialidadesSheetValues = [];
    
    // Obtener solo filas con datos (hasta la última fila con datos reales)
    const especialidadesLastRow = especialidadesWS.lastRow?.number || 0;
    for (let i = 2; i <= especialidadesLastRow; i++) { // Empezar desde 2 para saltar encabezados
      const row = especialidadesWS.getRow(i).values;
      if (row && row.length > 0) {
        especialidadesSheetValues.push(row);
      }
    }
    
    console.log(`Total de filas en hoja Especialidades: ${especialidadesSheetValues.length}`);
    
    // Filtrar filas vacías o con datos incompletos
    const especialidadesFilteredRows = especialidadesSheetValues.filter(row => {
      // Verificar que la fila exista y tenga datos en la columna nombre
      return row && 
             Array.isArray(row) && 
             row.length > nombreIndex && 
             row[nombreIndex] && 
             row[nombreIndex].toString().trim() !== '';
    });
    
    console.log(`Filas válidas de especialidades después de filtrar: ${especialidadesFilteredRows.length}`);
    
    // Mapear filas a objetos de especialidad
    const rawEspecialidadesData = especialidadesFilteredRows.map(row => ({
      nombre: row[nombreIndex].toString().trim(),
      descripcion: descripcionIndex > 0 && row.length > descripcionIndex && row[descripcionIndex] ? 
                  row[descripcionIndex].toString().trim() : ''
    }));
    
    console.log(`Especialidades antes de validación: ${rawEspecialidadesData.length}`);
    
    // Validar datos
    const especialidadesData = validateEspecialidad(rawEspecialidadesData);

    // Procesar usuarios
    const usuariosWS = workbook.getWorksheet('Usuarios');
    if (!usuariosWS) {
      throw new Error('No se encontró la hoja de Usuarios');
    }
    
    // Obtener encabezados y asegurar que no sean undefined
    const rawUsuariosHeaders = usuariosWS.getRow(1).values || [];
    console.log('Encabezados brutos de Usuarios:', rawUsuariosHeaders);
    
    // Filtrar valores nulos y convertir a formato adecuado
    const usuariosHeaders = [];
    for (let i = 0; i < rawUsuariosHeaders.length; i++) {
      if (rawUsuariosHeaders[i]) {
        usuariosHeaders.push({
          header: normalizeHeader(rawUsuariosHeaders[i].toString().trim()),
          index: i
        });
      }
    }
    
    console.log('Encabezados procesados de Usuarios:', usuariosHeaders);
    
    const getUsuarioColumnIndex = (name) => {
      const normalizedName = normalizeHeader(name);
      const found = usuariosHeaders.find(h => h.header === normalizedName);
      return found ? found.index : -1;
    };
    
    const nombreUsuarioIndex = getUsuarioColumnIndex('nombre');
    const emailIndex = getUsuarioColumnIndex('email');
    const telefonoIndex = getUsuarioColumnIndex('telefono');
    const rolIndex = getUsuarioColumnIndex('rol');
    const especialidadesIndex = getUsuarioColumnIndex('especialidades');
    
    if (nombreUsuarioIndex === -1 || emailIndex === -1 || rolIndex === -1) {
      throw new Error('Faltan columnas requeridas en la hoja Usuarios');
    }
    
    // Obtener valores y filtrar filas vacías o incompletas
    let usuariosSheetValues = [];
    
    // Obtener solo filas con datos (hasta la última fila con datos reales)
    const usuariosLastRow = usuariosWS.lastRow?.number || 0;
    for (let i = 2; i <= usuariosLastRow; i++) { // Empezar desde 2 para saltar encabezados
      const row = usuariosWS.getRow(i).values;
      if (row && row.length > 0) {
        usuariosSheetValues.push(row);
      }
    }
    
    console.log(`Total de filas en hoja Usuarios: ${usuariosSheetValues.length}`);
    
    // Filtrar filas vacías o con datos incompletos
    const usuariosFilteredRows = usuariosSheetValues.filter(row => {
      // Verificar que la fila exista y tenga datos en las columnas requeridas
      return row && 
             Array.isArray(row) && 
             row.length > nombreUsuarioIndex && 
             row.length > emailIndex && 
             row[nombreUsuarioIndex] && 
             row[emailIndex] && 
             row[emailIndex].toString().trim() !== '';
    });
    
    console.log(`Filas válidas de usuarios después de filtrar: ${usuariosFilteredRows.length}`);
    
    // Mapear filas a objetos de usuario
    const rawUsuariosData = usuariosFilteredRows.map(row => ({
      nombre: row[nombreUsuarioIndex].toString().trim(),
      email: row[emailIndex].toString().trim(),
      telefono: telefonoIndex > 0 && row.length > telefonoIndex && row[telefonoIndex] ? 
                row[telefonoIndex].toString().trim() : '',
      rol: rolIndex > 0 && row.length > rolIndex && row[rolIndex] ? 
           row[rolIndex].toString().trim() : 'usuario',
      especialidades: especialidadesIndex > 0 && row.length > especialidadesIndex && row[especialidadesIndex] ? 
                     row[especialidadesIndex] : ''
    }));
    
    console.log(`Usuarios antes de validación: ${rawUsuariosData.length}`);
    
    // Validar datos
    const usuariosData = validateUsuario(rawUsuariosData);

    // Filtrar especialidades que ya existen en la base de datos
    const especialidadesExistentes = await Especialidad.find({});
    
    // Crear un mapa para verificación rápida de duplicados
    const especialidadesExistentesMap = new Map();
    especialidadesExistentes.forEach(esp => {
      especialidadesExistentesMap.set(esp.nombreNormalizado, esp);
      // También mapear por nombre original para mayor seguridad
      especialidadesExistentesMap.set(normalizeText(esp.nombre), esp);
    });
    
    console.log('Verificando especialidades duplicadas...');
    const especialidadesNuevas = [];
    
    // Filtrar especialidades nuevas con verificación más estricta
    for (const esp of especialidadesData) {
      const normalizedName = esp.nombreNormalizado;
      const existingEsp = especialidadesExistentesMap.get(normalizedName);
      
      if (!existingEsp) {
        console.log(`  - Nueva especialidad: "${esp.nombre}"`);
        especialidadesNuevas.push(esp);
      } else {
        console.log(`  - Especialidad ya existe: "${esp.nombre}" (ID: ${existingEsp._id})`);
      }
    }
    
    console.log(`Especialidades: ${especialidadesExistentes.length} existentes, ${especialidadesNuevas.length} nuevas`);
    
    // Insertar nuevas especialidades usando insertOne para manejar errores individualmente
    let especialidadesInsertadas = [];
    if (especialidadesNuevas.length > 0) {
      try {
        // Intentar insertar todas las especialidades
        const insertResult = await Especialidad.insertMany(especialidadesNuevas, { ordered: false });
        especialidadesInsertadas = insertResult;
      } catch (error) {
        // Si hay error de duplicados, intentar insertar una por una
        if (error.code === 11000) {
          console.log('Error de duplicados detectado, insertando especialidades una por una...');
          especialidadesInsertadas = [];
          
          for (const esp of especialidadesNuevas) {
            try {
              const inserted = await Especialidad.create(esp);
              especialidadesInsertadas.push(inserted);
              console.log(`  - Insertada: "${esp.nombre}"`);
            } catch (innerError) {
              if (innerError.code === 11000) {
                console.log(`  - Omitida (duplicada): "${esp.nombre}"`);
                // Buscar la especialidad existente para añadirla a la lista
                const existing = await Especialidad.findOne({ nombreNormalizado: esp.nombreNormalizado });
                if (existing) especialidadesInsertadas.push(existing);
              } else {
                console.error(`  - Error al insertar "${esp.nombre}": ${innerError.message}`);
              }
            }
          }
        } else {
          // Si es otro tipo de error, lanzarlo
          throw error;
        }
      }
    }
    
    // Combinar especialidades existentes y nuevas
    const todasEspecialidades = [...especialidadesExistentes, ...especialidadesInsertadas];

    // Crear un mapa de especialidades para búsquedas rápidas
    const especialidadesMap = new Map();
    todasEspecialidades.forEach(esp => {
      especialidadesMap.set(normalizeText(esp.nombre), esp._id);
    });

    // Filtrar usuarios que ya existen en la base de datos
    const usuariosExistentes = await Usuario.find({
      emailNormalizado: { $in: usuariosData.map(u => u.emailNormalizado) }
    });
    
    // Procesar usuarios nuevos y asignar IDs de especialidades
    const usuariosNuevos = [];
    
    // Crear un mapa para verificación rápida de usuarios duplicados
    const usuariosExistentesMap = new Map();
    usuariosExistentes.forEach(user => {
      usuariosExistentesMap.set(user.emailNormalizado, user);
      // También mapear por nombre normalizado para mayor seguridad
      if (user.nombre) {
        usuariosExistentesMap.set(normalizeText(user.nombre), user);
      }
    });
    
    console.log('Verificando usuarios duplicados...');
    
    for (const usuario of usuariosData) {
      // Verificar si el usuario ya existe
      const normalizedEmail = usuario.emailNormalizado;
      const usuarioExistente = usuariosExistentesMap.get(normalizedEmail);
      
      if (usuarioExistente) {
        console.log(`  - Usuario ya existe: "${usuario.nombre}" (${usuario.email}) con ID: ${usuarioExistente._id}`);
        continue;
      }
      
      // Procesar especialidades del usuario
      const especialidadesIds = [];
      
      if (usuario.especialidadesTexto && usuario.especialidadesTexto.length > 0) {
        console.log(`Procesando especialidades para usuario ${usuario.nombre}:`);
        
        for (const espData of usuario.especialidadesTexto) {
          const normalizedName = espData.nombreNormalizado;
          const espId = especialidadesMap.get(normalizedName);
          
          if (espId) {
            console.log(`  - Especialidad "${espData.nombre}" encontrada con ID: ${espId}`);
            especialidadesIds.push(espId);
          } else {
            console.log(`  - ADVERTENCIA: Especialidad "${espData.nombre}" no encontrada`);
          }
        }
      }
      
      // Asignar IDs de especialidades al usuario
      usuario.especialidades = especialidadesIds;
      delete usuario.especialidadesTexto; // Ya no necesitamos este campo
      
      console.log(`  - Nuevo usuario: "${usuario.nombre}" (${usuario.email})`);
      usuariosNuevos.push(usuario);
    }
    
    console.log(`Usuarios: ${usuariosExistentes.length} existentes, ${usuariosNuevos.length} nuevos`);
    
    // Insertar nuevos usuarios con manejo de errores
    let usuariosInsertados = [];
    if (usuariosNuevos.length > 0) {
      try {
        // Intentar insertar todos los usuarios
        const insertResult = await Usuario.insertMany(usuariosNuevos, { ordered: false });
        usuariosInsertados = insertResult;
      } catch (error) {
        // Si hay error de duplicados, intentar insertar uno por uno
        if (error.code === 11000) {
          console.log('Error de duplicados detectado, insertando usuarios uno por uno...');
          usuariosInsertados = [];
          
          for (const user of usuariosNuevos) {
            try {
              const inserted = await Usuario.create(user);
              usuariosInsertados.push(inserted);
              console.log(`  - Insertado: "${user.nombre}" (${user.email})`);
            } catch (innerError) {
              if (innerError.code === 11000) {
                console.log(`  - Omitido (duplicado): "${user.nombre}" (${user.email})`);
                // Buscar el usuario existente para añadirlo a la lista
                const existing = await Usuario.findOne({ emailNormalizado: user.emailNormalizado });
                if (existing) usuariosInsertados.push(existing);
              } else {
                console.error(`  - Error al insertar "${user.nombre}": ${innerError.message}`);
              }
            }
          }
        } else {
          // Si es otro tipo de error, lanzarlo
          throw error;
        }
      }
    }
    
    // Combinar usuarios existentes y nuevos
    const todosUsuarios = [...usuariosExistentes, ...usuariosInsertados];
    
    // Crear mapa de usuarios para vincular tareas
    const usuariosMap = new Map();
    todosUsuarios.forEach(user => {
      // Mapear por email normalizado
      usuariosMap.set(normalizeText(user.email), user._id);
      
      // Mapear también por nombre normalizado
      if (user.nombre) {
        usuariosMap.set(normalizeText(user.nombre), user._id);
      }
    });
    
    console.log('Procesando tareas...');
    

    // Procesar tareas
    const tareasWS = workbook.getWorksheet('Tareas');
    if (!tareasWS) {
      throw new Error('No se encontró la hoja de Tareas');
    }
    
    // Obtener encabezados y asegurar que no sean undefined
    const rawTareasHeaders = tareasWS.getRow(1).values || [];
    console.log('Encabezados brutos de Tareas:', rawTareasHeaders);
    
    // Filtrar valores nulos y convertir a formato adecuado
    const tareasHeaders = [];
    for (let i = 0; i < rawTareasHeaders.length; i++) {
      if (rawTareasHeaders[i]) {
        tareasHeaders.push({
          header: normalizeHeader(rawTareasHeaders[i].toString().trim()),
          index: i
        });
      }
    }
    
    console.log('Encabezados procesados de Tareas:', tareasHeaders);
    
    const getTareaColumnIndex = (name) => {
      const normalizedName = normalizeHeader(name);
      const found = tareasHeaders.find(h => h.header === normalizedName);
      return found ? found.index : -1;
    };
    
    const numeroIndex = getTareaColumnIndex('numero');
    const tituloIndex = getTareaColumnIndex('titulo');
    const descripcionTareaIndex = getTareaColumnIndex('descripcion');
    const estadoIndex = getTareaColumnIndex('estado');
    const creadoPorIndex = getTareaColumnIndex('creado por');
    const tecnicosIndex = getTareaColumnIndex('tecnicos');
    const clienteIndex = getTareaColumnIndex('cliente');
    const direccionIndex = getTareaColumnIndex('direccion');
    const fechaEjecucionIndex = getTareaColumnIndex('fecha ejecucion');
    if (numeroIndex === -1 || tituloIndex === -1 || creadoPorIndex === -1) {
      throw new Error('Faltan columnas requeridas en la hoja Tareas');
    }
    
    // Obtener valores y filtrar filas vacías o incompletas
    let tareasSheetValues = [];
    
    // Obtener solo filas con datos (hasta la última fila con datos reales)
    const tareasLastRow = tareasWS.lastRow?.number || 0;
    for (let i = 2; i <= tareasLastRow; i++) { // Empezar desde 2 para saltar encabezados
      const row = tareasWS.getRow(i).values;
      if (row && row.length > 0) {
        tareasSheetValues.push(row);
      }
    }
    
    console.log(`Total de filas en hoja Tareas: ${tareasSheetValues.length}`);
    
    const tareasFilteredRows = tareasSheetValues.filter(row => {
      // Verificar que la fila exista y tenga datos en las columnas requeridas
      return row && 
             Array.isArray(row) && 
             row.length > numeroIndex && 
             row.length > tituloIndex && 
             row[numeroIndex] && 
             row[tituloIndex] && 
             String(row[numeroIndex]).trim() !== '' && 
             String(row[tituloIndex]).trim() !== '';
    });
    
    console.log(`Filas válidas de tareas después de filtrar: ${tareasFilteredRows.length}`);
    
    const rawTareasData = tareasFilteredRows.map(row => {
      // Procesar fecha de ejecución si existe
      let fechaEjecucion = null;
      if (fechaEjecucionIndex > 0 && row.length > fechaEjecucionIndex && row[fechaEjecucionIndex]) {
        // Intentar convertir el valor de Excel a fecha
        try {
          if (typeof row[fechaEjecucionIndex] === 'number') {
            // Si es un número de serie de Excel
            const excelEpoch = new Date(1899, 11, 30);
            const millisecondsPerDay = 24 * 60 * 60 * 1000;
            fechaEjecucion = new Date(excelEpoch.getTime() + row[fechaEjecucionIndex] * millisecondsPerDay);
          } else {
            // Si es una cadena de texto, intentar parsear
            fechaEjecucion = new Date(row[fechaEjecucionIndex]);
          }
          
          // Verificar si la fecha es válida
          if (isNaN(fechaEjecucion.getTime())) {
            fechaEjecucion = null;
            console.log(`Fecha inválida para tarea ${row[numeroIndex]}: ${row[fechaEjecucionIndex]}`);
          } else {
            console.log(`Fecha procesada para tarea ${row[numeroIndex]}: ${fechaEjecucion.toISOString()}`);
          }
        } catch (error) {
          console.error(`Error al procesar fecha para tarea ${row[numeroIndex]}:`, error);
          fechaEjecucion = null;
        }
      }
      
      return {
        numero: row[numeroIndex],
        titulo: row[tituloIndex],
        descripcion: descripcionTareaIndex > 0 && row.length > descripcionTareaIndex ? (row[descripcionTareaIndex] || '') : '',
        estado: estadoIndex > 0 && row.length > estadoIndex ? (row[estadoIndex] || 'pendiente') : 'pendiente',
        'creado por': creadoPorIndex > 0 && row.length > creadoPorIndex ? (row[creadoPorIndex] || '') : '',
        tecnicos: tecnicosIndex > 0 && row.length > tecnicosIndex ? (row[tecnicosIndex] || '') : '',
        cliente: clienteIndex > 0 && row.length > clienteIndex ? (row[clienteIndex] || '') : '',
        direccion: direccionIndex > 0 && row.length > direccionIndex ? (row[direccionIndex] || '') : '',
        fechaEjecucion: fechaEjecucion
      };
    });
    
    console.log(`Tareas antes de validación: ${rawTareasData.length}`);
    
    // Validar datos de tareas
    const tareasData = validateTarea(rawTareasData);
    
    // Procesar tareas y vincular con usuarios
    console.log('Procesando referencias de usuarios en tareas...');
    
    // Asignar IDs de usuarios a las tareas
    for (const tarea of tareasData) {
      // Buscar creador por nombre o email
      if (tarea.creadoPorTexto) {
        const normalizedCreador = normalizeText(tarea.creadoPorTexto);
        const creadorId = usuariosMap.get(normalizedCreador);
        
        if (creadorId) {
          console.log(`  - Creador "${tarea.creadoPorTexto}" encontrado con ID: ${creadorId}`);
          tarea.creadoPor = creadorId;
        } else {
          console.log(`  - ADVERTENCIA: Creador "${tarea.creadoPorTexto}" no encontrado`);
        }
      }
      
      // Buscar técnicos por nombre o email
      if (tarea.tecnicosTexto && tarea.tecnicosTexto.length > 0) {
        console.log(`  - Procesando técnicos para tarea ${tarea.numero}:`);
        
        const tecnicosIds = [];
        for (const tecData of tarea.tecnicosTexto) {
          const normalizedName = tecData.nombreNormalizado;
          let tecnicoId = usuariosMap.get(normalizedName);
          
          // Si no se encuentra por nombre normalizado, intentar buscar por email
          if (!tecnicoId) {
            // Verificar si es un email
            const isEmail = tecData.nombre.includes('@');
            if (isEmail) {
              // Buscar usuario por email directamente
              const usuario = await Usuario.findOne({ email: tecData.nombre.trim() });
              if (usuario) {
                tecnicoId = usuario._id;
                console.log(`    - Técnico encontrado por email "${tecData.nombre}" con ID: ${tecnicoId}`);
              }
            }
          }
          
          if (tecnicoId) {
            console.log(`    - Técnico "${tecData.nombre}" encontrado con ID: ${tecnicoId}`);
            tecnicosIds.push(tecnicoId);
          } else {
            console.log(`    - ADVERTENCIA: Técnico "${tecData.nombre}" no encontrado`);
          }
        }
        
        tarea.tecnicos = tecnicosIds;
      }
      
      // Eliminar campos temporales
      delete tarea.creadoPorTexto;
      delete tarea.tecnicosTexto;
    }
    
    // Filtrar tareas que ya existen en la base de datos
    const tareasExistentes = await Tarea.find({});
    
    // Crear un mapa para verificación rápida de tareas duplicadas
    const tareasExistentesMap = new Map();
    tareasExistentes.forEach(tarea => {
      // Normalizar el número de tarea eliminando ceros a la izquierda
      const numeroNormalizado = String(tarea.numero).trim().replace(/^0+/, '');
      tareasExistentesMap.set(numeroNormalizado, tarea);
      // También guardar con el formato original para mayor seguridad
      tareasExistentesMap.set(String(tarea.numero).trim(), tarea);
    });
    
    console.log('Verificando tareas duplicadas...');
    const tareasNuevas = [];
    
    // Filtrar tareas nuevas con verificación más estricta
    for (const tarea of tareasData) {
      // Normalizar el número de tarea eliminando ceros a la izquierda
      const numeroOriginal = String(tarea.numero).trim();
      const numeroNormalizado = numeroOriginal.replace(/^0+/, '');
      // Buscar por ambos formatos
      const tareaExistente = tareasExistentesMap.get(numeroNormalizado) || tareasExistentesMap.get(numeroOriginal);
      
      if (!tareaExistente) {
        console.log(`  - Nueva tarea: "${tarea.numero} - ${tarea.titulo}"`);
        tareasNuevas.push(tarea);
      } else {
        console.log(`  - Tarea ya existe: "${tarea.numero} - ${tarea.titulo}" (ID: ${tareaExistente._id})`);
      }
    }
    
    console.log(`Tareas: ${tareasExistentes.length} existentes, ${tareasNuevas.length} nuevas`);
    
    // Insertar nuevas tareas con manejo de errores
    let tareasInsertadas = [];
    if (tareasNuevas.length > 0) {
      try {
        // Intentar insertar todas las tareas
        const insertResult = await Tarea.insertMany(tareasNuevas, { ordered: false });
        tareasInsertadas = insertResult;
      } catch (error) {
        // Si hay error de duplicados, intentar insertar una por una
        if (error.code === 11000) {
          console.log('Error de duplicados detectado, insertando tareas una por una...');
          tareasInsertadas = [];
          
          for (const tarea of tareasNuevas) {
            try {
              const inserted = await Tarea.create(tarea);
              tareasInsertadas.push(inserted);
              console.log(`  - Insertada: "${tarea.numero} - ${tarea.titulo}"`);
            } catch (innerError) {
              if (innerError.code === 11000) {
                console.log(`  - Omitida (duplicada): "${tarea.numero} - ${tarea.titulo}"`);
                // Buscar la tarea existente para añadirla a la lista
                // Usar una expresión regular para hacer la búsqueda insensible a ceros iniciales
                const numeroSinCeros = String(tarea.numero).trim().replace(/^0+/, '');
                const existing = await Tarea.findOne({
                  $or: [
                    { numero: tarea.numero },
                    { numero: { $regex: new RegExp('^0*' + numeroSinCeros + '$') } }
                  ]
                });
                if (existing) tareasInsertadas.push(existing);
              } else {
                console.error(`  - Error al insertar "${tarea.numero} - ${tarea.titulo}": ${innerError.message}`);
              }
            }
          }
        } else {
          // Si es otro tipo de error, lanzarlo
          throw error;
        }
      }
    }

    // Transacción completada con éxito

    // Calcular las estadísticas reales basadas en los datos insertados
    const especialidadesReales = especialidadesInsertadas.length;
    const usuariosReales = usuariosInsertados.length;
    const tareasReales = tareasInsertadas.length;
    
    // Calcular cuántos registros son nuevos y cuántos existentes
    const especialidadesExistentesReales = especialidadesInsertadas.filter(e => especialidadesExistentes.some(ex => ex._id.toString() === e._id.toString())).length;
    const usuariosExistentesReales = usuariosInsertados.filter(u => usuariosExistentes.some(ex => ex._id.toString() === u._id.toString())).length;
    const tareasExistentesReales = tareasInsertadas.filter(t => tareasExistentes.some(ex => ex._id.toString() === t._id.toString())).length;
    
    const especialidadesNuevasReales = especialidadesReales - especialidadesExistentesReales;
    const usuariosNuevosReales = usuariosReales - usuariosExistentesReales;
    const tareasNuevasReales = tareasReales - tareasExistentesReales;
    
    res.json({
      success: true,
      message: 'Datos importados correctamente',
      stats: {
        especialidades: especialidadesReales,
        usuarios: usuariosReales,
        tareas: tareasReales,
        especialidadesExistentes: especialidadesExistentesReales,
        usuariosExistentes: usuariosExistentesReales,
        tareasExistentes: tareasExistentesReales,
        especialidadesNuevas: especialidadesNuevasReales,
        usuariosNuevos: usuariosNuevosReales,
        tareasNuevas: tareasNuevasReales
      }
    });

  } catch (error) {
    console.error('Error en la importación:', error);
    console.error('Detalles del error:', {
      nombre: error.name,
      mensaje: error.message,
      stack: error.stack
    });
    
    if (error.name === 'MongoServerError' && error.code === 11000) {
      // Error de duplicados (clave única)
      console.error('Error de duplicados:', error.keyValue);
      res.status(400).json({
        success: false,
        message: 'Error al importar datos duplicados',
        error: {
          tipo: 'duplicado',
          campo: Object.keys(error.keyValue)[0],
          valor: Object.values(error.keyValue)[0]
        }
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Error al importar los datos: ' + error.message,
        error: {
          nombre: error.name,
          mensaje: error.message
        }
      });
    }
  }
};

// Función para normalizar encabezados (sin acentos y en minúsculas)
const normalizeHeader = (header) => {
  if (!header) return '';
  return header.toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
};

// Mapeo de encabezados requeridos por hoja
const REQUIRED_HEADERS = {
  Especialidades: ['nombre'],
  Usuarios: ['nombre', 'email', 'rol'],
  Tareas: ['numero', 'titulo', 'creado por']
};

// Validar archivo de importación
exports.validateImportFile = async (req, res) => {
  // Importar modelos para verificar duplicados
  const Especialidad = require('../models/Especialidad');
  const Usuario = require('../models/User');
  const Tarea = require('../models/Tarea');
  if (!req.file) {
    return res.status(400).json({ 
      success: false,
      message: 'No se ha subido ningún archivo',
      data: null
    });
  }

  try {
    console.log('=== INICIANDO VALIDACIÓN DE ARCHIVO ===');
    console.log('Nombre del archivo:', req.file.originalname);
    
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    
    const report = {
      isValid: true,
      sheets: {},
      errors: [],
      warnings: []
    };

    // Verificar hojas requeridas
    const requiredSheets = Object.keys(REQUIRED_HEADERS);
    const sheetNames = workbook.worksheets.map(ws => ws.name);
    
    console.log('Hojas requeridas:', requiredSheets);
    console.log('Hojas encontradas:', sheetNames);
    
    requiredSheets.forEach(sheet => {
      if (!sheetNames.includes(sheet)) {
        report.errors.push(`Falta la hoja requerida: ${sheet}`);
        report.isValid = false;
      }
    });

    // Validar estructura de cada hoja
    for (const sheetName of requiredSheets) {
      const ws = workbook.getWorksheet(sheetName);
      if (!ws) continue;
      
      // Obtener encabezados y normalizarlos
      const headers = ws.getRow(1).values
        .filter(Boolean)
        .map(header => ({
          original: header.toString().trim(),
          normalized: normalizeHeader(header)
        }));
      
      const normalizedHeaders = headers.map(h => h.normalized);
      const missingHeaders = [];
      
      // Verificar encabezados requeridos (case insensitive)
      console.log(`=== VALIDANDO ENCABEZADOS DE ${sheetName} ===`);
      console.log('Encabezados encontrados:', headers.map(h => h.original));
      console.log('Encabezados normalizados:', normalizedHeaders);
      console.log('Encabezados requeridos:', REQUIRED_HEADERS[sheetName]);
      
      for (const requiredHeader of REQUIRED_HEADERS[sheetName]) {
        const normalizedRequired = normalizeHeader(requiredHeader);
        console.log(`Buscando encabezado '${requiredHeader}' (normalizado: '${normalizedRequired}')`);
        
        if (!normalizedHeaders.includes(normalizedRequired)) {
          console.log(`  ❌ No se encontró el encabezado '${requiredHeader}'`);
          missingHeaders.push(requiredHeader);
        } else {
          console.log(`  ✅ Encabezado '${requiredHeader}' encontrado`);
        }
      }
      
      // Contar filas con datos
      const totalRows = ws.rowCount - 1; // Restar la fila de encabezados
      const emptyRows = [];
      const duplicateRows = [];
      const uniqueRows = new Set();
      
      // Si no faltan encabezados, validar los datos
      if (missingHeaders.length === 0 && totalRows > 0) {
        for (let i = 2; i <= ws.rowCount; i++) {
          const row = ws.getRow(i);
          const rowData = headers.reduce((acc, header, idx) => {
            const cellValue = row.getCell(idx + 1).text.trim();
            if (cellValue) acc[header.normalized] = cellValue;
            return acc;
          }, {});
          
          const rowKey = JSON.stringify(rowData);
          
          if (Object.keys(rowData).length === 0) {
            emptyRows.push(i);
          } else if (uniqueRows.has(rowKey)) {
            duplicateRows.push(i);
          } else {
            uniqueRows.add(rowKey);
          }
        }
      }
      
      // Agregar reporte de la hoja
      report.sheets[sheetName] = {
        rows: totalRows,
        validRows: uniqueRows.size,
        emptyRows: emptyRows.length,
        duplicateRows: duplicateRows.length,
        headers: headers.map(h => h.original),
        missingHeaders,
        isEmpty: totalRows === 0,
        hasOnlyEmptyRows: emptyRows.length === totalRows
      };
      
      // Agregar errores de encabezados faltantes
      if (missingHeaders.length > 0) {
        report.errors.push(
          `En la hoja '${sheetName}' faltan las siguientes columnas requeridas: ${missingHeaders.join(', ')}`
        );
        report.isValid = false;
      }
      
      // Agregar advertencias para filas vacías o duplicadas
      if (emptyRows.length > 0) {
        const rowsText = emptyRows.length > 3 
          ? `filas ${emptyRows.slice(0, 3).join(', ')} y ${emptyRows.length - 3} más`
          : `filas ${emptyRows.join(', ')}`;
        
        report.warnings.push(
          `La hoja '${sheetName}' tiene ${emptyRows.length} ${emptyRows.length === 1 ? 'fila vacía' : 'filas vacías'} (${rowsText})`
        );
      }
      
      if (duplicateRows.length > 0) {
        const rowsText = duplicateRows.length > 3 
          ? `filas ${duplicateRows.slice(0, 3).join(', ')} y ${duplicateRows.length - 3} más`
          : `filas ${duplicateRows.join(', ')}`;
        
        report.warnings.push(
          `La hoja '${sheetName}' tiene ${duplicateRows.length} ${duplicateRows.length === 1 ? 'fila duplicada' : 'filas duplicadas'} (${rowsText})`
        );
      }
      
      if (totalRows > 0 && uniqueRows.size === 0) {
        report.warnings.push(
          `La hoja '${sheetName}' no contiene datos nuevos para importar`
        );
      }
    }
    
    // Verificar datos existentes en la base de datos
    try {
      // Verificar especialidades existentes
      if (report.sheets.Especialidades && report.sheets.Especialidades.validRows > 0) {
        const especialidadesWS = workbook.getWorksheet('Especialidades');
        const nombreIndex = especialidadesWS.getRow(1).values
          .findIndex(h => normalizeHeader(h) === 'nombre');
        
        if (nombreIndex > 0) {
          // Paso 1: Extraer todas las especialidades del Excel y normalizarlas
          const especialidadesExcel = [];
          
          for (let i = 2; i <= especialidadesWS.rowCount; i++) {
            const nombreCell = especialidadesWS.getRow(i).getCell(nombreIndex);
            const nombre = nombreCell.text.trim();
            
            if (nombre) {
              especialidadesExcel.push({
                rowIndex: i,
                nombre: nombre,
                nombreNormalizado: normalizeText(nombre)
              });
            }
          }
          
          console.log(`Extraídas ${especialidadesExcel.length} especialidades del Excel`);
          console.log('Nombres normalizados:', especialidadesExcel.map(e => e.nombreNormalizado));
          
          // Paso 2: Obtener todas las especialidades de la base de datos
          const especialidadesDB = await Especialidad.find().lean();
          
          // Normalizar los nombres de las especialidades en la BD
          const especialidadesDBNormalizadas = especialidadesDB.map(e => ({
            ...e,
            nombreNormalizado: normalizeText(e.nombre)
          }));
          
          console.log(`Obtenidas ${especialidadesDBNormalizadas.length} especialidades de la base de datos`);
          console.log('Nombres en BD (muestra):', especialidadesDBNormalizadas.slice(0, 5).map(e => ({
            original: e.nombre,
            normalizado: e.nombreNormalizado
          })));
          
          // Paso 3: Encontrar coincidencias exactas
          const especialidadesExistentes = [];
          const especialidadesNoExistentes = [];
          
          // Crear un mapa para búsqueda eficiente
          const mapaNombresDB = {};
          especialidadesDBNormalizadas.forEach(esp => {
            mapaNombresDB[esp.nombreNormalizado] = esp;
          });
          
          console.log('Total de nombres únicos en BD:', Object.keys(mapaNombresDB).length);
          
          // Buscar coincidencias
          for (const espExcel of especialidadesExcel) {
            const espExistente = mapaNombresDB[espExcel.nombreNormalizado];
            
            if (espExistente) {
              console.log(`Coincidencia encontrada: Excel='${espExcel.nombre}' BD='${espExistente.nombre}'`);
              especialidadesExistentes.push({
                excel: espExcel,
                bd: espExistente
              });
            } else {
              console.log(`No hay coincidencia para: '${espExcel.nombre}'`);
              especialidadesNoExistentes.push(espExcel);
            }
          }
          
          console.log('Coincidencias encontradas:', especialidadesExistentes.map(e => 
            `Excel: '${e.excel.nombre}' (fila ${e.excel.rowIndex}) -> BD: '${e.bd.nombre}' (${e.bd._id})`
          ));
          
          // Actualizar el reporte
          const existentesCount = especialidadesExistentes.length;
          report.sheets.Especialidades.existingCount = existentesCount;
          
          if (existentesCount === report.sheets.Especialidades.validRows) {
            report.sheets.Especialidades.allExist = true;
            report.warnings.push(`Todas las especialidades ya existen en el sistema`);
          } else if (existentesCount > 0) {
            report.warnings.push(`${existentesCount} de ${report.sheets.Especialidades.validRows} especialidades ya existen en el sistema`);
          }
        }
      }
      
      // Verificar usuarios existentes
      if (report.sheets.Usuarios && report.sheets.Usuarios.validRows > 0) {
        const usuariosWS = workbook.getWorksheet('Usuarios');
        const emailIndex = usuariosWS.getRow(1).values
          .findIndex(h => normalizeHeader(h) === 'email');
        
        if (emailIndex > 0) {
          const emailsUsuarios = [];
          for (let i = 2; i <= usuariosWS.rowCount; i++) {
            const email = usuariosWS.getRow(i).getCell(emailIndex).text.trim();
            if (email) emailsUsuarios.push(email.toLowerCase());
          }
          
          // Buscar usuarios existentes
          const usuariosExistentes = await Usuario.find({
            email: { $in: emailsUsuarios }
          }).lean();
          
          const existentesCount = usuariosExistentes.length;
          report.sheets.Usuarios.existingCount = existentesCount;
          
          if (existentesCount === report.sheets.Usuarios.validRows) {
            report.sheets.Usuarios.allExist = true;
            report.warnings.push(`Todos los usuarios ya existen en el sistema`);
          } else if (existentesCount > 0) {
            report.warnings.push(`${existentesCount} de ${report.sheets.Usuarios.validRows} usuarios ya existen en el sistema`);
          }
        }
      }
      
      // Verificar tareas existentes
      if (report.sheets.Tareas && report.sheets.Tareas.validRows > 0) {
        const tareasWS = workbook.getWorksheet('Tareas');
        const numeroIndex = tareasWS.getRow(1).values
          .findIndex(h => normalizeHeader(h) === 'numero');
        
        if (numeroIndex > 0) {
          // Paso 1: Extraer todos los números de tareas del Excel y normalizarlos
          const tareasExcel = [];
          
          for (let i = 2; i <= tareasWS.rowCount; i++) {
            const row = tareasWS.getRow(i);
            const numeroCell = row.getCell(numeroIndex);
            let numero = '';
            
            // Manejar diferentes tipos de valores (texto, número, etc)
            if (numeroCell.type === ExcelJS.ValueType.Number) {
              numero = String(numeroCell.value).trim();
            } else {
              numero = (numeroCell.text || '').trim();
            }
            
            if (numero) {
              tareasExcel.push({
                rowIndex: i,
                numero: numero,
                numeroNormalizado: String(numero).trim()
              });
            }
          }
          
          console.log(`Extraídas ${tareasExcel.length} tareas del Excel`);
          
          // Paso 2: Obtener todas las tareas de la base de datos
          const tareasDB = await Tarea.find().select('numero titulo').lean();
          
          // Normalizar los números de las tareas en la BD
          const tareasDBNormalizadas = tareasDB.map(t => ({
            ...t,
            numeroNormalizado: String(t.numero).trim()
          }));
          
          console.log(`Obtenidas ${tareasDBNormalizadas.length} tareas de la base de datos`);
          
          // Paso 3: Encontrar coincidencias exactas con más detalle de debugging
          const tareasExistentes = [];
          const tareasNoExistentes = [];
          
          // Mostrar algunos ejemplos de números para debugging
          console.log('Ejemplos de números en Excel:', tareasExcel.slice(0, 3).map(t => ({
            original: t.numero,
            normalizado: t.numeroNormalizado,
            tipo: typeof t.numeroNormalizado
          })));
          
          console.log('Ejemplos de números en BD:', tareasDBNormalizadas.slice(0, 3).map(t => ({
            original: t.numero,
            normalizado: t.numeroNormalizado,
            tipo: typeof t.numeroNormalizado
          })));
          
          // Crear un mapa de números normalizados para búsqueda más eficiente
          const mapaNumerosDB = {};
          tareasDBNormalizadas.forEach(tarea => {
            mapaNumerosDB[tarea.numeroNormalizado] = tarea;
          });
          
          console.log('Total de números únicos en BD:', Object.keys(mapaNumerosDB).length);
          
          // Buscar coincidencias
          for (const tareaExcel of tareasExcel) {
            // Comprobar si existe en el mapa
            const tareaExistente = mapaNumerosDB[tareaExcel.numeroNormalizado];
            
            if (tareaExistente) {
              console.log(`Coincidencia encontrada: Excel='${tareaExcel.numero}' BD='${tareaExistente.numero}'`);
              tareasExistentes.push({
                excel: tareaExcel,
                bd: tareaExistente
              });
            } else {
              console.log(`No hay coincidencia para: '${tareaExcel.numero}'`);
              tareasNoExistentes.push(tareaExcel);
            }
          }
          
          console.log('Coincidencias encontradas:', tareasExistentes.map(t => 
            `Excel: '${t.excel.numero}' (fila ${t.excel.rowIndex}) -> BD: '${t.bd.numero}' (${t.bd._id})`
          ));
          
          console.log('Tareas sin coincidencia:', tareasNoExistentes.map(t => 
            `'${t.numero}' (fila ${t.rowIndex})`
          ));
          
          // Actualizar el reporte
          const existentesCount = tareasExistentes.length;
          report.sheets.Tareas.existingCount = existentesCount;
          
          console.log(`Encontradas ${existentesCount} de ${report.sheets.Tareas.validRows} tareas existentes`);
          
          if (existentesCount === report.sheets.Tareas.validRows) {
            report.sheets.Tareas.allExist = true;
            report.warnings.push(`Todas las tareas ya existen en el sistema`);
          } else if (existentesCount > 0) {
            report.warnings.push(`${existentesCount} de ${report.sheets.Tareas.validRows} tareas ya existen en el sistema`);
          }
        }
      }
    } catch (dbError) {
      console.error('Error al verificar datos existentes:', dbError);
      // No fallamos la validación si hay error en la verificación de duplicados
    }
    
    // Verificar si todos los datos son duplicados
    const sheetsToCheck = ['Especialidades', 'Usuarios', 'Tareas'];
    let allDataIsDuplicate = true;
    let hasAnyData = false;
    
    console.log('=== VERIFICACIÓN DETALLADA DE DUPLICADOS ===');
    
    for (const sheet of sheetsToCheck) {
      const sheetData = report.sheets[sheet];
      if (sheetData) {
        console.log(`Hoja ${sheet}:`, {
          filas: sheetData.rows,
          filasValidas: sheetData.validRows,
          filasVacias: sheetData.emptyRows,
          filasDuplicadas: sheetData.duplicateRows,
          existentes: sheetData.existingCount || 0,
          todosExisten: sheetData.allExist || false,
          tieneErrores: sheetData.errors?.length > 0,
          errores: sheetData.errors || [],
          encabezadosFaltantes: sheetData.missingHeaders || []
        });
        
        if (sheetData.validRows > 0) {
          hasAnyData = true;
          if (!sheetData.allExist) {
            console.log(`La hoja ${sheet} tiene datos que no existen en la BD`);
            allDataIsDuplicate = false;
          }
        }
      } else {
        console.log(`Hoja ${sheet}: No presente en el archivo`);
      }
    }
    
    // Si no hay datos en ninguna hoja, no consideramos que sean duplicados
    allDataIsDuplicate = allDataIsDuplicate && hasAnyData;
    
    console.log('=== RESUMEN DE VALIDACIÓN ===');
    console.log('Errores encontrados:', report.errors);
    console.log('Advertencias:', report.warnings);
    console.log('Estado de validación (isValid):', report.isValid);
    console.log('¿Todos los datos son duplicados?', allDataIsDuplicate);

    // Verificar si hay errores en el reporte
    const hasErrors = report.errors && report.errors.length > 0;
    console.log('¿Hay errores en el reporte?', hasErrors);
    
    // Forzar isValid = true si no hay errores
    if (!hasErrors) {
      report.isValid = true;
      console.log('Forzando isValid = true porque no hay errores');
    }
    
    if (allDataIsDuplicate) {
      report.warnings = ['Todos los datos en el archivo ya existen en el sistema'];
      report.allDataIsDuplicate = true;
      report.isValid = true; // Asegurar que no se muestre como error
      console.log('Todos los datos son duplicados, estableciendo allDataIsDuplicate = true');
    }

    // Asegurar que la respuesta siga el formato estándar de la API
    const responseMessage = allDataIsDuplicate 
      ? 'El archivo contiene solo datos duplicados' 
      : report.isValid 
        ? 'Archivo validado correctamente'
        : 'El archivo contiene errores de validación';
        
    console.log('Mensaje de respuesta:', responseMessage);
    console.log('Estado final de isValid:', report.isValid);
    
    res.json({
      success: true,
      data: report,
      message: responseMessage
    });
    
  } catch (error) {
    console.error('=== ERROR DETALLADO EN VALIDACIÓN DE ARCHIVO ===');
    console.error('Mensaje de error:', error.message);
    console.error('Stack trace:', error.stack);
    
    if (error.errors) {
      console.error('Errores de validación:', error.errors);
    }
    
    console.error('Tipo de error:', error.name);
    console.error('Archivo recibido:', req.file ? {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    } : 'No se recibió ningún archivo');
    
    res.status(400).json({ 
      success: false,
      message: `Error al validar el archivo: ${error.message}`,
      error: {
        name: error.name,
        message: error.message,
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
      }
    });
  }
};
