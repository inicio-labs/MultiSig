// Signature-related types
export interface AddSignatureRequest {
  tx_id: string;
  approver: string;
  signature: string;
}

export interface ThresholdStatus {
  tx_id: string;
  contract_id: string;
  status: string;
  threshold: number;
  signature_count: number;
  threshold_met: boolean;
}

export interface GetTransactionThresholdStatusResponse {
  tx_id: string;
  contract_id: string;
  status: string;
  threshold: number;
  signature_count: number;
  threshold_met: boolean;
} 