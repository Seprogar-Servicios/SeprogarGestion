import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../config/api';
import type { Recibo, ApiResponse } from '../../types';

interface RecibosState {
  recibos: Recibo[];
  loading: boolean;
  error: string | null;
}

const initialState: RecibosState = {
  recibos: [],
  loading: false,
  error: null,
};

// Async thunks
export const fetchRecibos = createAsyncThunk(
  'recibos/fetchRecibos',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get<Recibo[]>('/recibos');
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Error al cargar recibos');
    }
  }
);

export const fetchMisRecibos = createAsyncThunk(
  'recibos/fetchMisRecibos',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get<Recibo[]>('/recibos/mis-recibos');
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Error al cargar mis recibos');
    }
  }
);

export const createRecibo = createAsyncThunk(
  'recibos/createRecibo',
  async (formData: FormData, { rejectWithValue }) => {
    try {
      const response = await api.post<ApiResponse<Recibo>>('/recibos', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Error al crear recibo');
    }
  }
);

export const deleteRecibo = createAsyncThunk(
  'recibos/deleteRecibo',
  async (reciboId: string, { rejectWithValue }) => {
    try {
      await api.delete<ApiResponse<void>>(`/recibos/${reciboId}`);
      return reciboId;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Error al eliminar recibo');
    }
  }
);

export const firmarRecibo = createAsyncThunk(
  'recibos/firmarRecibo',
  async ({ reciboId, formData }: { reciboId: string; formData: FormData }, { rejectWithValue }) => {
    try {
      const response = await api.post<ApiResponse<Recibo>>(`/recibos/${reciboId}/firmar`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Error al firmar recibo');
    }
  }
);

const recibosSlice = createSlice({
  name: 'recibos',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchRecibos.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRecibos.fulfilled, (state, action) => {
        state.loading = false;
        state.recibos = action.payload;
      })
      .addCase(fetchRecibos.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchMisRecibos.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMisRecibos.fulfilled, (state, action) => {
        state.loading = false;
        state.recibos = action.payload;
      })
      .addCase(fetchMisRecibos.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(createRecibo.fulfilled, (state, action) => {
        if (!state.recibos) {
          state.recibos = [];
        }
        state.recibos.push(action.payload);
      })
      .addCase(deleteRecibo.fulfilled, (state, action) => {
        state.recibos = state.recibos.filter((recibo) => recibo._id !== action.payload);
      })
      .addCase(firmarRecibo.fulfilled, (state, action) => {
        const { reciboId } = action.meta.arg;
        const recibo = state.recibos.find((r) => r._id === reciboId);
        if (recibo) {
          recibo.estadoFirma = 'firmado';
        }
      });
  },
});

export const { clearError } = recibosSlice.actions;
export default recibosSlice.reducer;
