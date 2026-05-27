import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../config/api';
import type { Material } from '../../types';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface MaterialsState {
  materials: Material[];
  loading: boolean;
  error: string | null;
}

const initialState: MaterialsState = {
  materials: [],
  loading: false,
  error: null,
};

// Async thunks
export const fetchMaterials = createAsyncThunk(
  'materials/fetchMaterials',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get<ApiResponse<Material[]>>('/materiales');
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Error al cargar materiales');
    }
  }
);

export const createMaterial = createAsyncThunk(
  'materials/createMaterial',
  async (materialData: Partial<Material>, { rejectWithValue }) => {
    try {
      const response = await api.post<ApiResponse<Material>>('/materiales', materialData);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Error al crear material');
    }
  }
);

export const updateMaterial = createAsyncThunk(
  'materials/updateMaterial',
  async ({ id, data }: { id: string; data: Partial<Material> }, { rejectWithValue }) => {
    try {
      const response = await api.put<ApiResponse<Material>>(`/materiales/${id}`, data);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Error al actualizar material');
    }
  }
);

export const deleteMaterial = createAsyncThunk(
  'materials/deleteMaterial',
  async (id: string, { rejectWithValue }) => {
    try {
      await api.delete(`/materiales/${id}`);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Error al eliminar material');
    }
  }
);

const materialsSlice = createSlice({
  name: 'materials',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch materials
      .addCase(fetchMaterials.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMaterials.fulfilled, (state, action) => {
        state.loading = false;
        state.materials = action.payload;
      })
      .addCase(fetchMaterials.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Create material
      .addCase(createMaterial.fulfilled, (state, action) => {
        if (!state.materials) {
          state.materials = [];
        }
        state.materials.push(action.payload);
      })
      // Update material
      .addCase(updateMaterial.fulfilled, (state, action) => {
        if (!state.materials) {
          state.materials = [];
        }
        const index = state.materials.findIndex(material => material._id === action.payload._id);
        if (index !== -1) {
          state.materials[index] = action.payload;
        }
      })
      // Delete material
      .addCase(deleteMaterial.fulfilled, (state, action) => {
        if (!state.materials) {
          state.materials = [];
        }
        state.materials = state.materials.filter(material => material._id !== action.payload);
      });
  },
});

export const { clearError } = materialsSlice.actions;
export default materialsSlice.reducer;
