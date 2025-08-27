# Solución: Tareas del Worker que Desaparecen del Calendario

## Problema Identificado

Las tareas importadas desde el worker de WhatsApp aparecían momentáneamente en el calendario y luego desaparecían cuando se realizaban ciertas acciones como cambiar de mes o aplicar filtros.

## Causa del Problema

El problema estaba en el manejo del estado en Redux. En el archivo `tasksSlice.ts`, cuando se llamaba a `fetchCalendarTasks`, se reemplazaba completamente el array de tareas en el estado:

```typescript
.addCase(fetchCalendarTasks.fulfilled, (state, action) => {
  state.tasks = action.payload;
});
```

Esto causaba que cada vez que se cambiaba de mes o se aplicaba un filtro, se perdieran las tareas del worker que ya estaban cargadas en el estado.

## Solución Implementada

### 1. Actualización del tipo Task

Se añadió la propiedad `origen` a la interfaz `Task` para poder identificar explícitamente las tareas provenientes del worker de WhatsApp:

```typescript
export interface Task {
  // ... propiedades existentes
  origen?: 'manual' | 'whatsapp' | string;
}
```

### 2. Modificación del manejo de tareas en Redux

Se modificó el manejo de tareas en `tasksSlice.ts` para:

```typescript
.addCase(fetchCalendarTasks.fulfilled, (state, action) => {
  state.loading = false;
  
  // Identificar tareas del worker por origen o por formato de fecha
  const workerTasks = state.tasks.filter(task => {
    // Si tiene origen explícito 'whatsapp'
    if (task.origen === 'whatsapp') return true;
    
    // Si no tiene origen pero tiene formato de fecha YYYY-MM-DD (típico del worker)
    if (task.fechaEjecucion && 
        typeof task.fechaEjecucion === 'string' && 
        /^\d{4}-\d{2}-\d{2}$/.test(task.fechaEjecucion)) {
      return true;
    }
    
    return false;
  });
  
  // Obtener las nuevas tareas que no son del worker
  const newNonWorkerTasks = action.payload.filter(task => {
    // Si tiene origen explícito diferente a 'whatsapp'
    if (task.origen && task.origen !== 'whatsapp') return true;
    
    // Si no tiene origen pero tampoco tiene el formato de fecha típico del worker
    if (!task.origen && 
        (!task.fechaEjecucion || 
         typeof task.fechaEjecucion !== 'string' || 
         !/^\d{4}-\d{2}-\d{2}$/.test(task.fechaEjecucion))) {
      return true;
    }
    
    // Si la tarea ya existe en workerTasks, no la incluimos aquí
    return !workerTasks.some(wTask => wTask._id === task._id);
  });
  
  // Combinar las tareas del worker existentes con las nuevas tareas no-worker
  state.tasks = [...workerTasks, ...newNonWorkerTasks];
  
  console.log(`Manteniendo ${workerTasks.length} tareas del worker y añadiendo ${newNonWorkerTasks.length} tareas nuevas`);
});
```

### 3. Logs de Depuración en TaskCalendar

Se añadieron logs de depuración en el componente `TaskCalendar` para:

1. Verificar cuántas tareas del worker hay en el estado
2. Detectar posibles duplicados de tareas
3. Mostrar información detallada sobre las tareas del worker que se están procesando

## Cómo Funciona la Solución

1. Cuando se cargan las tareas del calendario, se identifican las tareas del worker existentes en el estado actual.
2. Se filtran las nuevas tareas recibidas para excluir aquellas que ya existen como tareas del worker.
3. Se combinan ambos conjuntos de tareas para mantener las tareas del worker mientras se actualizan las demás.

La identificación de tareas del worker se realiza de dos maneras:
- Por la propiedad `origen` con valor 'whatsapp'
- Por el formato de fecha YYYY-MM-DD (típico del worker) cuando no hay origen explícito

## Verificación de la Solución

Para verificar que la solución funciona correctamente:

1. Observar los logs en la consola del navegador que muestran:
   - Cuántas tareas del worker se mantienen en cada actualización
   - Si hay tareas duplicadas
   - Detalles de las tareas del worker que se están procesando

2. Comprobar visualmente que las tareas del worker permanecen en el calendario al:
   - Cambiar de mes
   - Aplicar filtros
   - Recargar la página

## Consideraciones Adicionales

- Esta solución mantiene las tareas del worker en el estado de Redux mientras se navega por el calendario.
- Se ha implementado una detección robusta de tareas del worker basada tanto en el origen explícito como en el formato de fecha.
- Se evita la duplicación de tareas verificando los IDs antes de combinar los conjuntos.
