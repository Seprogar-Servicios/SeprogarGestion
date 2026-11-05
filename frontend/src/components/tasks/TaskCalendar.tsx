import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale from '@fullcalendar/core/locales/es';
import type {
  DateSelectArg,
  DatesSetArg,
  EventClickArg,
  EventInput,
} from '@fullcalendar/core';
import { Calendar, Plus } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store';
import { fetchCalendarTasks } from '../../store/slices/tasksSlice';
import CalendarTasksFilter from '../filters/CalendarTasksFilter';
import AdminPageHeader from '../common/AdminPageHeader';
import TaskEventPopover from './TaskEventPopover';
import TaskQuickCreateModal, { type QuickCreateDefaults } from './TaskQuickCreateModal';
import type { Task, TaskFilters } from '../../types';
import { parseFranjaHoraria, toFechaEjecucionYmd } from '../../utils/franjaHoraria';
import { useTheme } from '../../hooks/useTheme';
import './TaskCalendar.css';
import { isAdminRole } from '../../utils/roles';

const STATUS_COLORS: Record<string, { bg: string; border: string }> = {
  pendiente: { bg: '#5f6368', border: '#5f6368' },
  'en progreso': { bg: '#f9ab00', border: '#f9ab00' },
  completada: { bg: '#1e8e3e', border: '#1e8e3e' },
  cancelada: { bg: '#d93025', border: '#d93025' },
};

const pad2 = (n: number) => String(n).padStart(2, '0');

const toLocalYmd = (d: Date) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

const toLocalHm = (d: Date) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;

const taskToEvent = (task: Task): EventInput | null => {
  const ymd = toFechaEjecucionYmd(task.fechaEjecucion);
  if (!ymd) return null;

  const colors = STATUS_COLORS[task.estado] || STATUS_COLORS.pendiente;
  const title = task.numero ? `#${task.numero} · ${task.titulo}` : task.titulo;
  const franja = parseFranjaHoraria(task.franja_horaria);

  const base: EventInput = {
    id: task._id,
    title,
    backgroundColor: colors.bg,
    borderColor: colors.border,
    textColor: '#ffffff',
    extendedProps: { task },
  };

  if (franja) {
    return {
      ...base,
      start: `${ymd}T${franja.startTime}:00`,
      end: `${ymd}T${franja.endTime}:00`,
      allDay: false,
    };
  }

  return {
    ...base,
    start: ymd,
    allDay: true,
  };
};

