const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticateToken, authorizeRoles } = require('../middlewares/auth');
const dataExportController = require('../controllers/dataExport.controller');
const dataImportController = require('../controllers/dataImport.controller');

// Configuración de multer para manejar la subida de archivos
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // Límite de 5MB
    files: 1
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
        file.mimetype === 'application/vnd.ms-excel') {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos Excel (.xlsx, .xls)'), false);
    }
  }
});

// Rutas de exportación
router.get('/export/template', 
  authenticateToken,
  dataExportController.downloadTemplate
);

router.get('/export', 
  authenticateToken,
  dataExportController.exportData
);

router.get('/export/:tipo', 
  authenticateToken,
  dataExportController.exportToCSV
);

// Rutas de importación
router.post('/import/validate', 
  authenticateToken,
  authorizeRoles('admin'), // Remove the array brackets to pass 'admin' as a string
  upload.single('file'),
  dataImportController.validateImportFile
);

router.post('/import', 
  authenticateToken,
  authorizeRoles('admin'),
  upload.single('file'),
  dataImportController.importData
);

module.exports = router;
