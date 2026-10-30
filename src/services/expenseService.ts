import { supabase } from './supabase';

export type ExpensePaymentMethod =
  | 'cash'
  | 'card'
  | 'transfer'
  | 'other';

export interface ExpenseCategory {
  id: string;
  name: string;
  position: number;
  isActive: boolean;
}

export interface ExpenseRecord {
  id: string;
  categoryId: string;
  categoryName: string;
  amount: number;
  description: string;
  paymentMethod: ExpensePaymentMethod;
  expenseAt: string;
  recordedBy: string;
  recordedByName: string;
  receiptUrl: string | null;
  sourceType: string | null;
  sourceId: string | null;
  isGenerated: boolean;
}

interface ExpenseCategoryRow {
  id: string;
  name: string;
  position: number;
  is_active: boolean;
}

interface ExpenseRow {
  id: string;
  category_id: string;
  amount: number | string;
  description: string;
  payment_method: ExpensePaymentMethod;
  expense_at: string;
  recorded_by: string;
  receipt_url: string | null;
  source_type: string | null;
  source_id: string | null;
  expense_categories?: { name?: string | null } | null;
  profiles?: { first_name?: string | null; last_name?: string | null } | null;
}

export interface SaveExpenseInput {
  id?: string;
  categoryId: string;
  amount: number;
  description: string;
  paymentMethod: ExpensePaymentMethod;
  expenseAt: Date;
}

export async function getExpenseCategories(
  includeInactive = false,
): Promise<ExpenseCategory[]> {
  let query = supabase
    .from('expense_categories')
    .select('id,name,position,is_active')
    .order('position', { ascending: true })
    .order('name', { ascending: true });

  if (!includeInactive) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;
  if (error) throw error;

  return ((data ?? []) as ExpenseCategoryRow[]).map(row => ({
    id: row.id,
    name: row.name,
    position: row.position,
    isActive: row.is_active,
  }));
}

export async function saveExpenseCategory(input: {
  id?: string;
  name: string;
  position?: number;
  isActive?: boolean;
}): Promise<string> {
  const name = input.name.trim();
  if (!name) throw new Error('Ingresa el nombre de la categoría.');

  const payload = {
    name,
    position: input.position ?? 0,
    is_active: input.isActive ?? true,
    updated_at: new Date().toISOString(),
  };

  if (input.id) {
    const { error } = await supabase
      .from('expense_categories')
      .update(payload)
      .eq('id', input.id);
    if (error) throw error;
    return input.id;
  }

  const { data, error } = await supabase
    .from('expense_categories')
    .insert(payload)
    .select('id')
    .single();

  if (error) throw error;
  return String(data.id);
}

export async function setExpenseCategoryActive(
  id: string,
  isActive: boolean,
): Promise<void> {
  const { error } = await supabase
    .from('expense_categories')
    .update({
      is_active: isActive,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) throw error;
}

export async function getExpenses(
  from: Date,
  to: Date,
): Promise<ExpenseRecord[]> {
  const { data, error } = await supabase
    .from('business_expenses')
    .select(`
      id,
      category_id,
      amount,
      description,
      payment_method,
      expense_at,
      recorded_by,
      receipt_url,
      source_type,
      source_id,
      expense_categories:category_id(name),
      profiles:recorded_by(first_name,last_name)
    `)
    .gte('expense_at', from.toISOString())
    .lte('expense_at', to.toISOString())
    .order('expense_at', { ascending: false });

  if (error) throw error;

  return ((data ?? []) as unknown as ExpenseRow[]).map(row => {
    const firstName = row.profiles?.first_name?.trim() ?? '';
    const lastName = row.profiles?.last_name?.trim() ?? '';

    return {
      id: row.id,
      categoryId: row.category_id,
      categoryName: row.expense_categories?.name ?? 'Sin categoría',
      amount: Number(row.amount ?? 0),
      description: row.description,
      paymentMethod: row.payment_method,
      expenseAt: row.expense_at,
      recordedBy: row.recorded_by,
      recordedByName: `${firstName} ${lastName}`.trim() || 'Usuario',
      receiptUrl: row.receipt_url,
      sourceType: row.source_type ?? null,
      sourceId: row.source_id ?? null,
      isGenerated: Boolean(row.source_type),
    };
  });
}

export async function saveExpense(
  input: SaveExpenseInput,
): Promise<string> {
  if (!input.categoryId) throw new Error('Selecciona una categoría.');
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error('El monto debe ser mayor que cero.');
  }

  const description = input.description.trim();
  if (!description) throw new Error('Ingresa una descripción.');

  const payload = {
    category_id: input.categoryId,
    amount: Number(input.amount.toFixed(2)),
    description,
    payment_method: input.paymentMethod,
    expense_at: input.expenseAt.toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (input.id) {
    const { error } = await supabase
      .from('business_expenses')
      .update(payload)
      .eq('id', input.id);
    if (error) throw error;
    return input.id;
  }

  const { data, error } = await supabase
    .from('business_expenses')
    .insert(payload)
    .select('id')
    .single();

  if (error) throw error;
  return String(data.id);
}

export async function deleteExpense(id: string): Promise<void> {
  const { error } = await supabase
    .from('business_expenses')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
