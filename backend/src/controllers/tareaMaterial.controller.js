const Tarea = require('../models/Tarea');
const Material = require('../models/Material');
const TareaLiquidacion = require('../models/TareaLiquidacion');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configuración de multer para upload de comprobantes
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/comprobantes';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes (jpeg, jpg, png) y PDF'));
    }
  }
});

// Obtener materiales de una tarea
const getMaterialesTarea = async (req, res) => {
  try {
    const { tareaId } = req.params;
    const tarea = await Tarea.findById(tareaId).populate('materialesTarea.material').populate('materialesTarea.tecnico');

    if (!tarea) {
      return res.status(404).json({
        success: false,
        message: 'Tarea no encontrada'
      });
    }

    res.json({
      success: true,
      data: tarea.materialesTarea || []
    });
  } catch (error) {
    console.error('Error obteniendo materiales de tarea:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener materiales de la tarea'
    });
  }
};

// Agregar material a tarea (Admin - desde lista existente)
const agregarMaterialAdmin = async (req, res) => {
  try {
    const { tareaId } = req.params;
    const { materialId, cantidad } = req.body;

    // Validar tarea
    const tarea = await Tarea.findById(tareaId);
    if (!tarea) {
      return res.status(404).json({
        success: false,
        message: 'Tarea no encontrada'
      });
    }

    // Validar material
    const material = await Material.findById(materialId);
    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'Material no encontrado'
      });
    }

    // Validar stock disponible
    const stockDisponible = parseInt(material.cantidad || '0');
    if (cantidad > stockDisponible) {
      return res.status(400).json({
        success: false,
        message: `Stock insuficiente. El material tiene ${stockDisponible} ${material.unidad} disponibles y estás intentando agregar ${cantidad}.`
      });
    }

    // Descontar del stock del material
    material.cantidad = (parseInt(material.cantidad || '0') - cantidad).toString();
    await material.save();

    // Agregar material a tarea
    const nuevoMaterialTarea = {
      material: materialId,
      nombre: material.nombre,
      descripcion: material.descripcion || '',
      cantidad: cantidad || 1,
      unidad: material.unidad,
      precio: material.precio || 0,
      origen: material.origen || 'stock',
      agregadoPor: 'admin',
      observaciones: req.body.observaciones || ''
    };

    tarea.materialesTarea.push(nuevoMaterialTarea);
    await tarea.save();

    // Actualizar liquidación
    await actualizarLiquidacion(tareaId);

    const tareaActualizada = await Tarea.findById(tareaId).populate('materialesTarea.material');

    res.json({
      success: true,
      data: tareaActualizada.materialesTarea,
      message: 'Material agregado exitosamente'
    });
  } catch (error) {
    console.error('Error agregando material:', error);
    res.status(500).json({
      success: false,
      message: 'Error al agregar material a la tarea'
    });
  }
};

