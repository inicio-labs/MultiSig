// Transaction-related types
export interface InputNoteId {
  note_id: string;
  note_id_file_bytes: string;
}

export interface Transaction {
  id: string;
  multisig_account_address: string;
  status: string;
  tx_request: string;
  tx_summary: string;
  tx_summary_commit: string;
  signature_count: number;
  created_at: string;
  updated_at: string;
  input_note_ids?: InputNoteId[];
  // Keep old fields for backward compatibility
  tx_id?: string;
  sigs_count?: number;
  tx_summary_commitment?: string;
  tx_bz?: string;
  decoded_data?: {
    type: string;
    timestamp: number;
    recipient: string;
    amount: number;
    currency: string;
    priority: string;
    memo: string;
  };
}

export interface GetAccountTransactionsResponse {
  txs: Transaction[];
}

export interface CreateTransactionRequest {
  contract_id: string;
  tx_effect: string;
  tx_bz: string;
}

export interface GetTransactionByHashResponse {
  tx_id: string;
  status: string;
  sigs_count: number;
  tx_summary_commitment: string;
  tx_bz: string;
}

export interface TransactionStats {
  total: number;
  last_month: number;
  total_success: number;
}

export interface GetTransactionStatsResponse {
  tx_stats: TransactionStats;
}

export interface Approver {
  address: string;
  pub_key_commit: string;
  created_at: string;
  updated_at: string;
}

export interface GetApproverListResponse {
  approvers: Approver[];
}

export interface MultisigAccount {
  address: string;
  kind: string;
  threshold: number;
  created_at: string;
  updated_at: string;
}

export interface GetMultisigAccountDetailsResponse {
  multisig_account: MultisigAccount;
} 