#!/bin/bash

# Mostrar información del entorno
echo "Iniciando WhatsApp Worker en entorno: $NODE_ENV"
echo "Directorio actual: $(pwd)"

# Configurar opciones de Node.js para optimizar memoria (512MB RAM)
export NODE_OPTIONS="--max-old-space-size=384"

# Descomprimir sesión desde variable de entorno si existe
if [ -n "$WWEBJS_AUTH_ZIP_BASE64" ]; then
  echo "🔄 Encontrada variable de entorno con sesión. Descomprimiendo..."
  echo "$WWEBJS_AUTH_ZIP_BASE64" | base64 -d > wwebjs_auth.zip
  mkdir -p ./.wwebjs_auth
  unzip -o wwebjs_auth.zip -d ./
  rm wwebjs_auth.zip
  chmod -R 777 ./.wwebjs_auth
  echo "✅ Sesión descomprimida correctamente"
fi

# Verificar si existe la carpeta .wwebjs_auth con contenido
if [ -d "./.wwebjs_auth" ] && [ "$(ls -A ./.wwebjs_auth)" ]; then
  echo "✅ Carpeta de sesión encontrada, iniciando aplicación con optimizaciones de memoria..."
  # Asegurar permisos correctos
  chmod -R 777 ./.wwebjs_auth
  node --expose-gc index.js
else
  echo "❌ No se encontró una sesión válida."
  echo "⚠️ Debes generar primero una sesión localmente con 'node bot.js'"
  echo "⚠️ y luego subir la carpeta .wwebjs_auth completa a este servidor."
  
  # Crear estructura de carpetas por si acaso
  mkdir -p ./.wwebjs_auth
  chmod -R 777 ./.wwebjs_auth
  
  echo "🔄 Intentando iniciar la aplicación de todos modos con optimizaciones de memoria..."
  echo "🚨 Es posible que se genere un código QR que necesites escanear."
  node --expose-gc index.js
fi
