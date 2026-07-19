import { supabase } from '../services/supabase';
import { Modifier } from '../types';

interface ModifierDatabaseRecord {
  id: string;
  name: string;
  extra_price: string | number;
  is_available: boolean;
  group_name: 'Carne' | 'Salsa' | null;
}

export async function fetchAvailableModifiers(): Promise<
  Modifier[]
> {
  const { data, error } = await supabase
    .from('modifiers')
    .select(
      `
        id,
        name,
        extra_price,
        is_available,
        group_name
      `,
    )
    .eq('is_available', true)
    .order('name');

  if (error) {
    throw new Error(
      `No se pudieron consultar los modificadores: ${error.message}`,
    );
  }

  return (
    (data as ModifierDatabaseRecord[] | null)?.map(
      (modifier) => ({
        id: modifier.id,
        name: modifier.name,
        extra_price: modifier.extra_price,
        is_available: modifier.is_available,
        group_name: modifier.group_name,
      }),
    ) ?? []
  );
}