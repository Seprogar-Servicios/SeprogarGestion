# Optimización de Memoria para WhatsApp Worker (512MB RAM)

## Configuraciones Implementadas

### 1. Monitoreo de Memoria
- **Métricas cada 30 segundos**: Heap, RSS, memoria del sistema
- **Alertas automáticas** al 70% de uso
- **Garbage collection forzado** cuando la memoria es alta
- **Alerta crítica** al 85% para reinicio manual

### 2. Optimización de Código
- **Límite de mensajes**: Reducido a 1000 caracteres
- **Liberación de memoria**: Variables nulleadas después de uso
- **Procesamiento secuencial**: p-queue con concurrency=1

### 3. Configuración de Node.js
- **Heap máximo**: 384MB (75% de 512MB)
- **Garbage collector expuesto**: `--expose-gc`
- **Scripts optimizados**:
  ```bash
  npm run start:memory  # Producción
  npm run dev:memory    # Desarrollo
  ```

### 4. Manejo de Errores
- **Reinicio controlado** en excepciones no capturadas
- **Shutdown graceful** en SIGTERM/SIGINT
- **Logging de memoria** en errores críticos

## Uso en Producción

### Render.com
```bash
# En Render, usar el comando de inicio optimizado:
node --max-old-space-size=384 --expose-gc index.js
```

### Docker
```dockerfile
CMD ["node", "--max-old-space-size=384", "--expose-gc", "index.js"]
```

### Variables de Entorno
```env
NODE_OPTIONS=--max-old-space-size=384
```

## Monitoreo

Los logs mostrarán:
```
📊 Memory Usage: { heap: "45MB / 128MB", system: "320MB / 512MB (62%)", external: "12MB", rss: "89MB" }
⚠️  High memory usage detected! { usage: "72%", threshold: "70%" }
🧹 Forced garbage collection
```

## Recomendaciones

1. **Usar `start:memory`** en producción
2. **Monitorear logs** de memoria
3. **Reiniciar servicio** si aparece alerta crítica
4. **Considerar upgrade** a 1GB si el uso persiste >80%

## Métricas Clave

- **Normal**: <70% uso de memoria
- **Precaución**: 70-85% (GC forzado)
- **Crítico**: >85% (considerar reinicio)
- **Heap limit**: 384MB máximo
