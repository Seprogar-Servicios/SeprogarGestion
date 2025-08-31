import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import api from '../../config/api';
import type { Task, TaskFilters } from '../../types';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface TasksState {
  tasks: Task[];
  currentTask: Task | null;
  loading: boolean;
  error: string | null;
  filters: TaskFilters;
}

const initialState: TasksState = {
  tasks: [],
  currentTask: null,
  loading: false,
  error: null,
  filters: {},
};

// Helper function to calculate date ranges for tasks
const getUpcomingDateRange = (filter: string) => {
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  if (!filter) return {};

  switch (filter) {
    case 'past': {
      // Tareas hasta ayer (inclusive)
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      yesterday.setHours(23, 59, 59, 999);
      return { fechaHasta: yesterday.toISOString() };
    }

    case 'current':
      // Desde hoy en adelante
      return { fechaDesde: today.toISOString() };

    case 'next24h': {
      // Próximas 24 horas
      const next24h = new Date(now);
      next24h.setHours(now.getHours() + 24);
      return { fechaDesde: now.toISOString(), fechaHasta: next24h.toISOString() };
    }

    case 'next48h': {
      // Próximas 48 horas
      const next48h = new Date(now);
      next48h.setHours(now.getHours() + 48);
      return { fechaDesde: now.toISOString(), fechaHasta: next48h.toISOString() };
    }

    case 'nextWeek': {
      // Lunes siguiente
      const nextMonday = new Date(today);
      let offset = (1 + 7 - today.getDay()) % 7;
      if (offset === 0) offset = 7; // Siempre apunta al lunes siguiente
      nextMonday.setDate(today.getDate() + offset);

      // Domingo siguiente
      const nextSunday = new Date(nextMonday);
      nextSunday.setDate(nextMonday.getDate() + 6);
      nextSunday.setHours(23, 59, 59, 999);

      return {
        fechaDesde: nextMonday.toISOString(),
        fechaHasta: nextSunday.toISOString()
      };
    }

    case 'nextMonth': {
      // Primer y último día del próximo mes
      const firstDayNextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      const lastDayNextMonth = new Date(today.getFullYear(), today.getMonth() + 2, 0);
      lastDayNextMonth.setHours(23, 59, 59, 999);

      return {
        fechaDesde: firstDayNextMonth.toISOString(),
        fechaHasta: lastDayNextMonth.toISOString()
      };
    }

    default:
      return {};
  }
};

// Async thunks
export const fetchTaskById = createAsyncThunk(
  'tasks/fetchTaskById',
  async (taskId: string, { rejectWithValue }) => {
    try {
      const response = await api.get<ApiResponse<Task>>(`/tareas/${taskId}`);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Error al cargar la tarea');
    }
  }
);

export const fetchTasks = createAsyncThunk(
  'tasks/fetchTasks',
  async (filters: TaskFilters = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      
      // Handle upcoming filter first to avoid duplicate parameters
      if (filters.upcomingFilter && filters.upcomingFilter !== 'custom') {
        const dateRange = getUpcomingDateRange(filters.upcomingFilter);
        // Skip if we have explicit date filters to avoid conflicts
        if (!filters.fechaDesde && !filters.fechaHasta) {
          Object.entries(dateRange).forEach(([key, value]) => {
            if (value) params.set(key, value);
          });
        }
      }
      
      // Handle other filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value === undefined || value === null || key === 'upcomingFilter') return;
        
        // Mapear el nombre del filtro 'tecnico' a 'usuario' que es lo que espera el backend
        if (key === 'tecnico') {
          params.append('usuario', value);
          return;
        }
        
        // Handle date fields
        if (key === 'fechaDesde' || key === 'fechaHasta') {
          try {
            const date = new Date(value);
            if (!isNaN(date.getTime())) {
              // For fechaHasta, set to end of day
              if (key === 'fechaHasta') {
                date.setHours(23, 59, 59, 999);
              }
              params.append(key, date.toISOString());
            }
          } catch (e) {
            console.error(`Error processing date ${key}:`, e);
          }
          return;
        }
        
        // For all other fields
        params.append(key, String(value));
      });
      
      const response = await api.get<ApiResponse<Task[]>>(`/tareas?${params.toString()}`);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Error al cargar tareas');
    }
  }
);

export const createTask = createAsyncThunk(
  'tasks/createTask',
  async (taskData: Partial<Task>, { rejectWithValue }) => {
    try {
      const response = await api.post<ApiResponse<Task>>('/tareas', taskData);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Error al crear tarea');
    }
  }
);

