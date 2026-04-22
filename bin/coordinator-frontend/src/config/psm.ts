export const GUARDIAN_ENDPOINT = process.env.NEXT_PUBLIC_GUARDIAN_ENDPOINT || process.env.NEXT_PUBLIC_PSM_ENDPOINT || 'https://guardian.openzeppelin.com';
export const MIDEN_RPC_URL = process.env.NEXT_PUBLIC_MIDEN_RPC_URL || 'https://rpc.testnet.miden.io';
export const MIDEN_NOTE_TRANSPORT_URL = process.env.NEXT_PUBLIC_MIDEN_NOTE_TRANSPORT_URL || 'testnet';
export const MIDEN_DB_NAME = 'MidenClientDB';
/** @deprecated Use GUARDIAN_ENDPOINT */
export const PSM_ENDPOINT = GUARDIAN_ENDPOINT;

export const PARA_API_KEY = process.env.NEXT_PUBLIC_PARA_API_KEY || '';
export const PARA_ENVIRONMENT = (process.env.NEXT_PUBLIC_PARA_ENVIRONMENT || 'development') as
  | 'development'
  | 'production';
