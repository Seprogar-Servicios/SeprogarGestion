const ExcelJS = require('exceljs');
const { Parser } = require('json2csv');
const Especialidad = require('../models/Especialidad');
const Usuario = require('../models/User'); // El modelo se exporta como 'Usuario' en el archivo
const Tarea = require('../models/Tarea');

// Función para normalizar texto (quitar acentos y pasar a minúsculas)
const normalizeText = (text) => {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
};

// Exportar plantilla de importación
exports.downloadTemplate = async (req, res) => {
  try {
    console.log('Solicitud de descarga de plantilla recibida');
    
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Futurgas';
    workbook.lastModifiedBy = 'Sistema';
    workbook.created = new Date();
    workbook.modified = new Date();

    // Hoja de especialidades
    const especialidadesSheet = workbook.addWorksheet('Especialidades');
    especialidadesSheet.columns = [
      { header: 'nombre', key: 'nombre', width: 30 },
      { header: 'descripcion', key: 'descripcion', width: 50 },
      { 
        header: 'nombre_normalizado', 
        key: 'nombre_normalizado', 
        width: 30,
        hidden: true,
        // Fórmula para normalizar automáticamente el nombre
        formula: 'LOWER(TRIM(A2))',
        resultType: 'string'
      }
    ];
    
    // Hoja de usuarios
    const usuariosSheet = workbook.addWorksheet('Usuarios');
    usuariosSheet.columns = [
      { header: 'nombre', key: 'nombre', width: 25 },
      { header: 'email', key: 'email', width: 30 },
      { header: 'telefono', key: 'telefono', width: 20 },
      { header: 'rol', key: 'rol', width: 15 },
      { 
        header: 'especialidades', 
        key: 'especialidades', 
        width: 30,
        note: 'Debe coincidir exactamente con el nombre de una especialidad existente (no sensible a mayúsculas)'
      },
      {
        header: 'email_normalizado',
        key: 'email_normalizado',
        width: 30,
        hidden: true,
        formula: 'LOWER(TRIM(B2))',
        resultType: 'string'
      }
    ];
    
    // Hoja de tareas
    const tareasSheet = workbook.addWorksheet('Tareas');
    tareasSheet.columns = [
      { header: 'numero', key: 'numero', width: 15, note: 'Número de tarea (opcional)' },
      { header: 'titulo', key: 'titulo', width: 30, note: 'Título de la tarea (requerido)' },
      { header: 'descripcion', key: 'descripcion', width: 50, note: 'Descripción detallada (opcional)' },
      { header: 'estado', key: 'estado', width: 15, note: 'pendiente, en progreso o completada (opcional, por defecto: pendiente)' },
      { 
        header: 'tecnicos', 
        key: 'tecnicos', 
        width: 40,
        note: 'Emails de técnicos separados por comas (opcional)'
      },
      { 
        header: 'creadoPor', 
        key: 'creadoPor', 
        width: 30,
        note: 'Email del usuario que crea la tarea (requerido)'
      },
      { header: 'cliente', key: 'cliente', width: 30, note: 'Nombre del cliente (opcional)' },
      { header: 'numeroTitular', key: 'numeroTitular', width: 25, note: 'Teléfono del titular (opcional)' },
      { header: 'direccion', key: 'direccion', width: 40, note: 'Dirección del cliente (opcional)' },
      { 
        header: 'fechaEjecucion', 
        key: 'fechaEjecucion', 
        width: 20,
        note: 'Fecha de ejecución en formato YYYY-MM-DD (opcional)'
      }
    ];
    
    // Agregar validación de datos
    const addDataValidation = (worksheet, column, options) => {
      worksheet.dataValidations[`${column}2:${column}1000`] = {
        type: 'custom',
        formulae: [`ISNUMBER(MATCH(${column}2,${options.sheetName}!$${options.matchColumn}$2:$${options.matchColumn}$1000,0))`],
        allowBlank: true,
        showErrorMessage: true,
        errorTitle: 'Error de validación',
        error: `El valor debe existir en la hoja ${options.sheetName}`,
        errorStyle: 'error'
      };
    };
    
    // Configurar validación de datos para referencias
    addDataValidation(usuariosSheet, 'E', { sheetName: 'Especialidades', matchColumn: 'A' });
    addDataValidation(tareasSheet, 'F', { sheetName: 'Usuarios', matchColumn: 'B' }); // creadoPor
    
    // Configurar validación para técnicos (opcional, ya que es un campo de texto libre)

    // Configurar los headers de la respuesta
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=plantilla_importacion.xlsx');
    
    // Escribir directamente a la respuesta
    await workbook.xlsx.write(res);
    res.end();
    
  } catch (error) {
    console.error('Error al generar plantilla:', error);
    
    // Si los headers ya fueron enviados, no podemos enviar otro status
    if (!res.headersSent) {
      res.status(500).json({ 
        success: false,
        message: 'Error al generar la plantilla',
        error: error.message 
      });
    }
  }
};

