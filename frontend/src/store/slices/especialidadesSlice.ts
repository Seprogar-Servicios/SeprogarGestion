import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../config/api';
import type { Especialidad } from '../../types';

interface EspecialidadesState {
  especialidades: Especialidad[];
  loading: boolean;
  error: string | null;
}

const initialState: EspecialidadesState = {
  especialidades: [],
  loading: false,
  error: null,
};

// Async thunks
export const fetchEspecialidades = createAsyncThunk(
  'especialidades/fetchEspecialidades',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get<Especialidad[]>('/especialidades');
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Error al cargar especialidades');
    }
  }
);

export const createEspecialidad = createAsyncThunk(
  'especialidades/createEspecialidad',
  async (especialidadData: Partial<Especialidad>, { rejectWithValue }) => {
    try {
      const response = await api.post<Especialidad>('/especialidades', especialidadData);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Error al crear especialidad');
    }
  }
);

export const updateEspecialidad = createAsyncThunk(
  'especialidades/updateEspecialidad',
  async ({ id, data }: { id: string; data: Partial<Especialidad> }, { rejectWithValue }) => {
    try {
      const response = await api.put<Especialidad>(`/especialidades/${id}`, data);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Error al actualizar especialidad');
    }
  }
);

export const deleteEspecialidad = createAsyncThunk(
  'especialidades/deleteEspecialidad',
  async (id: string, { rejectWithValue }) => {
    try {
      await api.delete(`/especialidades/${id}`);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Error al eliminar especialidad');
    }
  }
);

const especialidadesSlice = createSlice({
  name: 'especialidades',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch especialidades
      .addCase(fetchEspecialidades.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchEspecialidades.fulfilled, (state, action) => {
        state.loading = false;
        state.especialidades = action.payload;
      })
      .addCase(fetchEspecialidades.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Create especialidad
      .addCase(createEspecialidad.fulfilled, (state, action) => {
        state.especialidades.push(action.payload);
      })
      // Update especialidad
      .addCase(updateEspecialidad.fulfilled, (state, action) => {
        const index = state.especialidades.findIndex(esp => esp._id === action.payload._id);
        if (index !== -1) {
          state.especialidades[index] = action.payload;
        }
      })
      // Delete especialidad
      .addCase(deleteEspecialidad.fulfilled, (state, action) => {
        state.especialidades = state.especialidades.filter(esp => esp._id !== action.payload);
      });
  },
});

export const { clearError } = especialidadesSlice.actions;
export default especialidadesSlice.reducer;
