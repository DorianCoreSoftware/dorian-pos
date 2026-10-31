import { supabase } from './supabase';

export interface BusinessTransferSettings {
  enabled: boolean;
  bankName: string;
  accountHolder: string;
  clabe: string;
  accountNumber: string;
  instructions: string;
  updatedAt?: string | null;
}

export interface EmployeeBankAccount {
  userId: string;
  employeeName: string;
  employeeRole: string;
  bankName: string;
  accountHolder: string;
  clabe: string;
  accountNumber: string;
  notes: string;
  updatedAt: string | null;
}

interface BusinessTransferRow {
  enabled: boolean | null;
  bank_name: string | null;
  account_holder: string | null;
  clabe: string | null;
  account_number: string | null;
  instructions: string | null;
  updated_at?: string | null;
}

interface EmployeeBankRow {
  user_id: string;
  employee_name: string;
  employee_role: string;
  bank_name: string | null;
  account_holder: string | null;
  clabe: string | null;
  account_number: string | null;
  notes: string | null;
  updated_at: string | null;
}

function mapBusinessTransfer(row: BusinessTransferRow | null): BusinessTransferSettings {
  return {
    enabled: row?.enabled ?? false,
    bankName: row?.bank_name?.trim() ?? '',
    accountHolder: row?.account_holder?.trim() ?? '',
    clabe: row?.clabe?.trim() ?? '',
    accountNumber: row?.account_number?.trim() ?? '',
    instructions: row?.instructions?.trim() ?? '',
    updatedAt: row?.updated_at ?? null,
  };
}

export async function getAdminBusinessTransferSettings(): Promise<BusinessTransferSettings> {
  const { data, error } = await supabase.rpc('admin_get_business_transfer_settings');
  if (error) throw new Error(error.message || 'No se pudo obtener la configuración de transferencias.');
  const row = Array.isArray(data) ? (data[0] as BusinessTransferRow | undefined) : null;
  return mapBusinessTransfer(row ?? null);
}

export async function getPublicBusinessTransferSettings(): Promise<BusinessTransferSettings> {
  const { data, error } = await supabase.rpc('get_public_business_transfer_settings');
  if (error) throw new Error(error.message || 'No se pudieron obtener los datos de transferencia.');
  const row = Array.isArray(data) ? (data[0] as BusinessTransferRow | undefined) : null;
  return mapBusinessTransfer(row ?? null);
}

export async function saveAdminBusinessTransferSettings(input: BusinessTransferSettings): Promise<void> {
  const { error } = await supabase.rpc('admin_save_business_transfer_settings', {
    p_enabled: input.enabled,
    p_bank_name: input.bankName,
    p_account_holder: input.accountHolder,
    p_clabe: input.clabe,
    p_account_number: input.accountNumber,
    p_instructions: input.instructions,
  });
  if (error) throw new Error(error.message || 'No se pudo guardar la configuración de transferencias.');
}

export async function getEmployeeBankAccounts(): Promise<EmployeeBankAccount[]> {
  const { data, error } = await supabase.rpc('payroll_get_employee_bank_accounts');
  if (error) throw new Error(error.message || 'No se pudieron obtener los datos bancarios de empleados.');
  return ((data ?? []) as EmployeeBankRow[]).map(row => ({
    userId: row.user_id,
    employeeName: row.employee_name,
    employeeRole: row.employee_role,
    bankName: row.bank_name?.trim() ?? '',
    accountHolder: row.account_holder?.trim() ?? '',
    clabe: row.clabe?.trim() ?? '',
    accountNumber: row.account_number?.trim() ?? '',
    notes: row.notes?.trim() ?? '',
    updatedAt: row.updated_at,
  }));
}

export async function saveEmployeeBankAccount(input: EmployeeBankAccount): Promise<void> {
  const { error } = await supabase.rpc('payroll_save_employee_bank_account', {
    p_user_id: input.userId,
    p_bank_name: input.bankName,
    p_account_holder: input.accountHolder,
    p_clabe: input.clabe,
    p_account_number: input.accountNumber,
    p_notes: input.notes,
  });
  if (error) throw new Error(error.message || 'No se pudieron guardar los datos bancarios del empleado.');
}

export async function setWebOrderPaymentIntent(params: {
  orderId: string;
  clientRequestId: string;
  paymentMethod: 'cash' | 'transfer';
}): Promise<void> {
  const { error } = await supabase.rpc('set_web_order_payment_intent', {
    p_order_id: params.orderId,
    p_client_request_id: params.clientRequestId,
    p_payment_method: params.paymentMethod,
  });
  if (error) throw new Error(error.message || 'No se pudo registrar el método de pago del pedido.');
}
