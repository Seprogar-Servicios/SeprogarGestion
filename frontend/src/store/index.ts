import { configureStore } from '@reduxjs/toolkit';
import { useDispatch, useSelector, type TypedUseSelectorHook } from 'react-redux';
import authReducer from './slices/authSlice';
import tasksReducer from './slices/tasksSlice';
import usersReducer from './slices/usersSlice';
import materialsReducer from './slices/materialsSlice';
import especialidadesReducer from './slices/especialidadesSlice';
import observationsReducer from './slices/observationsSlice';
import recibosReducer from './slices/recibosSlice';
import categoriaMaterialReducer from './slices/categoriaMaterialSlice';
import tareaLiquidacionReducer from './slices/tareaLiquidacionSlice';
import motivoPagoReducer from './slices/motivoPagoSlice';
import pagoManualReducer from './slices/pagoManualSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    tasks: tasksReducer,
    users: usersReducer,
    materials: materialsReducer,
    especialidades: especialidadesReducer,
    observations: observationsReducer,
    recibos: recibosReducer,
    categoriaMaterial: categoriaMaterialReducer,
    tareaLiquidacion: tareaLiquidacionReducer,
    motivoPago: motivoPagoReducer,
    pagoManual: pagoManualReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Typed hooks
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
