import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../config/api';
import type { MotivoPago } from '../../types';

interface ApiResponse<T> {
  data: T;
  message?: string;
}

interface MotivoPagoState {
  motivos: MotivoPago[];
  loading: boolean;
  error: string | null;
}

const initialState: MotivoPagoState = {
  motivos: [],
  loading: false,
  error: null,
};

export const fetchMotivosPago = createAsyncThunk(
  'motivoPago/fetchMotivosPago',
  async (params: { activo?: boolean } | undefined, { rejectWithValue }) => {
    try {
      const query = params?.activo !== undefined ? `?activo=${params.activo}` : '';
      const response = await api.get<ApiResponse<MotivoPago[]>>(`/motivos-pago${query}`);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Error al cargar motivos de pago');
    }
  }
);

export const createMotivoPago = createAsyncThunk(
  'motivoPago/createMotivoPago',
  async (motivoData: Partial<MotivoPago>, { rejectWithValue }) => {
    try {
      const response = await api.post<ApiResponse<MotivoPago>>('/motivos-pago', motivoData);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Error al crear motivo de pago');
    }
  }
);

export const updateMotivoPago = createAsyncThunk(
  'motivoPago/updateMotivoPago',
  async ({ id, data }: { id: string; data: Partial<MotivoPago> }, { rejectWithValue }) => {
    try {
      const response = await api.put<ApiResponse<MotivoPago>>(`/motivos-pago/${id}`, data);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Error al actualizar motivo de pago');
    }
  }
);

export const deleteMotivoPago = createAsyncThunk(
  'motivoPago/deleteMotivoPago',
  async (id: string, { rejectWithValue }) => {
    try {
      await api.delete(`/motivos-pago/${id}`);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Error al eliminar motivo de pago');
    }
  }
);

const motivoPagoSlice = createSlice({
  name: 'motivoPago',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMotivosPago.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMotivosPago.fulfilled, (state, action) => {
        state.loading = false;
        state.motivos = action.payload;
      })
      .addCase(fetchMotivosPago.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(createMotivoPago.fulfilled, (state, action) => {
        state.motivos.push(action.payload);
      })
      .addCase(updateMotivoPago.fulfilled, (state, action) => {
        const index = state.motivos.findIndex((m) => m._id === action.payload._id);
        if (index !== -1) state.motivos[index] = action.payload;
      })
      .addCase(deleteMotivoPago.fulfilled, (state, action) => {
        state.motivos = state.motivos.filter((m) => m._id !== action.payload);
      });
  },
});

export const { clearError } = motivoPagoSlice.actions;
export default motivoPagoSlice.reducer;