// Exportar datos actuales
exports.exportData = async (req, res) => {
  console.log('Exporting data...');
  
  try {
    // Obtener todos los datos
    let especialidades = [];
    let usuarios = [];
    let tareas = [];
    
    try {
      console.log('1. Verificando modelos...');
      console.log('Especialidad model:', Especialidad ? 'OK' : 'No encontrado');
      console.log('Usuario model:', Usuario ? 'OK' : 'No encontrado');
      console.log('Tarea model:', Tarea ? 'OK' : 'No encontrado');
      
      console.log('2. Iniciando consultas a la base de datos...');
      
      console.log('2.1 Consultando especialidades...');
      especialidades = await Especialidad.find({}).lean().maxTimeMS(30000).exec();
      console.log(`2.1 Encontradas ${especialidades.length} especialidades`);
      
      console.log('2.2 Consultando usuarios...');
      usuarios = await Usuario.find({})
        .select('-password')
        .populate('especialidad', 'nombre')
        .lean()
        .maxTimeMS(30000)
        .exec();
      console.log(`2.2 Encontrados ${usuarios.length} usuarios`);
      
      console.log('2.3 Consultando tareas...');
      tareas = await Tarea.find({})
        .populate('creadoPor', 'nombre email')
        .populate('tecnicos', 'nombre email')
        .lean()
        .maxTimeMS(30000)
        .exec();
      console.log(`2.3 Encontradas ${tareas.length} tareas`);
      
    } catch (dbError) {
      console.error('Error en la consulta a la base de datos:');
      console.error('Mensaje:', dbError.message);
      console.error('Stack:', dbError.stack);
      
      if (dbError.name === 'MongooseError') {
        console.error('Error de Mongoose:', dbError.message);
      } else if (dbError.name === 'CastError') {
        console.error('Error de casteo:', dbError.message);
      } else if (dbError.name === 'ValidationError') {
        console.error('Error de validación:', dbError.message);
      }
      
      return res.status(500).json({ 
        success: false, 
        message: 'Error al obtener datos de la base de datos',
        error: process.env.NODE_ENV === 'development' ? dbError.message : 'Error interno del servidor',
        type: dbError.name
      });
    }
    
    console.log(`Datos obtenidos: ${especialidades.length} especialidades, ${usuarios.length} usuarios, ${tareas.length} tareas`);
    
    try {
      // Crear el archivo Excel
      console.log('3. Creando libro de Excel...');
      const workbook = new ExcelJS.Workbook();
      console.log('3.1 Libro de Excel creado');
      
      workbook.creator = 'Futurgas';
      workbook.lastModifiedBy = 'Sistema';
      workbook.created = new Date();
      workbook.modified = new Date();
      
      console.log('3.2 Propiedades del libro configuradas');
      
      console.log('3.3 Preparando función para agregar hojas...');
      
      // Función para agregar hojas con formato
      const addSheet = (name, data, columns) => {
        if (!data || data.length === 0) {
          console.warn(`No hay datos para la hoja: ${name}`);
          return;
        }
        
        const sheet = workbook.addWorksheet(name);
        
        // Configurar columnas con ancho
        sheet.columns = columns.map(col => ({
          header: col.header,
          key: col.key,
          width: col.width || 15
        }));
        
        // Agregar datos
        data.forEach(item => {
          const row = {};
          columns.forEach(col => {
            // Manejar propiedades anidadas (ej: 'creadoPor.nombre')
            const keys = col.key.split('.');
            let value = item;
            for (const key of keys) {
              value = value ? value[key] : '';
            }
            row[col.key] = value || '';
          });
          sheet.addRow(row);
        });
        
        // Ajustar ancho de columnas
        sheet.columns.forEach(column => {
          let maxLength = 0;
          column.eachCell({ includeEmpty: true }, cell => {
            const columnLength = cell.value ? cell.value.toString().length : 10;
            if (columnLength > maxLength) {
              maxLength = columnLength;
            }
          });
          column.width = Math.min(Math.max(maxLength + 2, 10), 50); // Mínimo 10, máximo 50
        });
        
        // Estilo para la primera fila (encabezados)
        const headerRow = sheet.getRow(1);
        headerRow.font = { bold: true };
        headerRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFD3D3D3' }
        };
      };
      
      // Formatear datos de especialidades (sin _id)
      const formattedEspecialidades = especialidades.map(({ _id, ...esp }) => ({
        nombre: esp.nombre || '',
        descripcion: esp.descripcion || ''
      }));
      
      addSheet('Especialidades', formattedEspecialidades, [
        { header: 'Nombre', key: 'nombre', width: 30, note: 'Nombre único de la especialidad (requerido)' },
        { header: 'Descripción', key: 'descripcion', width: 50, note: 'Descripción opcional' }
      ]);
      
      // Formatear datos de usuarios (sin _id)
      const formattedUsuarios = usuarios.map(({ _id, password, ...usuario }) => {
        const esUsuario = (usuario.rol || 'usuario') === 'usuario';
        return {
          nombre: usuario.nombre || '',
          email: usuario.email || '',
          telefono: usuario.telefono || '',
          rol: usuario.rol || 'usuario',
          especialidad: esUsuario && usuario.especialidad 
            ? (usuario.especialidad.nombre || usuario.especialidad.toString() || '')
            : ''
        };
      });
      
      addSheet('Usuarios', formattedUsuarios, [
        { header: 'Nombre', key: 'nombre', width: 25, note: 'Nombre del usuario (requerido)' },
        { header: 'Email', key: 'email', width: 30, note: 'Email único del usuario (requerido)' },
        { header: 'Teléfono', key: 'telefono', width: 20, note: 'Teléfono de contacto (opcional)' },
        { header: 'Rol', key: 'rol', width: 15, note: 'admin o usuario (opcional, por defecto: usuario)' },
        { header: 'Especialidad', key: 'especialidad', width: 30, note: 'Nombre de la especialidad (solo para usuarios)' }
      ]);
      
      // Formatear datos de tareas (sin _id)
      const formattedTareas = tareas.map(({ _id, ...tarea }) => ({
        numero: tarea.numero || '',
        titulo: tarea.titulo || '',
        descripcion: tarea.descripcion || '',
        estado: tarea.estado || 'pendiente',
        cliente: tarea.cliente || '',
        numeroTitular: tarea.numeroTitular || '',
        direccion: tarea.direccion || '',
        // Convertir array de técnicos a string de emails
        tecnicos: Array.isArray(tarea.tecnicos) 
          ? tarea.tecnicos.map(t => t.email || t).join(', ')
          : '',
        // Usar email del creador
        creadoPor: tarea.creadoPor ? (tarea.creadoPor.email || tarea.creadoPor) : '',
        // Formatear fechas
        fechaCreacion: tarea.fechaCreacion ? new Date(tarea.fechaCreacion).toISOString() : '',
        fechaEjecucion: tarea.fechaEjecucion ? new Date(tarea.fechaEjecucion).toISOString() : ''
      }));
      
      addSheet('Tareas', formattedTareas, [
        { header: 'Número', key: 'numero', width: 15 },
        { header: 'Título', key: 'titulo', width: 30 },
        { header: 'Descripción', key: 'descripcion', width: 50 },
        { header: 'Estado', key: 'estado', width: 15 },
        { header: 'Técnicos', key: 'tecnicos', width: 40 },
        { header: 'Fecha Creación', key: 'fechaCreacion', width: 20 },
        { header: 'Fecha Ejecución', key: 'fechaEjecucion', width: 20 },
        { header: 'Creado Por', key: 'creadoPor', width: 25 },
        { header: 'Cliente', key: 'cliente', width: 30 },
        { header: 'Teléfono Titular', key: 'numeroTitular', width: 20 },
        { header: 'Dirección', key: 'direccion', width: 40 }
      ]);
      
      // Configurar el response
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=backup_${new Date().toISOString().split('T')[0]}.xlsx`);
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      console.log('Enviando archivo Excel...');
      await workbook.xlsx.write(res);
      res.end();
      console.log('Exportación completada exitosamente');
    } catch (error) {
      console.error('Error al exportar datos:', error);
      if (!res.headersSent) {
        res.status(500).json({ 
          success: false,
          message: 'Error al exportar los datos',
          error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno del servidor',
          type: error.name
        });
      }
    }
  } catch (error) {
    console.error('Error en exportData:', error);
    if (!res.headersSent) {
      res.status(500).json({ 
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno del servidor',
        type: 'InternalServerError'
      });
    }
  }
};

// Exportar a CSV (opcional)
exports.exportToCSV = async (req, res) => {
  try {
    const { tipo } = req.params;
    let data, fields, filename;
    
    switch(tipo) {
      case 'especialidades':
        data = await Especialidad.find({}).lean();
        fields = ['nombre', 'descripcion'];
        filename = 'especialidades';
        break;
      case 'usuarios':
        data = await Usuario.find({}).select('-password').lean();
        fields = ['nombre', 'email', 'telefono', 'rol'];
        filename = 'usuarios';
        break;
      case 'tareas':
        // Solo popular referencias existentes en el esquema
        const tareasRaw = await Tarea.find({})
          .populate('creadoPor', 'nombre email')
          .populate('tecnicos', 'nombre email')
          .lean();
        // Mapear a objetos planos adecuados para CSV
        data = tareasRaw.map(t => ({
          numero: t.numero || '',
          titulo: t.titulo || '',
          descripcion: t.descripcion || '',
          estado: t.estado || 'pendiente',
          cliente: t.cliente || '',
          direccion: t.direccion || '',
          fechaCreacion: t.fechaCreacion ? new Date(t.fechaCreacion).toISOString() : '',
          fechaEjecucion: t.fechaEjecucion ? new Date(t.fechaEjecucion).toISOString() : '',
          creadoPor: t.creadoPor ? (t.creadoPor.email || t.creadoPor.nombre || '') : '',
          tecnicos: Array.isArray(t.tecnicos) ? t.tecnicos.map(te => te.email || te.nombre || '').join(', ') : ''
        }));
        fields = [
          'numero', 'titulo', 'descripcion', 'estado',
          'cliente', 'direccion', 'fechaCreacion', 'fechaEjecucion',
          'creadoPor', 'tecnicos'
        ];
        filename = 'tareas';
        break;
      default:
        return res.status(400).json({ message: 'Tipo de exportación no válido' });
    }
    
    const json2csv = new Parser({ fields, withBOM: true });
    const csv = json2csv.parse(data);
    
    // Configurar los headers correctamente
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}_${new Date().toISOString().split('T')[0]}.csv"`);
    
    // Enviar el CSV como un buffer
    res.status(200).send(Buffer.from('\uFEFF' + csv, 'utf-8'));
  } catch (error) {
    console.error('Error al exportar a CSV:', error);
    res.status(500).json({ message: 'Error al exportar los datos' });
  }
};
