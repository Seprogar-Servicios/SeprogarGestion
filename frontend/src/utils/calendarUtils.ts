import type { Task } from '../types';

/**
 * Genera un identificador único para un evento de calendario
 */
const generateUID = (): string => {
  return 'futurgas-' + Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
};

/**
 * Convierte una fecha a formato iCalendar (YYYYMMDDTHHMMSS)
 * @param date Fecha a convertir
 * @param timeString Opcional: string con formato de hora (HH:MM)
 * @returns Fecha en formato iCalendar
 */
const formatDateToICS = (date: Date, timeString?: string): string => {
  // Ajustar para la zona horaria de Argentina (UTC-3)
  const adjustedDate = new Date(date);
  adjustedDate.setDate(date.getDate() + 1); // Ajuste de día para compensar problemas de zona horaria
  
  const year = adjustedDate.getFullYear();
  const month = String(adjustedDate.getMonth() + 1).padStart(2, '0');
  const day = String(adjustedDate.getDate()).padStart(2, '0');
  
  // Si hay string de hora, extraer hora y minutos
  let hour = '00';
  let minute = '00';
  
  if (timeString) {
    const timeParts = timeString.split(':');
    if (timeParts.length === 2) {
      hour = timeParts[0].padStart(2, '0');
      minute = timeParts[1].padStart(2, '0');
    }
  }
  
  // No usar Z al final para indicar que es hora local, no UTC
  return `${year}${month}${day}T${hour}${minute}00`;
};

/**
 * Genera el contenido de un archivo .ics para las tareas seleccionadas
 * @param tasks Lista de tareas para incluir en el calendario
 * @returns Contenido del archivo .ics
 */
export const generateICSContent = (tasks: Task[]): string => {
  let icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Futurgas//Gestión de Tareas//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VTIMEZONE',
    'TZID:America/Argentina/Buenos_Aires',
    'TZURL:http://tzurl.org/zoneinfo/America/Argentina/Buenos_Aires',
    'X-LIC-LOCATION:America/Argentina/Buenos_Aires',
    'BEGIN:STANDARD',
    'TZOFFSETFROM:-0300',
    'TZOFFSETTO:-0300',
    'TZNAME:ART',
    'DTSTART:19700101T000000',
    'END:STANDARD',
    'END:VTIMEZONE'
  ];

  tasks.forEach(task => {
    const uid = generateUID();
    const summary = task.titulo;
    const description = task.descripcion || 'Sin descripción';
    
    // Determinar fecha de inicio y fin
    let startDate: string;
    let endDate: string;
    
    if (task.fechaEjecucion) {
      const date = new Date(task.fechaEjecucion);
      
      // Si hay franja horaria, extraer hora de inicio y fin
      if (task.franja_horaria && task.franja_horaria.includes('-')) {
        const [startTime, endTime] = task.franja_horaria.split('-');
        
        // Usar la hora de inicio de la franja horaria
        startDate = formatDateToICS(date, startTime.trim());
        
        // Usar la hora de fin de la franja horaria
        endDate = formatDateToICS(date, endTime.trim());
      } else {
        // Si no hay franja horaria o no tiene el formato correcto
        startDate = formatDateToICS(date);
        endDate = startDate;
      }
    } else {
      // Si no hay fecha de ejecución, usar la fecha actual
      const now = new Date();
      startDate = formatDateToICS(now);
      endDate = startDate;
    }
    
    // Crear evento
    icsContent = [
      ...icsContent,
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${formatDateToICS(new Date())}`,
      `DTSTART;TZID=America/Argentina/Buenos_Aires:${startDate}`,
      `DTEND;TZID=America/Argentina/Buenos_Aires:${endDate}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${description.replace(/\n/g, '\\n')}`,
      'END:VEVENT'
    ];
  });

  icsContent.push('END:VCALENDAR');
  return icsContent.join('\r\n');
};

/**
 * Genera y descarga un archivo .ics con las tareas seleccionadas
 * @param tasks Lista de tareas para incluir en el calendario
 * @param baseFilename Nombre base del archivo a descargar
 */
export const downloadICSFile = (tasks: Task[], baseFilename: string = 'tareas-futurgas'): void => {
  // Incluir la fecha actual en el nombre del archivo
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const filename = `${baseFilename}-${dateStr}.ics`;
  
  const icsContent = generateICSContent(tasks);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  
  link.href = window.URL.createObjectURL(blob);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
