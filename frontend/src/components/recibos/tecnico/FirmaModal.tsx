import React, { useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { useAppDispatch } from '../../../store';
import { firmarRecibo } from '../../../store/slices/recibosSlice';
import type { Recibo } from '../../../types';
import { toast } from 'react-toastify';
import { X, RotateCcw, Check } from 'lucide-react';

interface FirmaModalProps {
  recibo: Recibo;
  onClose: () => void;
}

const FirmaModal: React.FC<FirmaModalProps> = ({ recibo, onClose }) => {
  const sigCanvas = useRef<SignatureCanvas>(null);
  const [isSigning, setIsSigning] = useState(false);
  const dispatch = useAppDispatch();

  const handleSign = async () => {
    if (!sigCanvas.current) return;

    const canvas = sigCanvas.current.getCanvas();
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    // Get the canvas dimensions
    const { width, height } = canvas;
    
    // Create a temporary canvas to hold the trimmed signature
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    // Get the image data
    const imageData = ctx.getImageData(0, 0, width, height);
    const { data } = imageData;
    
    // Find the boundaries of the signature
    let top = height;
    let left = width;
    let right = 0;
    let bottom = 0;

    // Find the bounding box of the signature
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        if (data[i + 3] > 0) { // Non-transparent pixel
          if (y < top) top = y;
          if (x < left) left = x;
          if (x > right) right = x;
          if (y > bottom) bottom = y;
        }
      }
    }

    // Add some padding
    const padding = 10;
    top = Math.max(0, top - padding);
    left = Math.max(0, left - padding);
    right = Math.min(width, right + padding);
    bottom = Math.min(height, bottom + padding);

    // Check if there's a signature
    if (right <= left || bottom <= top) {
      toast.error('Por favor, realice una firma antes de continuar');
      return;
    }

    // Set the dimensions of the temporary canvas
    const croppedWidth = right - left;
    const croppedHeight = bottom - top;
    tempCanvas.width = croppedWidth;
    tempCanvas.height = croppedHeight;

    // Draw the cropped signature on the temporary canvas
    tempCtx.putImageData(
      ctx.getImageData(left, top, croppedWidth, croppedHeight),
      0,
      0
    );

    try {
      setIsSigning(true);
      // Convert to blob
      const blob = await new Promise<Blob | null>((resolve) => {
        tempCanvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            resolve(null);
          }
        }, 'image/png');
      });

      if (!blob) {
        throw new Error('No se pudo generar la imagen de la firma');
      }

      // Create FormData
      const formData = new FormData();
      formData.append('firma', blob, 'firma.png');

      // Dispatch the action
      await dispatch(firmarRecibo({ 
        reciboId: recibo._id, 
        formData 
      })).unwrap();
      
      toast.success('Recibo firmado exitosamente');
      onClose();
    } catch (error) {
      console.error('Error al firmar el recibo:', error);
      toast.error('Error al firmar el recibo. Por favor, intente nuevamente.');
    } finally {
      setIsSigning(false);
    }
  };

  const handleClear = () => {
    if (sigCanvas.current) {
      sigCanvas.current.clear();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Firmar Recibo
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors"
              disabled={isSigning}
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          
          <div className="mb-6">
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              Firma en el área inferior para confirmar la recepción del recibo de sueldo de {recibo.mes}/{recibo.anio}
            </p>
            
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg bg-gray-900 p-4">
              <SignatureCanvas
                ref={sigCanvas}
                penColor="#000000" // White pen for better contrast
                backgroundColor="#FFFFFF" // Black background
                canvasProps={{
                  className: 'w-full h-48 bg-black rounded-md shadow-inner'
                }}
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-3">
            <button
              type="button"
              onClick={handleClear}
              disabled={isSigning}
              className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
            >
              <RotateCcw className="h-4 w-4" />
              Limpiar
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isSigning}
              className="px-4 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSign}
              disabled={isSigning}
              className="flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSigning ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Procesando...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Confirmar Firma
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FirmaModal;