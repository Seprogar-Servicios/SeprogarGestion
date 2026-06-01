import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../config/api';
import type { CategoriaMaterial } from '../../types';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface CategoriaMaterialState {
  categorias: CategoriaMaterial[];
  loading: boolean;
  error: string | null;
}

const initialState: CategoriaMaterialState = {
  categorias: [],
  loading: false,
  error: null,
};

// Async thunks
export const fetchCategoriasMateriales = createAsyncThunk(
  'categoriaMaterial/fetchCategoriasMateriales',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get<ApiResponse<CategoriaMaterial[]>>('/categorias-materiales');
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Error al cargar categorías de materiales');
    }
  }
);

export const createCategoriaMaterial = createAsyncThunk(
  'categoriaMaterial/createCategoriaMaterial',
  async (categoriaData: Partial<CategoriaMaterial>, { rejectWithValue }) => {
    try {
      const response = await api.post<ApiResponse<CategoriaMaterial>>('/categorias-materiales', categoriaData);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Error al crear categoría de material');
    }
  }
);

export const updateCategoriaMaterial = createAsyncThunk(
  'categoriaMaterial/updateCategoriaMaterial',
  async ({ id, data }: { id: string; data: Partial<CategoriaMaterial> }, { rejectWithValue }) => {
    try {
      const response = await api.put<ApiResponse<CategoriaMaterial>>(`/categorias-materiales/${id}`, data);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Error al actualizar categoría de material');
    }
  }
);

export const deleteCategoriaMaterial = createAsyncThunk(
  'categoriaMaterial/deleteCategoriaMaterial',
  async (id: string, { rejectWithValue }) => {
    try {
      await api.delete(`/categorias-materiales/${id}`);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Error al eliminar categoría de material');
    }
  }
);

const categoriaMaterialSlice = createSlice({
  name: 'categoriaMaterial',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch categorias
      .addCase(fetchCategoriasMateriales.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCategoriasMateriales.fulfilled, (state, action) => {
        state.loading = false;
        state.categorias = action.payload;
      })
      .addCase(fetchCategoriasMateriales.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Create categoria
      .addCase(createCategoriaMaterial.fulfilled, (state, action) => {
        if (!state.categorias) {
          state.categorias = [];
        }
        state.categorias.push(action.payload);
      })
      // Update categoria
      .addCase(updateCategoriaMaterial.fulfilled, (state, action) => {
        if (!state.categorias) {
          state.categorias = [];
        }
        const index = state.categorias.findIndex(categoria => categoria._id === action.payload._id);
        if (index !== -1) {
          state.categorias[index] = action.payload;
        }
      })
      // Delete categoria
      .addCase(deleteCategoriaMaterial.fulfilled, (state, action) => {
        if (!state.categorias) {
          state.categorias = [];
        }
        state.categorias = state.categorias.filter(categoria => categoria._id !== action.payload);
      });
  },
});

export const { clearError } = categoriaMaterialSlice.actions;
export default categoriaMaterialSlice.reducer;