// Agregar múltiples materiales a tarea (Admin)
const agregarMultiplesMaterialesAdmin = async (req, res) => {
  try {
    const { tareaId } = req.params;
    const { materiales } = req.body; // Array de { materialId, cantidad, observaciones }

    // Validar tarea
    const tarea = await Tarea.findById(tareaId);
    if (!tarea) {
      return res.status(404).json({
        success: false,
        message: 'Tarea no encontrada'
      });
    }

    // Validar y agregar cada material
    const materialesAgregados = [];
    const errores = [];

    for (const item of materiales) {
      try {
        // Verificar si el material ya existe en la tarea
        const yaExiste = tarea.materialesTarea.some(m => m.material && m.material.toString() === item.materialId);
        if (yaExiste) {
          errores.push(`El material ya está en la tarea`);
          continue;
        }

        // Validar material
        const material = await Material.findById(item.materialId);
        if (!material) {
          errores.push(`Material no encontrado: ${item.materialId}`);
          continue;
        }

        // Validar stock
        const stockDisponible = parseInt(material.cantidad || '0');
        if (item.cantidad > stockDisponible) {
          errores.push(`Stock insuficiente para ${material.nombre}: ${stockDisponible} disponibles, ${item.cantidad} solicitados`);
          continue;
        }

        // Descontar del stock del material
        material.cantidad = (parseInt(material.cantidad || '0') - item.cantidad).toString();
        await material.save();

        // Agregar material a tarea
        const nuevoMaterialTarea = {
          material: item.materialId,
          nombre: material.nombre,
          descripcion: material.descripcion || '',
          cantidad: item.cantidad || 1,
          unidad: material.unidad,
          precio: material.precio || 0,
          origen: material.origen || 'stock',
          agregadoPor: 'admin',
          observaciones: item.observaciones || ''
        };

        tarea.materialesTarea.push(nuevoMaterialTarea);
        materialesAgregados.push(nuevoMaterialTarea);
      } catch (error) {
        console.error('Error agregando material:', error);
        errores.push(`Error al agregar material: ${item.materialId}`);
      }
    }

    await tarea.save();

    // Actualizar liquidación
    await actualizarLiquidacion(tareaId);

    const tareaActualizada = await Tarea.findById(tareaId).populate('materialesTarea.material');

    res.json({
      success: true,
      data: tareaActualizada.materialesTarea,
      message: `${materialesAgregados.length} materiales agregados exitosamente`,
      errores: errores.length > 0 ? errores : undefined
    });
  } catch (error) {
    console.error('Error agregando múltiples materiales:', error);
    res.status(500).json({
      success: false,
      message: 'Error al agregar múltiples materiales a la tarea'
    });
  }
};

// Agregar material a tarea (Técnico - manual con comprobante)
const agregarMaterialTecnico = async (req, res) => {
  try {
    const { tareaId } = req.params;
    const { nombre, descripcion, cantidad, unidad, precio, observaciones } = req.body;
    const userId = req.user._id;

    // Validar tarea
    const tarea = await Tarea.findById(tareaId);
    if (!tarea) {
      return res.status(404).json({
        success: false,
        message: 'Tarea no encontrada'
      });
    }

    // Validar que el usuario sea técnico de la tarea
    const esTecnicoAsignado = tarea.tecnicos.some(tec => tec.toString() === userId.toString());
    if (!esTecnicoAsignado) {
      return res.status(403).json({
        success: false,
        message: 'No eres técnico asignado a esta tarea'
      });
    }

    // Validar que se haya subido comprobante
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Debe subir un comprobante'
      });
    }

    // Agregar material a tarea
    const nuevoMaterialTarea = {
      nombre,
      descripcion: descripcion || '',
      cantidad: cantidad || 1,
      unidad: unidad || 'un',
      precio: precio || 0,
      origen: 'excedente',
      agregadoPor: 'tecnico',
      tecnico: userId,
      comprobante: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        path: req.file.path,
        mimetype: req.file.mimetype,
        size: req.file.size,
        uploadDate: new Date()
      },
      estadoValidacion: 'pendiente',
      observaciones: observaciones || ''
    };

    tarea.materialesTarea.push(nuevoMaterialTarea);
    await tarea.save();

    const tareaActualizada = await Tarea.findById(tareaId).populate('materialesTarea.material').populate('materialesTarea.tecnico');

    res.json({
      success: true,
      data: tareaActualizada.materialesTarea,
      message: 'Material agregado exitosamente, pendiente de validación'
    });
  } catch (error) {
    console.error('Error agregando material técnico:', error);
    res.status(500).json({
      success: false,
      message: 'Error al agregar material a la tarea'
    });
  }
};

