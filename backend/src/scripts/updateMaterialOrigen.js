const mongoose = require('mongoose');
const Tarea = require('../models/Tarea');
const Material = require('../models/Material');

require('dotenv').config();

async function updateMaterialOrigen() {
  try {
    // Conectar a MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/futurgas');
    console.log('Conectado a MongoDB');

    // Actualizar materiales que no tienen campo origen
    const materialesActualizados = await Material.updateMany(
      { origen: { $exists: false } },
      { $set: { origen: 'stock' } }
    );
    console.log(`Materiales actualizados: ${materialesActualizados.modifiedCount}`);

    // Buscar todas las tareas
    const tareas = await Tarea.find({});
    console.log(`Encontradas ${tareas.length} tareas`);

    let materialesTareaActualizados = 0;

    for (const tarea of tareas) {
      let tareaModificada = false;

      // Actualizar materiales de la tarea
      for (const material of tarea.materialesTarea) {
        // Si tiene referencia a material y no tiene origen, usar el origen del material
        if (material.material && !material.origen) {
          const materialRef = await Material.findById(material.material);
          if (materialRef && materialRef.origen) {
            material.origen = materialRef.origen;
            tareaModificada = true;
            materialesTareaActualizados++;
            console.log(`Material de tarea actualizado: ${material.nombre} - Origen: ${materialRef.origen}`);
          } else {
            // Si no tiene origen el material, poner stock por defecto
            material.origen = 'stock';
            tareaModificada = true;
            materialesTareaActualizados++;
            console.log(`Material de tarea actualizado (default): ${material.nombre} - Origen: stock`);
          }
        }
        // Si no tiene referencia a material y no tiene origen, poner excedente por defecto
        else if (!material.material && !material.origen) {
          material.origen = 'excedente';
          tareaModificada = true;
          materialesTareaActualizados++;
          console.log(`Material de tarea actualizado (manual): ${material.nombre} - Origen: excedente`);
        }
      }

      if (tareaModificada) {
        await tarea.save();
        console.log(`Tarea ${tarea.numero} actualizada`);
      }
    }

    console.log(`Total de materiales de tarea actualizados: ${materialesTareaActualizados}`);
    console.log('Actualización completada exitosamente');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

updateMaterialOrigen();