export const updateTask = createAsyncThunk(
  'tasks/updateTask',
  async ({ id, data }: { id: string; data: Partial<Task> }, { rejectWithValue }) => {
    try {
      const response = await api.put<ApiResponse<Task>>(`/tareas/${id}`, data);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Error al actualizar tarea');
    }
  }
);

export const deleteTask = createAsyncThunk(
  'tasks/deleteTask',
  async (id: string, { rejectWithValue }) => {
    try {
      await api.delete(`/tareas/${id}`);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Error al eliminar tarea');
    }
  }
);

export const deleteMultipleTasks = createAsyncThunk(
  'tasks/deleteMultipleTasks',
  async (ids: string[], { rejectWithValue }) => {
    try {
      const response = await api.post('/tareas/delete-multiple', { ids });
      return { ids, response: response.data };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Error al eliminar tareas');
    }
  }
);

export const fetchCalendarTasks = createAsyncThunk(
  'tasks/fetchCalendarTasks',
  async (filters: TaskFilters = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      
      // Handle upcoming filter for calendar
      if (filters.upcomingFilter && filters.upcomingFilter !== 'custom') {
        const dateRange = getUpcomingDateRange(filters.upcomingFilter);
        Object.entries(dateRange).forEach(([key, value]) => {
          if (value) params.append(key === 'fechaDesde' ? 'desde' : 'hasta', value);
        });
      }
      
      // Handle other filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value && key !== 'upcomingFilter') {
          // Map frontend filter names to backend parameter names for calendar endpoint
          let paramKey = key;
          if (key === 'fechaDesde') paramKey = 'desde';
          if (key === 'fechaHasta') paramKey = 'hasta';
          if (key === 'fechaInicio') paramKey = 'desde';
          if (key === 'fechaFin') paramKey = 'hasta';
          if (key === 'tecnico') paramKey = 'usuario';
          
          params.append(paramKey, value);
        }
      });
      
      const response = await api.get<ApiResponse<Task[]>>(`/tareas/calendario?${params.toString()}`);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Error al cargar calendario');
    }
  }
);

const tasksSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setFilters: (state, action: PayloadAction<TaskFilters>) => {
      // If the payload is empty, clear all filters
      if (Object.keys(action.payload).length === 0) {
        state.filters = {};
      } else {
        // Otherwise, merge the new filters with the existing ones
        state.filters = { ...state.filters, ...action.payload };
      }
    },
    clearCurrentTask: (state) => {
      state.currentTask = null;
    },
    setCurrentTask: (state, action: PayloadAction<Task | null>) => {
      state.currentTask = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch tasks
      .addCase(fetchTasks.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTasks.fulfilled, (state, action) => {
        state.loading = false;
        state.tasks = action.payload;
      })
      .addCase(fetchTasks.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Fetch task by ID
      .addCase(fetchTaskById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTaskById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentTask = action.payload;
      })
      .addCase(fetchTaskById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Create task
      .addCase(createTask.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createTask.fulfilled, (state, action) => {
        state.loading = false;
        state.tasks.push(action.payload);
      })
      .addCase(createTask.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Update task
      .addCase(updateTask.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateTask.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.tasks.findIndex(task => task._id === action.payload._id);
        if (index !== -1) {
          state.tasks[index] = action.payload;
        }
        if (state.currentTask?._id === action.payload._id) {
          state.currentTask = action.payload;
        }
      })
      .addCase(updateTask.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Delete task
      .addCase(deleteTask.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteTask.fulfilled, (state, action) => {
        state.loading = false;
        state.tasks = state.tasks.filter(task => task._id !== action.payload);
        if (state.currentTask?._id === action.payload) {
          state.currentTask = null;
        }
      })
      .addCase(deleteTask.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Delete multiple tasks
      .addCase(deleteMultipleTasks.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteMultipleTasks.fulfilled, (state, action) => {
        state.loading = false;
        const deletedIds = action.payload.ids;
        state.tasks = state.tasks.filter(task => !deletedIds.includes(task._id));
        if (state.currentTask && deletedIds.includes(state.currentTask._id)) {
          state.currentTask = null;
        }
      })
      .addCase(deleteMultipleTasks.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Calendar tasks
      .addCase(fetchCalendarTasks.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
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
      })
      .addCase(fetchCalendarTasks.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, setFilters, clearCurrentTask, setCurrentTask } = tasksSlice.actions;
export default tasksSlice.reducer;
