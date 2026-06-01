require('dotenv').config();
const mongoose = require('mongoose');
const Tarea = require('../src/models/Tarea');
const TareaLiquidacion = require('../src/models/TareaLiquidacion');

async function migrate() {
  try {
    // Conectar a MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Conectado a MongoDB');

    const tareas = await Tarea.find({});
    console.log(`Encontradas ${tareas.length} tareas`);

    let creadas = 0;
    let existentes = 0;
    let errores = 0;

    for (const tarea of tareas) {
      try {
        const existing = await TareaLiquidacion.findOne({ tarea: tarea._id });

        if (!existing) {
          await TareaLiquidacion.create({ tarea: tarea._id });
          creadas++;
          console.log(`✓ Liquidación creada para tarea ${tarea.numero}`);
        } else {
          existentes++;
          console.log(`- Liquidación ya existe para tarea ${tarea.numero}`);
        }
      } catch (error) {
        errores++;
        console.error(`✗ Error creando liquidación para tarea ${tarea.numero}:`, error.message);
      }
    }

    console.log('\n=== RESUMEN ===');
    console.log(`Total tareas: ${tareas.length}`);
    console.log(`Liquidaciones creadas: ${creadas}`);
    console.log(`Liquidaciones ya existentes: ${existentes}`);
    console.log(`Errores: ${errores}`);
    console.log('\nMigración completada');

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error en migración:', error);
    process.exit(1);
  }
}

migrate();
