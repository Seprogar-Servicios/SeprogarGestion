const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Asegurar que los directorios existan
const ensureDirectoryExists = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// Configuración para diferentes tipos de archivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = 'uploads/';
    
    if (file.fieldname === 'fotos') {
      uploadPath = 'uploads/consorcio/fotos/';
    } else if (file.fieldname === 'comprobante') {
      uploadPath = 'uploads/consorcio/comprobantes/';
    }
    
    ensureDirectoryExists(uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generar nombre único con timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, name + '-' + uniqueSuffix + ext);
  }
});

// Filtro de archivos
const fileFilter = (req, file, cb) => {
  const allowedTypes = {
    fotos: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
    comprobante: ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']
  };

  const allowedMimes = allowedTypes[file.fieldname] || [];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Tipo de archivo no permitido para ${file.fieldname}. Permitidos: ${allowedMimes.join(', ')}`), false);
  }
};

// Configuración de multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: (req, file) => {
      if (file.fieldname === 'fotos') {
        return 5 * 1024 * 1024; // 5MB por foto
      } else if (file.fieldname === 'comprobante') {
        return 10 * 1024 * 1024; // 10MB para comprobante
      }
      return 5 * 1024 * 1024; // Default 5MB
    }
  }
});

// Middleware para manejar errores de multer
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        message: 'Archivo demasiado grande',
        error: error.message
      });
    } else if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        message: 'Demasiados archivos',
        error: error.message
      });
    } else if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        message: 'Campo de archivo no esperado',
        error: error.message
      });
    }
  }
  
  if (error.message && error.message.includes('Tipo de archivo no permitido')) {
    return res.status(400).json({
      message: error.message
    });
  }
  
  next(error);
};

module.exports = {
  // Para múltiples fotos
  array: (fieldName, maxCount = 10) => {
    return upload.array(fieldName, maxCount);
  },
  // Para comprobante único
  single: (fieldName) => {
    return upload.single(fieldName);
  },
  // Middleware de manejo de errores
  handleUploadError
};
