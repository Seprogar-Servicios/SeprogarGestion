import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../config/api';
import type { PagoManual } from '../../types';

interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PagoManualFormData {
  monto: number;
  fechaEmision: string;
  tecnico: string;
  motivo: string;
  tareas: string[];
  observaciones?: string;
}

interface PagoManualState {
  pagos: PagoManual[];
  loading: boolean;
  error: string | null;
}

const initialState: PagoManualState = {
  pagos: [],
  loading: false,
  error: null,
};

export const fetchPagosManuales = createAsyncThunk(
  'pagoManual/fetchPagosManuales',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get<ApiResponse<PagoManual[]>>('/pagos-manuales');
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Error al cargar pagos manuales');
    }
  }
);

export const fetchMisPagosManuales = createAsyncThunk(
  'pagoManual/fetchMisPagosManuales',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get<ApiResponse<PagoManual[]>>('/pagos-manuales/mis-pagos');
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Error al cargar tus pagos');
    }
  }
);

export const createPagoManual = createAsyncThunk(
  'pagoManual/createPagoManual',
  async (data: PagoManualFormData, { rejectWithValue }) => {
    try {
      const response = await api.post<ApiResponse<PagoManual>>('/pagos-manuales', data);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Error al crear pago manual');
    }
  }
);

export const updatePagoManual = createAsyncThunk(
  'pagoManual/updatePagoManual',
  async ({ id, data }: { id: string; data: Partial<PagoManualFormData> }, { rejectWithValue }) => {
    try {
      const response = await api.put<ApiResponse<PagoManual>>(`/pagos-manuales/${id}`, data);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Error al actualizar pago manual');
    }
  }
);

export const deletePagoManual = createAsyncThunk(
  'pagoManual/deletePagoManual',
  async (id: string, { rejectWithValue }) => {
    try {
      await api.delete(`/pagos-manuales/${id}`);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Error al eliminar pago manual');
    }
  }
);

export const downloadPagoManualPdf = createAsyncThunk(
  'pagoManual/downloadPagoManualPdf',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await api.get(`/pagos-manuales/${id}/pdf`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `pago-manual-${id.slice(-8).toUpperCase()}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Error al descargar el PDF');
    }
  }
);

const pagoManualSlice = createSlice({
  name: 'pagoManual',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPagosManuales.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPagosManuales.fulfilled, (state, action) => {
        state.loading = false;
        state.pagos = action.payload;
      })
      .addCase(fetchPagosManuales.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchMisPagosManuales.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMisPagosManuales.fulfilled, (state, action) => {
        state.loading = false;
        state.pagos = action.payload;
      })
      .addCase(fetchMisPagosManuales.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(createPagoManual.fulfilled, (state, action) => {
        state.pagos.unshift(action.payload);
      })
      .addCase(updatePagoManual.fulfilled, (state, action) => {
        const index = state.pagos.findIndex((p) => p._id === action.payload._id);
        if (index !== -1) state.pagos[index] = action.payload;
      })
      .addCase(deletePagoManual.fulfilled, (state, action) => {
        state.pagos = state.pagos.filter((p) => p._id !== action.payload);
      });
  },
});

export const { clearError } = pagoManualSlice.actions;
export default pagoManualSlice.reducer;