// Agregar múltiples materiales a tarea (Técnico - desde lista existente)
const agregarMultiplesMaterialesTecnico = async (req, res) => {
  try {
    const { tareaId } = req.params;
    const { materiales } = req.body;
    const userId = req.user._id;

    // Validar tarea
    const tarea = await Tarea.findById(tareaId);
    if (!tarea) {
      return res.status(404).json({
        success: false,
        message: 'Tarea no encontrada'
      });
    }

    // Validar que el usuario sea técnico de la tarea
    const esTecnicoAsignado = tarea.tecnicos.some(tec => tec.toString() === userId.toString());
    if (!esTecnicoAsignado) {
      return res.status(403).json({
        success: false,
        message: 'No eres técnico asignado a esta tarea'
      });
    }

    if (!materiales || !Array.isArray(materiales) || materiales.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Debe proporcionar al menos un material'
      });
    }

    const materialesAgregados = [];
    const errores = [];

    for (const item of materiales) {
      try {
        const { materialId, cantidad, observaciones } = item;

        // Validar material
        const material = await Material.findById(materialId);
        if (!material) {
          errores.push(`Material no encontrado: ${materialId}`);
          continue;
        }

        // Validar stock disponible
        const stockDisponible = parseInt(material.cantidad || '0');
        if (cantidad > stockDisponible) {
          errores.push(`Stock insuficiente para ${material.nombre}: ${stockDisponible} disponibles, ${cantidad} solicitados`);
          continue;
        }

        // Verificar si ya existe en la tarea
        const yaExiste = tarea.materialesTarea.some(m => 
          m.material?.toString() === materialId.toString()
        );
        if (yaExiste) {
          errores.push(`El material ${material.nombre} ya está en la tarea`);
          continue;
        }

        // Descontar del stock del material
        material.cantidad = (parseInt(material.cantidad || '0') - cantidad).toString();
        await material.save();

        // Agregar material a tarea
        const nuevoMaterialTarea = {
          material: materialId,
          nombre: material.nombre,
          descripcion: material.descripcion || '',
          cantidad: cantidad || 1,
          unidad: material.unidad,
          precio: material.precio || 0,
          origen: material.origen || 'stock',
          agregadoPor: 'tecnico',
          tecnico: userId,
          estadoValidacion: 'aprobado',
          observaciones: observaciones || ''
        };

        tarea.materialesTarea.push(nuevoMaterialTarea);
        materialesAgregados.push(material.nombre);
      } catch (error) {
        console.error('Error agregando material:', error);
        errores.push(`Error al agregar material: ${item.materialId}`);
      }
    }

    await tarea.save();

    // Actualizar liquidación
    await actualizarLiquidacion(tareaId);

    const tareaActualizada = await Tarea.findById(tareaId).populate('materialesTarea.material');

    res.json({
      success: true,
      data: tareaActualizada.materialesTarea,
      message: `${materialesAgregados.length} materiales agregados exitosamente`,
      errores: errores.length > 0 ? errores : undefined
    });
  } catch (error) {
    console.error('Error agregando múltiples materiales técnico:', error);
    res.status(500).json({
      success: false,
      message: 'Error al agregar múltiples materiales a la tarea'
    });
  }
};
const agregarMaterialTecnicoDesdeLista = async (req, res) => {
  try {
    const { tareaId } = req.params;
    const { materialId, cantidad } = req.body;
    const userId = req.user._id;

    // Validar tarea
    const tarea = await Tarea.findById(tareaId);
    if (!tarea) {
      return res.status(404).json({
        success: false,
        message: 'Tarea no encontrada'
      });
    }

    // Validar que el usuario sea técnico de la tarea
    const esTecnicoAsignado = tarea.tecnicos.some(tec => tec.toString() === userId.toString());
    if (!esTecnicoAsignado) {
      return res.status(403).json({
        success: false,
        message: 'No eres técnico asignado a esta tarea'
      });
    }

    // Validar material
    const material = await Material.findById(materialId);
    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'Material no encontrado'
      });
    }

    // Validar stock disponible
    const stockDisponible = parseInt(material.cantidad || '0');
    if (cantidad > stockDisponible) {
      return res.status(400).json({
        success: false,
        message: `Stock insuficiente. El material tiene ${stockDisponible} ${material.unidad} disponibles y estás intentando agregar ${cantidad}.`
      });
    }

    // Descontar del stock del material
    material.cantidad = (parseInt(material.cantidad || '0') - cantidad).toString();
    await material.save();

    // Agregar material a tarea
    const nuevoMaterialTarea = {
      material: materialId,
      nombre: material.nombre,
      descripcion: material.descripcion || '',
      cantidad: cantidad || 1,
      unidad: material.unidad,
      precio: material.precio || 0,
      origen: material.origen || 'stock',
      agregadoPor: 'tecnico',
      tecnico: userId,
      estadoValidacion: 'aprobado',
      observaciones: req.body.observaciones || ''
    };

    tarea.materialesTarea.push(nuevoMaterialTarea);
    await tarea.save();

    // Actualizar liquidación
    await actualizarLiquidacion(tareaId);

    const tareaActualizada = await Tarea.findById(tareaId).populate('materialesTarea.material').populate('materialesTarea.tecnico');

    res.json({
      success: true,
      data: tareaActualizada.materialesTarea,
      message: 'Material agregado exitosamente desde el stock'
    });
  } catch (error) {
    console.error('Error agregando material técnico desde lista:', error);
    res.status(500).json({
      success: false,
      message: 'Error al agregar material a la tarea'
    });
  }
};

