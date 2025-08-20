import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../config/api';
import type { User, ApiResponse } from '../../types';

interface UsersState {
  users: User[];
  pendingUsers: User[];
  loading: boolean;
  error: string | null;
}

const initialState: UsersState = {
  users: [],
  pendingUsers: [],
  loading: false,
  error: null,
};

// Async thunks
export const fetchUsers = createAsyncThunk(
  'users/fetchUsers',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get<ApiResponse<User[]>>('/usuarios');
      return response.data.data;
    } catch (error: any) {
      if (error.response?.status === 403) {
        console.warn('No tienes permisos para ver los usuarios');
        return []; // Return empty array instead of error for 403
      }
      return rejectWithValue(error.response?.data?.message || 'Error al cargar usuarios');
    }
  }
);

export const fetchPendingUsers = createAsyncThunk(
  'users/fetchPendingUsers',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get<ApiResponse<User[]>>('/usuarios/pending');
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Error al cargar usuarios pendientes');
    }
  }
);

export const approveUser = createAsyncThunk(
  'users/approveUser',
  async (userId: string, { rejectWithValue }) => {
    try {
      const response = await api.patch<ApiResponse<User>>(`/usuarios/${userId}/approve`);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Error al aprobar usuario');
    }
  }
);

export const rejectUser = createAsyncThunk(
  'users/rejectUser',
  async (userId: string, { rejectWithValue }) => {
    try {
      await api.delete(`/usuarios/${userId}`);
      return userId;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Error al rechazar usuario');
    }
  }
);

export const createUser = createAsyncThunk(
  'users/createUser',
  async (userData: { nombre: string; email: string; password: string; rol: 'admin' | 'usuario'; especialidad?: string }, { rejectWithValue }) => {
    try {
      const response = await api.post<ApiResponse<User>>('/usuarios', userData);
      if (response.data && response.data.success) {
        return response.data.data;
      } else {
        return rejectWithValue(response.data?.message || 'Error al crear usuario');
      }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Error al crear usuario');
    }
  }
);

export const updateUser = createAsyncThunk(
  'users/updateUser',
  async ({ id, data }: { id: string; data: Partial<User> }, { rejectWithValue }) => {
    try {
      const response = await api.put<ApiResponse<User>>(`/usuarios/${id}`, data);
      if (response.data) {
        // Return the updated user data directly
        return response.data.data || response.data; // Handle both { data: user } and user responses
      }
      return rejectWithValue('Error al actualizar el usuario');
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Error al actualizar el usuario';
      console.error('Update user error:', error);
      return rejectWithValue(errorMessage);
    }
  }
);

export const deleteUser = createAsyncThunk(
  'users/deleteUser',
  async (userId: string, { rejectWithValue }) => {
    try {
      await api.delete<ApiResponse<void>>(`/usuarios/${userId}`);
      return userId;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Error al eliminar el usuario';
      console.error('Delete user error:', error);
      return rejectWithValue(errorMessage);
    }
  }
);

const usersSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch users
      .addCase(fetchUsers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.loading = false;
        state.users = action.payload;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Fetch pending users
      .addCase(fetchPendingUsers.fulfilled, (state, action) => {
        state.pendingUsers = action.payload;
      })
      // Approve user
      .addCase(approveUser.fulfilled, (state, action) => {
        const approvedUser = action.payload;
        state.pendingUsers = state.pendingUsers.filter(user => user._id !== approvedUser._id);
        if (!state.users) state.users = [];
        state.users.push(approvedUser);
      })
      // Reject user
      .addCase(rejectUser.fulfilled, (state, action) => {
        const userId = action.payload;
        state.pendingUsers = state.pendingUsers.filter(user => user._id !== userId);
      })
      // Create user
      .addCase(createUser.fulfilled, (state, action) => {
        if (!state.users) state.users = [];
        state.users.push(action.payload);
      })
      // Update user
      .addCase(updateUser.fulfilled, (state, action) => {
        const updatedUser = action.payload;
        const index = state.users.findIndex(user => user._id === updatedUser._id);
        if (index !== -1) {
          state.users[index] = updatedUser;
        }
      })
      // Delete user
      .addCase(deleteUser.fulfilled, (state, action) => {
        const userId = action.payload;
        state.users = state.users.filter(user => user._id !== userId);
      })
      .addCase(deleteUser.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const { clearError } = usersSlice.actions;
export default usersSlice.reducer;
