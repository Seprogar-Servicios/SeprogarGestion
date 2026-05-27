import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../config/api';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface TareaLiquidacion {
  _id: string;
  tarea: {
    _id: string;
    numero: string;
    titulo: string;
    cliente: string;
    direccion: string;
    estado: string;
    fechaEjecucion: string;
    tecnicos: Array<{
      _id: string;
      nombre: string;
      email: string;
      porcentajeTecnico: number;
    }>;
  };
  manoObra: number;
  materiales: number;
  cobertura: number;
  excedente: number;
  materialReal: number;
  boletasMateriales: number;
  observacionesFinancieras: string;
  totalPresupuesto?: number;
  difExcedente?: number;
  gananciaMaterial?: number;
  gananciaTotal?: number;
  repartida?: number;
  pagoTecnico?: number;
  futurgas?: number;
  pago15Dias?: number;
  createdAt: string;
  updatedAt: string;
}

interface TareaLiquidacionState {
  liquidaciones: TareaLiquidacion[];
  loading: boolean;
  error: string | null;
}

const initialState: TareaLiquidacionState = {
  liquidaciones: [],
  loading: false,
  error: null,
};

// Async thunks
export const fetchLiquidaciones = createAsyncThunk(
  'tareaLiquidacion/fetchLiquidaciones',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get<ApiResponse<TareaLiquidacion[]>>('/liquidaciones');
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Error al cargar liquidaciones');
    }
  }
);

export const fetchLiquidacionById = createAsyncThunk(
  'tareaLiquidacion/fetchLiquidacionById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await api.get<ApiResponse<TareaLiquidacion>>(`/liquidaciones/${id}`);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Error al cargar liquidación');
    }
  }
);

export const createLiquidacion = createAsyncThunk(
  'tareaLiquidacion/createLiquidacion',
  async (liquidacionData: Partial<TareaLiquidacion>, { rejectWithValue }) => {
    try {
      const response = await api.post<ApiResponse<TareaLiquidacion>>('/liquidaciones', liquidacionData);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Error al crear liquidación');
    }
  }
);

export const updateLiquidacion = createAsyncThunk(
  'tareaLiquidacion/updateLiquidacion',
  async ({ id, data }: { id: string; data: Partial<TareaLiquidacion> }, { rejectWithValue }) => {
    try {
      const response = await api.put<ApiResponse<TareaLiquidacion>>(`/liquidaciones/${id}`, data);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Error al actualizar liquidación');
    }
  }
);

export const deleteLiquidacion = createAsyncThunk(
  'tareaLiquidacion/deleteLiquidacion',
  async (id: string, { rejectWithValue }) => {
    try {
      await api.delete(`/liquidaciones/${id}`);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Error al eliminar liquidación');
    }
  }
);

const tareaLiquidacionSlice = createSlice({
  name: 'tareaLiquidacion',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch liquidaciones
      .addCase(fetchLiquidaciones.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchLiquidaciones.fulfilled, (state, action) => {
        state.loading = false;
        state.liquidaciones = action.payload;
      })
      .addCase(fetchLiquidaciones.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Create liquidacion
      .addCase(createLiquidacion.fulfilled, (state, action) => {
        if (!state.liquidaciones) {
          state.liquidaciones = [];
        }
        state.liquidaciones.push(action.payload);
      })
      // Update liquidacion
      .addCase(updateLiquidacion.fulfilled, (state, action) => {
        if (!state.liquidaciones) {
          state.liquidaciones = [];
        }
        const index = state.liquidaciones.findIndex(l => l._id === action.payload._id);
        if (index !== -1) {
          state.liquidaciones[index] = action.payload;
        }
      })
      // Delete liquidacion
      .addCase(deleteLiquidacion.fulfilled, (state, action) => {
        if (!state.liquidaciones) {
          state.liquidaciones = [];
        }
        state.liquidaciones = state.liquidaciones.filter(l => l._id !== action.payload);
      });
  },
});

export const { clearError } = tareaLiquidacionSlice.actions;
export default tareaLiquidacionSlice.reducer;
