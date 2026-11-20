import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../config/api';
import type { Proveedor } from '../../types';

interface ProveedoresState {
  proveedores: Proveedor[];
  loading: boolean;
  error: string | null;
}

const initialState: ProveedoresState = {
  proveedores: [],
  loading: false,
  error: null,
};

export const fetchProveedores = createAsyncThunk(
  'proveedores/fetchProveedores',
  async (opts: { activo?: boolean } | undefined, { rejectWithValue }) => {
    try {
      const params = opts?.activo ? '?activo=true' : '';
      const response = await api.get<Proveedor[]>(`/proveedores${params}`);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Error al cargar proveedores');
    }
  }
);

export const createProveedor = createAsyncThunk(
  'proveedores/createProveedor',
  async (data: Partial<Proveedor>, { rejectWithValue }) => {
    try {
      const response = await api.post<{ message: string; proveedor: Proveedor }>(
        '/proveedores',
        data
      );
      return response.data.proveedor;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Error al crear proveedor');
    }
  }
);

export const updateProveedor = createAsyncThunk(
  'proveedores/updateProveedor',
  async ({ id, data }: { id: string; data: Partial<Proveedor> }, { rejectWithValue }) => {
    try {
      const response = await api.put<{ message: string; proveedor: Proveedor }>(
        `/proveedores/${id}`,
        data
      );
      return response.data.proveedor;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Error al actualizar proveedor');
    }
  }
);

export const deleteProveedor = createAsyncThunk(
  'proveedores/deleteProveedor',
  async (id: string, { rejectWithValue }) => {
    try {
      await api.delete(`/proveedores/${id}`);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Error al eliminar proveedor');
    }
  }
);

const proveedoresSlice = createSlice({
  name: 'proveedores',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProveedores.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProveedores.fulfilled, (state, action) => {
        state.loading = false;
        state.proveedores = action.payload;
      })
      .addCase(fetchProveedores.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(createProveedor.fulfilled, (state, action) => {
        if (action.payload) state.proveedores.push(action.payload);
      })
      .addCase(updateProveedor.fulfilled, (state, action) => {
        const index = state.proveedores.findIndex((p) => p._id === action.payload._id);
        if (index !== -1) state.proveedores[index] = action.payload;
      })
      .addCase(deleteProveedor.fulfilled, (state, action) => {
        state.proveedores = state.proveedores.filter((p) => p._id !== action.payload);
      });
  },
});

export const { clearError } = proveedoresSlice.actions;
export default proveedoresSlice.reducer;