// Actualizar material de tarea
const actualizarMaterialTarea = async (req, res) => {
  try {
    const { tareaId, materialId } = req.params;
    const { cantidad, precio, observaciones } = req.body;
    const userId = req.user._id;
    const userRole = req.user.rol;

    const tarea = await Tarea.findById(tareaId);
    if (!tarea) {
      return res.status(404).json({
        success: false,
        message: 'Tarea no encontrada'
      });
    }

    const materialTarea = tarea.materialesTarea.id(materialId);
    if (!materialTarea) {
      return res.status(404).json({
        success: false,
        message: 'Material no encontrado en la tarea'
      });
    }

    // Validar permisos
    if (userRole !== 'admin') {
      // Si es técnico, solo puede modificar materiales que él agregó
      if (materialTarea.agregadoPor === 'admin') {
        return res.status(403).json({
          success: false,
          message: 'No puedes modificar materiales agregados por el administrador'
        });
      }
      if (materialTarea.tecnico.toString() !== userId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'No puedes modificar materiales agregados por otro técnico'
        });
      }
    }

    // Actualizar campos
    if (cantidad !== undefined) materialTarea.cantidad = cantidad;
    if (precio !== undefined) materialTarea.precio = precio;
    if (observaciones !== undefined) materialTarea.observaciones = observaciones;

    await tarea.save();

    // Actualizar liquidación
    await actualizarLiquidacion(tareaId);

    const tareaActualizada = await Tarea.findById(tareaId).populate('materialesTarea.material');

    res.json({
      success: true,
      data: tareaActualizada.materialesTarea,
      message: 'Material actualizado exitosamente'
    });
  } catch (error) {
    console.error('Error actualizando material:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar material'
    });
  }
};

// Eliminar material de tarea
const eliminarMaterialTarea = async (req, res) => {
  try {
    const { tareaId, materialId } = req.params;
    const userId = req.user._id;
    const userRole = req.user.rol;

    const tarea = await Tarea.findById(tareaId);
    if (!tarea) {
      return res.status(404).json({
        success: false,
        message: 'Tarea no encontrada'
      });
    }

    const materialTarea = tarea.materialesTarea.id(materialId);
    if (!materialTarea) {
      return res.status(404).json({
        success: false,
        message: 'Material no encontrado en la tarea'
      });
    }

    // Validar permisos
    if (userRole !== 'admin') {
      // Si es técnico, solo puede eliminar materiales que él agregó
      if (materialTarea.agregadoPor === 'admin') {
        return res.status(403).json({
          success: false,
          message: 'No puedes eliminar materiales agregados por el administrador'
        });
      }
      if (materialTarea.tecnico.toString() !== userId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'No puedes eliminar materiales agregados por otro técnico'
        });
      }
    }

    // Si el material fue tomado del stock, devolver la cantidad al stock
    if (materialTarea.origen === 'stock' && materialTarea.material) {
      const material = await Material.findById(materialTarea.material);
      if (material) {
        const cantidadActual = parseInt(material.cantidad || '0');
        const cantidadADevolver = parseInt(materialTarea.cantidad || '0');
        material.cantidad = (cantidadActual + cantidadADevolver).toString();
        await material.save();
      }
    }

    // Eliminar comprobante si existe
    if (materialTarea.comprobante && materialTarea.comprobante.path) {
      fs.unlink(materialTarea.comprobante.path, (err) => {
        if (err) console.error('Error eliminando comprobante:', err);
      });
    }

    tarea.materialesTarea.pull(materialId);
    await tarea.save();

    // Actualizar liquidación
    await actualizarLiquidacion(tareaId);

    res.json({
      success: true,
      message: 'Material eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error eliminando material:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar material'
    });
  }
};

