import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { addSignatureThunk, getTransactionThresholdStatusThunk } from '../../services/signatureApi';
import { ThresholdStatus } from '../../types';

interface SignatureState {
  loading: boolean;
  error: string | null;
  lastSignatureResult: boolean | null;
  thresholdStatus: ThresholdStatus | null;
}

const initialState: SignatureState = {
  loading: false,
  error: null,
  lastSignatureResult: null,
  thresholdStatus: null,
};

const signatureSlice = createSlice({
  name: 'signature',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    clearSignatureState: (state) => {
      state.loading = false;
      state.error = null;
      state.lastSignatureResult = null;
      state.thresholdStatus = null;
    },
    setThresholdStatus: (state, action: PayloadAction<ThresholdStatus>) => {
      state.thresholdStatus = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Add signature thunk cases
      .addCase(addSignatureThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addSignatureThunk.fulfilled, (state) => {
        state.loading = false;
        state.lastSignatureResult = true;
      })
      .addCase(addSignatureThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to add signature';
        state.lastSignatureResult = false;
      })
      // Get transaction threshold status thunk cases
      .addCase(getTransactionThresholdStatusThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getTransactionThresholdStatusThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.thresholdStatus = action.payload;
      })
      .addCase(getTransactionThresholdStatusThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to get transaction threshold status';
      });
  },
});

export const { setLoading, setError, clearSignatureState, setThresholdStatus } = signatureSlice.actions;
export default signatureSlice.reducer; 