const TaskCalendar: React.FC = () => {
  const dispatch = useAppDispatch();
  const { tasks, loading } = useAppSelector((state) => state.tasks);
  const { user } = useAppSelector((state) => state.auth);
  const { isDarkMode } = useTheme();
  const calendarRef = useRef<FullCalendar>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const slotHoverRef = useRef<HTMLDivElement | null>(null);

  const canCreate = isAdminRole(user);

  const [filters, setFilters] = useState<TaskFilters>({});
  const [visibleRange, setVisibleRange] = useState<{ desde: string; hasta: string } | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [quickCreate, setQuickCreate] = useState<QuickCreateDefaults | null>(null);

  const clearSlotHover = useCallback(() => {
    slotHoverRef.current?.remove();
    slotHoverRef.current = null;
  }, []);

  const updateSlotHover = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!canCreate || quickCreate) {
        clearSlotHover();
        return;
      }

      const target = e.target as HTMLElement;
      const shell = shellRef.current;
      if (!shell) {
        clearSlotHover();
        return;
      }

      // Vista mes: hover por CSS de día
      if (target.closest('.fc-daygrid-body') && !target.closest('.fc-timegrid')) {
        clearSlotHover();
        return;
      }

      if (
        target.closest('.fc-event') ||
        target.closest('.fc-col-header') ||
        target.closest('.fc-timegrid-axis') ||
        target.closest('.fc-highlight') ||
        target.closest('.fc-toolbar')
      ) {
        clearSlotHover();
        return;
      }

      const timeBody = target.closest('.fc-timegrid-body') as HTMLElement | null;
      if (!timeBody) {
        clearSlotHover();
        return;
      }

      // Los slots son filas a ancho completo; la columna se deduce por X
      const cols = Array.from(
        timeBody.querySelectorAll('.fc-timegrid-cols .fc-timegrid-col')
      ) as HTMLElement[];
      const dayCols = cols.filter((c) => !c.classList.contains('fc-timegrid-axis'));
      const col = dayCols.find((c) => {
        const r = c.getBoundingClientRect();
        return e.clientX >= r.left && e.clientX < r.right;
      });
      if (!col) {
        clearSlotHover();
        return;
      }

      const frame =
        (col.querySelector('.fc-timegrid-col-frame') as HTMLElement | null) || col;

      const slotSample = shell.querySelector('.fc-timegrid-slot') as HTMLElement | null;
      const slotHeight = slotSample?.getBoundingClientRect().height || 48;
      if (slotHeight <= 0) {
        clearSlotHover();
        return;
      }

      // Y relativo al área de slots (misma altura que las columnas)
      const slotsEl = timeBody.querySelector('.fc-timegrid-slots') as HTMLElement | null;
      const yBase = (slotsEl || frame).getBoundingClientRect();
      const y = e.clientY - yBase.top;
      if (y < 0 || y >= yBase.height) {
        clearSlotHover();
        return;
      }

      const index = Math.floor(y / slotHeight);
      const top = index * slotHeight;

      let el = slotHoverRef.current;
      if (!el) {
        el = document.createElement('div');
        el.className = 'task-calendar-slot-hover';
        slotHoverRef.current = el;
      }
      if (el.parentElement !== frame) {
        if (getComputedStyle(frame).position === 'static') {
          frame.style.position = 'relative';
        }
        frame.appendChild(el);
      }
      el.style.top = `${top}px`;
      el.style.height = `${slotHeight}px`;
      el.style.display = 'block';
    },
    [canCreate, quickCreate, clearSlotHover]
  );

  useEffect(() => () => clearSlotHover(), [clearSlotHover]);

  const handleFiltersChange = (newFilters: TaskFilters) => {
    setFilters(newFilters);
  };

  const calendarFiltersForReload = useMemo((): Record<string, string> => {
    const base: Record<string, string> = {};
    if (visibleRange) {
      base.fechaDesde = visibleRange.desde;
      base.fechaHasta = visibleRange.hasta;
    }
    if (filters.estado) base.estado = String(filters.estado);
    if (filters.tecnico) base.tecnico = String(filters.tecnico);
    if (user && !isAdminRole(user)) base.usuario = user._id;
    return base;
  }, [visibleRange, filters.estado, filters.tecnico, user]);

  const loadCalendar = useCallback(() => {
    if (!visibleRange) return;

    const calendarFilters: TaskFilters = {
      ...filters,
      fechaDesde: visibleRange.desde,
      fechaHasta: visibleRange.hasta,
    };

    if (user && !isAdminRole(user)) {
      calendarFilters.usuario = user._id;
    }

    dispatch(fetchCalendarTasks(calendarFilters));
  }, [dispatch, filters, visibleRange, user]);

  useEffect(() => {
    loadCalendar();
  }, [loadCalendar]);

  const handleDatesSet = (arg: DatesSetArg) => {
    const desde = arg.startStr.slice(0, 10);
    const end = new Date(arg.end);
    end.setDate(end.getDate() - 1);
    const hasta = toLocalYmd(end);

    setVisibleRange((prev) => {
      if (prev && prev.desde === desde && prev.hasta === hasta) return prev;
      return { desde, hasta };
    });
  };

  const events = useMemo(() => {
    if (!Array.isArray(tasks)) return [];

    return tasks
      .filter((task) => {
        if (filters.estado && task.estado !== filters.estado) return false;
        if (filters.tecnico) {
          const tecnicos = Array.isArray(task.tecnicos) ? task.tecnicos : [];
          if (tecnicos.length === 0) return false;
          const found = tecnicos.some((t) => {
            if (typeof t === 'object' && t !== null) return t._id === filters.tecnico;
            return t === filters.tecnico;
          });
          if (!found) return false;
        }
        return true;
      })
      .map(taskToEvent)
      .filter((e): e is EventInput => e !== null);
  }, [tasks, filters.estado, filters.tecnico]);

  const handleEventClick = (info: EventClickArg) => {
    info.jsEvent.preventDefault();
    const task = info.event.extendedProps.task as Task | undefined;
    if (task) {
      setSelectedTask(task);
    }
  };

  const openCreateFromRange = (start: Date, end: Date, allDay: boolean) => {
    if (!canCreate) return;

    const fechaEjecucion = toLocalYmd(start);
    if (allDay) {
      setQuickCreate({ fechaEjecucion, allDay: true });
      return;
    }

    let horaFin = toLocalHm(end);
    if (end.getTime() <= start.getTime()) {
      const plus = new Date(start.getTime() + 60 * 60 * 1000);
      horaFin = toLocalHm(plus);
    }

    setQuickCreate({
      fechaEjecucion,
      horaInicio: toLocalHm(start),
      horaFin,
      allDay: false,
    });
  };

  const handleSelect = (arg: DateSelectArg) => {
    arg.view.calendar.unselect();
    openCreateFromRange(arg.start, arg.end, arg.allDay);
  };

  const handleDateClick = (arg: { date: Date; allDay: boolean }) => {
    if (!canCreate) return;
    if (arg.allDay) {
      openCreateFromRange(arg.date, arg.date, true);
      return;
    }
    const end = new Date(arg.date.getTime() + 60 * 60 * 1000);
    openCreateFromRange(arg.date, end, false);
  };

  const filterTrailing = (
    <>
      <div className="hidden sm:flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400">
        <span className="inline-flex items-center gap-1">
          <span className="task-calendar-legend-dot" style={{ background: STATUS_COLORS.pendiente.bg }} />
          Pendiente
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="task-calendar-legend-dot" style={{ background: STATUS_COLORS['en progreso'].bg }} />
          En progreso
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="task-calendar-legend-dot" style={{ background: STATUS_COLORS.completada.bg }} />
          OK
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="task-calendar-legend-dot" style={{ background: STATUS_COLORS.cancelada.bg }} />
          Cancelada
        </span>
      </div>
      {loading && (
        <span className="text-[11px] text-blue-600 dark:text-blue-400 animate-pulse">Cargando…</span>
      )}
    </>
  );

  return (
    <div className="h-[calc(100vh-5.5rem)] min-h-0 flex flex-col gap-2 animate-fadeIn">
      <AdminPageHeader
        title="Calendario"
        description={
          canCreate
            ? 'Clic o arrastre en la grilla para crear una tarea'
            : 'Tus tareas programadas'
        }
        eyebrow="Operación"
        icon={<Calendar className="h-5 w-5" />}
        actions={
          canCreate ? (
            <button
              type="button"
              onClick={() =>
                setQuickCreate({
                  fechaEjecucion: toLocalYmd(new Date()),
                  horaInicio: '09:00',
                  horaFin: '10:00',
                  allDay: false,
                })
              }
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 border border-gray-200 dark:border-gray-600 shadow-sm hover:shadow text-sm font-medium"
            >
              <Plus className="h-4 w-4 text-blue-600" />
              Crear
            </button>
          ) : undefined
        }
      />

      <CalendarTasksFilter
        filters={filters}
        onFiltersChange={handleFiltersChange}
        trailing={filterTrailing}
      />

      <div
        ref={shellRef}
        className={`task-calendar-shell flex-1 min-h-0 bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden ${
          isDarkMode ? 'dark' : ''
        } ${canCreate ? 'task-calendar-can-create' : ''}`}
        onMouseMove={canCreate ? updateSlotHover : undefined}
        onMouseLeave={clearSlotHover}
      >
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          locale={esLocale}
          firstDay={0}
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
          }}
          buttonText={{
            today: 'Hoy',
            month: 'Mes',
            week: 'Semana',
            day: 'Día',
            list: 'Agenda',
          }}
          height="100%"
          expandRows
          stickyHeaderDates
          nowIndicator
          dayMaxEvents={3}
          moreLinkText={(n) => `+${n} más`}
          slotMinTime="00:00:00"
          slotMaxTime="24:00:00"
          scrollTime="07:00:00"
          slotDuration="00:30:00"
          slotLabelInterval="01:00:00"
          allDaySlot
          allDayText="Todo el día"
          weekends
          editable={false}
          selectable={canCreate}
          selectMirror
          selectMinDistance={4}
          unselectAuto
          events={events}
          datesSet={handleDatesSet}
          eventClick={handleEventClick}
          select={(arg) => {
            clearSlotHover();
            handleSelect(arg);
          }}
          dateClick={handleDateClick}
          eventTimeFormat={{
            hour: 'numeric',
            minute: '2-digit',
            meridiem: 'short',
            hour12: true,
          }}
          slotLabelFormat={{
            hour: 'numeric',
            minute: '2-digit',
            meridiem: 'short',
            hour12: true,
          }}
          dayHeaderFormat={{ weekday: 'short', day: 'numeric', omitCommas: true }}
        />
      </div>

      {selectedTask && (
        <TaskEventPopover task={selectedTask} onClose={() => setSelectedTask(null)} />
      )}

      {quickCreate && (
        <TaskQuickCreateModal
          defaults={quickCreate}
          onClose={() => setQuickCreate(null)}
          onCreated={loadCalendar}
          calendarFilters={calendarFiltersForReload}
        />
      )}
    </div>
  );
};

export default TaskCalendar;