// Validar comprobante (Admin)
const validarComprobante = async (req, res) => {
  try {
    const { tareaId, materialId } = req.params;
    const { estadoValidacion, observacionesValidacion } = req.body;
    const userId = req.user._id;

    // Solo admin puede validar
    if (req.user.rol !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Solo el administrador puede validar comprobantes'
      });
    }

    const tarea = await Tarea.findById(tareaId);
    if (!tarea) {
      return res.status(404).json({
        success: false,
        message: 'Tarea no encontrada'
      });
    }

    const materialTarea = tarea.materialesTarea.id(materialId);
    if (!materialTarea) {
      return res.status(404).json({
        success: false,
        message: 'Material no encontrado en la tarea'
      });
    }

    // Validar que sea un material de técnico
    if (materialTarea.agregadoPor !== 'tecnico') {
      return res.status(400).json({
        success: false,
        message: 'Solo se pueden validar comprobantes de materiales agregados por técnicos'
      });
    }

    // Actualizar estado de validación
    materialTarea.estadoValidacion = estadoValidacion;
    materialTarea.fechaValidacion = new Date();
    materialTarea.validadoPor = userId;
    if (observacionesValidacion) {
      materialTarea.observaciones = observacionesValidacion;
    }

    await tarea.save();

    // Actualizar liquidación
    await actualizarLiquidacion(tareaId);

    const tareaActualizada = await Tarea.findById(tareaId).populate('materialesTarea.material').populate('materialesTarea.tecnico');

    res.json({
      success: true,
      data: tareaActualizada.materialesTarea,
      message: `Comprobante ${estadoValidacion} exitosamente`
    });
  } catch (error) {
    console.error('Error validando comprobante:', error);
    res.status(500).json({
      success: false,
      message: 'Error al validar comprobante'
    });
  }
};

// Descargar comprobante
const descargarComprobante = async (req, res) => {
  try {
    const { tareaId, materialId } = req.params;

    const tarea = await Tarea.findById(tareaId);
    if (!tarea) {
      return res.status(404).json({
        success: false,
        message: 'Tarea no encontrada'
      });
    }

    const materialTarea = tarea.materialesTarea.id(materialId);
    if (!materialTarea || !materialTarea.comprobante) {
      return res.status(404).json({
        success: false,
        message: 'Comprobante no encontrado'
      });
    }

    res.download(materialTarea.comprobante.path, materialTarea.comprobante.originalName);
  } catch (error) {
    console.error('Error descargando comprobante:', error);
    res.status(500).json({
      success: false,
      message: 'Error al descargar comprobante'
    });
  }
};

// Función auxiliar para actualizar liquidación
const actualizarLiquidacion = async (tareaId) => {
  try {
    const liquidacion = await TareaLiquidacion.findOne({ tarea: tareaId });
    if (liquidacion) {
      const tarea = await Tarea.findById(tareaId).populate('materialesTarea');

      if (tarea && tarea.materialesTarea) {
        // Calcular materiales: suma de materiales agregados por admin
        const materialesAdmin = tarea.materialesTarea
          .filter(m => m.agregadoPor === 'admin')
          .reduce((sum, m) => sum + (m.cantidad * m.precio), 0);

        // Calcular excedente: suma de materiales agregados por técnico que estén aprobados
        const materialesTecnico = tarea.materialesTarea
          .filter(m => m.agregadoPor === 'tecnico' && m.estadoValidacion === 'aprobado')
          .reduce((sum, m) => sum + (m.cantidad * m.precio), 0);

        liquidacion.materiales = materialesAdmin;
        liquidacion.excedente = materialesTecnico;
        await liquidacion.save();
      }
    }
  } catch (error) {
    console.error('Error actualizando liquidación:', error);
  }
};

module.exports = {
  getMaterialesTarea,
  agregarMaterialAdmin,
  agregarMultiplesMaterialesAdmin,
  agregarMaterialTecnico,
  agregarMaterialTecnicoDesdeLista,
  agregarMultiplesMaterialesTecnico,
  actualizarMaterialTarea,
  eliminarMaterialTarea,
  validarComprobante,
  descargarComprobante,
  upload
};
