import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import api from '../../config/api';
import type { Observation } from '../../types';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface ObservationsState {
  observations: Observation[];
  currentObservation: Observation | null;
  loading: boolean;
  error: string | null;
}

const initialState: ObservationsState = {
  observations: [],
  currentObservation: null,
  loading: false,
  error: null,
};

// Async thunks
export const fetchTaskObservations = createAsyncThunk(
  'observations/fetchTaskObservations',
  async (taskId: string, { rejectWithValue }) => {
    try {
      const response = await api.get<ApiResponse<Observation[]>>(`/observaciones/tarea/${taskId}`);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Error al cargar observaciones');
    }
  }
);

export const createObservation = createAsyncThunk(
  'observations/createObservation',
  async (observationData: { titulo: string; descripcion: string; tarea: string }, { rejectWithValue }) => {
    try {
      const response = await api.post<ApiResponse<Observation>>('/observaciones', observationData);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Error al crear observación');
    }
  }
);

export const updateObservation = createAsyncThunk(
  'observations/updateObservation',
  async ({ id, ...updates }: { id: string } & Partial<Observation>, { rejectWithValue }) => {
    try {
      const response = await api.put<ApiResponse<Observation>>(`/observaciones/${id}`, updates);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Error al actualizar observación');
    }
  }
);

export const deleteObservation = createAsyncThunk(
  'observations/deleteObservation',
  async (id: string, { rejectWithValue }) => {
    try {
      await api.delete(`/observaciones/${id}`);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Error al eliminar observación');
    }
  }
);

const observationsSlice = createSlice({
  name: 'observations',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCurrentObservation: (state, action: PayloadAction<Observation | null>) => {
      state.currentObservation = action.payload;
    },
  },
  extraReducers: (builder) => {
    // fetchTaskObservations
    builder.addCase(fetchTaskObservations.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchTaskObservations.fulfilled, (state, action) => {
      state.loading = false;
      state.observations = action.payload;
    });
    builder.addCase(fetchTaskObservations.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // createObservation
    builder.addCase(createObservation.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(createObservation.fulfilled, (state, action) => {
      state.loading = false;
      state.observations.unshift(action.payload);
    });
    builder.addCase(createObservation.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // updateObservation
    builder.addCase(updateObservation.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(updateObservation.fulfilled, (state, action) => {
      state.loading = false;
      const index = state.observations.findIndex(obs => obs._id === action.payload._id);
      if (index !== -1) {
        state.observations[index] = action.payload;
      }
      if (state.currentObservation?._id === action.payload._id) {
        state.currentObservation = action.payload;
      }
    });
    builder.addCase(updateObservation.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // deleteObservation
    builder.addCase(deleteObservation.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(deleteObservation.fulfilled, (state, action) => {
      state.loading = false;
      state.observations = state.observations.filter(obs => obs._id !== action.payload);
      if (state.currentObservation?._id === action.payload) {
        state.currentObservation = null;
      }
    });
    builder.addCase(deleteObservation.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });
  },
});

export const { clearError, setCurrentObservation } = observationsSlice.actions;
export default observationsSlice.reducer;
