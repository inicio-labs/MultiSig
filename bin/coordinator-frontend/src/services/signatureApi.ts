// API service for signature operations
import { createAsyncThunk } from '@reduxjs/toolkit';
import { setLoading, setError } from '../store/slices/signatureSlice';
import {
  AddSignatureRequest,
  GetTransactionThresholdStatusResponse
} from '../types';
import { API_BASE_URL } from '../config/api';

export const addSignature = async (txId: string, signatureData: AddSignatureRequest): Promise<boolean> => {
  try {
    const payload = signatureData;
    
    const response = await fetch(`${API_BASE_URL}/api/v1/signature/add`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
     
      const errorText = await response.text();
      console.error('Signature API error response:', errorText);
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    const responseText = await response.text();
    
    if (responseText.trim() === '') {
      return true;
    }
    
    if (/^\d+$/.test(responseText.trim())) {

      return true;
    }
    
    try {
      const responseData = JSON.parse(responseText);
      return true;
    } catch (parseError) {
      return true;
    }
  } catch (error) {
    console.error('Error adding signature:', error);
    throw error;
  }
};

export const addSignatureThunk = createAsyncThunk(
  'signature/addSignature',
  async ({ txId, signatureData }: { txId: string; signatureData: AddSignatureRequest }, { dispatch }) => {
    try {
      dispatch(setLoading(true));
      dispatch(setError(null));
      
      
      const result = await addSignature(txId, signatureData);
      
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return result;
    } catch (error) {
      console.error('Error in addSignatureThunk:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to add signature';
      dispatch(setError(errorMessage));
      throw error;
    } finally {
      dispatch(setLoading(false));
    }
  }
);

// Get Transaction Threshold Status
export const getTransactionThresholdStatus = async (txId: string): Promise<GetTransactionThresholdStatusResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/transactions/${txId}/threshold`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting transaction threshold status:', error);
    throw error;
  }
};

// Thunk for getting transaction threshold status
export const getTransactionThresholdStatusThunk = createAsyncThunk(
  'signature/getTransactionThresholdStatus',
  async (txId: string, { dispatch }) => {
    try {
      dispatch(setLoading(true));
      dispatch(setError(null));
      
      const response = await getTransactionThresholdStatus(txId);
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get transaction threshold status';
      dispatch(setError(errorMessage));
      throw error;
    } finally {
      dispatch(setLoading(false));
    }
  }
); 