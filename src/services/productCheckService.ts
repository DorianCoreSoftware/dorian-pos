import { supabase } from './supabase';
import {
  ProductCheckAssignment,
  ProductCheckGroup,
  ProductCheckOption,
  SelectedProductCheck,
} from '../types';

function mapGroup(row: any): ProductCheckGroup {
  return {
    id: row.id,
    productId: row.product_id ?? null,
    categoryId: row.category_id ?? null,
    source: row.category_id ? 'category' : 'product',
    name: row.name,
    position: Number(row.position ?? 0),
    isActive: row.is_active !== false,
  };
}

function mapOption(row: any): ProductCheckOption {
  return {
    id: row.id,
    groupId: row.group_id,
    name: row.name,
    position: Number(row.position ?? 0),
    isActive: row.is_active !== false,
    defaultSelected: row.default_selected !== false,
  };
}

/** Legacy helper kept for compatibility with the removed Admin Checks screen. */
export async function getProductCheckGroups(includeInactive = false): Promise<ProductCheckGroup[]> {
  let q = supabase.from('product_check_groups').select('*').order('position').order('name');
  if (!includeInactive) q = q.eq('is_active', true);
  const { data, error } = await q;
  if (error) throw new Error(`No se pudieron cargar los grupos de personalización: ${error.message}`);
  return (data ?? []).map(mapGroup);
}

export async function getProductCheckOptions(groupId: string, includeInactive = false): Promise<ProductCheckOption[]> {
  let q = supabase.from('product_check_options').select('*').eq('group_id', groupId).order('position').order('name');
  if (!includeInactive) q = q.eq('is_active', true);
  const { data, error } = await q;
  if (error) throw new Error(`No se pudieron cargar las opciones de personalización: ${error.message}`);
  return (data ?? []).map(mapOption);
}

/** Load groups owned directly by one product. */
export async function getOwnProductPersonalizationGroups(productId: string): Promise<ProductCheckAssignment[]> {
  const { data, error } = await supabase
    .from('product_check_groups')
    .select('*')
    .eq('product_id', productId)
    .eq('is_active', true)
    .order('position')
    .order('name');

  if (error) throw new Error(`No se pudo cargar la personalización propia del producto: ${error.message}`);
  return hydrateAssignments((data ?? []) as any[], productId);
}

/** Load groups owned by one category. */
export async function getCategoryPersonalizationGroups(categoryId: string): Promise<ProductCheckAssignment[]> {
  const { data, error } = await supabase
    .from('product_check_groups')
    .select('*')
    .eq('category_id', categoryId)
    .eq('is_active', true)
    .order('position')
    .order('name');

  if (error) throw new Error(`No se pudo cargar la personalización de la categoría: ${error.message}`);
  return hydrateAssignments((data ?? []) as any[], '');
}

async function hydrateAssignments(rows: any[], productId: string): Promise<ProductCheckAssignment[]> {
  const result: ProductCheckAssignment[] = [];
  for (const row of rows) {
    const options = await getProductCheckOptions(row.id);
    result.push({
      id: row.id,
      productId,
      groupId: row.id,
      minSelections: 0,
      maxSelections: Math.max(1, options.length),
      position: Number(row.position ?? 0),
      isActive: row.is_active !== false,
      group: mapGroup(row),
      options,
    });
  }
  return result;
}

export async function getProductPersonalizationContext(productId: string): Promise<{
  categoryId: string | null;
  categoryName: string | null;
  inheritCategory: boolean;
  ownEnabled: boolean;
}> {
  const { data, error } = await supabase
    .from('products')
    .select('category_id, allow_personalization, inherit_category_personalization, category:categories(name)')
    .eq('id', productId)
    .maybeSingle();
  if (error) throw new Error(`No se pudo consultar la configuración de personalización: ${error.message}`);
  const rawCategory = Array.isArray((data as any)?.category)
    ? (data as any).category[0] ?? null
    : (data as any)?.category ?? null;
  return {
    categoryId: (data as any)?.category_id ?? null,
    categoryName: rawCategory?.name ?? null,
    inheritCategory: (data as any)?.inherit_category_personalization !== false,
    ownEnabled: (data as any)?.allow_personalization === true,
  };
}

/** Effective personalization = inherited category template + product-specific groups. */
export async function getProductPersonalizationGroups(productId: string): Promise<ProductCheckAssignment[]> {
  const context = await getProductPersonalizationContext(productId);
  const [categoryGroups, ownGroups] = await Promise.all([
    context.inheritCategory && context.categoryId
      ? getCategoryPersonalizationGroups(context.categoryId)
      : Promise.resolve([]),
    context.ownEnabled
      ? getOwnProductPersonalizationGroups(productId)
      : Promise.resolve([]),
  ]);

  return [
    ...categoryGroups.map(group => ({ ...group, productId })),
    ...ownGroups,
  ];
}

export async function getEnabledProductPersonalizationGroups(productId: string): Promise<ProductCheckAssignment[]> {
  return getProductPersonalizationGroups(productId);
}

export async function setProductCategoryPersonalizationInheritance(productId: string, enabled: boolean): Promise<void> {
  const { error } = await supabase
    .from('products')
    .update({ inherit_category_personalization: enabled })
    .eq('id', productId);
  if (error) throw new Error(`No se pudo cambiar la herencia de personalización: ${error.message}`);
}

export async function createCategoryPersonalizationGroup(categoryId: string, name: string): Promise<ProductCheckGroup> {
  const clean = name.trim();
  if (!clean) throw new Error('El nombre del grupo es obligatorio.');
  const { data, error } = await supabase
    .from('product_check_groups')
    .insert({ category_id: categoryId, product_id: null, name: clean })
    .select('*')
    .single();
  if (error) throw new Error(`No se pudo crear el grupo de categoría: ${error.message}`);
  return mapGroup(data);
}

/** Legacy assignment loader kept so older files still type-check. */
export async function getProductCheckAssignments(productId: string): Promise<ProductCheckAssignment[]> {
  return getProductPersonalizationGroups(productId);
}

export async function getProductPersonalizationEnabled(productId: string): Promise<boolean> {
  const groups = await getProductPersonalizationGroups(productId);
  return groups.length > 0;
}

export async function setProductPersonalizationEnabled(productId: string, enabled: boolean): Promise<void> {
  const { error } = await supabase
    .from('products')
    .update({ allow_personalization: enabled })
    .eq('id', productId);
  if (error) throw new Error(`No se pudo actualizar la personalización: ${error.message}`);
}

export async function createProductPersonalizationGroup(productId: string, name: string): Promise<ProductCheckGroup> {
  const clean = name.trim();
  if (!clean) throw new Error('El nombre del grupo es obligatorio.');
  const { data, error } = await supabase
    .from('product_check_groups')
    .insert({ product_id: productId, name: clean })
    .select('*')
    .single();
  if (error) throw new Error(`No se pudo crear el grupo: ${error.message}`);

  const { error: enableError } = await supabase
    .from('products')
    .update({ allow_personalization: true })
    .eq('id', productId);

  if (enableError) {
    throw new Error(`El grupo se creó, pero no se pudo habilitar la personalización propia: ${enableError.message}`);
  }

  return mapGroup(data);
}

export async function deleteProductPersonalizationGroup(groupId: string): Promise<void> {
  const { error } = await supabase.from('product_check_groups').delete().eq('id', groupId);
  if (error) throw new Error(`No se pudo eliminar el grupo: ${error.message}`);
}

export async function createProductCheckGroup(name: string): Promise<void> {
  // Legacy API. New groups must be created through createProductPersonalizationGroup.
  const clean = name.trim();
  if (!clean) throw new Error('El nombre del grupo es obligatorio.');
  throw new Error('Crea la personalización desde Admin > Productos > Editar producto.');
}

export async function setProductCheckGroupActive(id: string, isActive: boolean): Promise<void> {
  const { error } = await supabase.from('product_check_groups').update({ is_active: isActive }).eq('id', id);
  if (error) throw new Error(`No se pudo cambiar el grupo: ${error.message}`);
}

export async function createProductCheckOption(groupId: string, name: string, defaultSelected = true): Promise<void> {
  const clean = name.trim();
  if (!clean) throw new Error('El nombre de la opción es obligatorio.');
  const { error } = await supabase
    .from('product_check_options')
    .insert({ group_id: groupId, name: clean, default_selected: defaultSelected });
  if (error) throw new Error(`No se pudo crear la opción: ${error.message}`);
}

export async function setProductCheckOptionActive(id: string, isActive: boolean): Promise<void> {
  const { error } = await supabase.from('product_check_options').update({ is_active: isActive }).eq('id', id);
  if (error) throw new Error(`No se pudo cambiar la opción: ${error.message}`);
}

export async function setProductCheckOptionDefault(id: string, defaultSelected: boolean): Promise<void> {
  const { error } = await supabase.from('product_check_options').update({ default_selected: defaultSelected }).eq('id', id);
  if (error) throw new Error(`No se pudo cambiar el valor por defecto: ${error.message}`);
}

export async function deleteProductCheckOption(id: string): Promise<void> {
  const { error } = await supabase.from('product_check_options').delete().eq('id', id);
  if (error) throw new Error(`No se pudo eliminar la opción: ${error.message}`);
}

/** Legacy no-op-compatible function kept for the old screen. */
export async function saveProductCheckAssignment(
  productId: string,
  groupId: string,
  enabled: boolean,
  _minSelections: number,
  _maxSelections: number,
  _position = 0,
): Promise<void> {
  if (!enabled) {
    const { error } = await supabase.from('product_check_groups').update({ is_active: false }).eq('id', groupId).eq('product_id', productId);
    if (error) throw new Error(`No se pudo desactivar el grupo: ${error.message}`);
  }
}

export async function persistOrderProductChecks(
  orderId: string,
  items: Array<{ productId: string; checks: SelectedProductCheck[] }>,
): Promise<void> {
  const { error } = await supabase.rpc('save_order_product_checks', {
    p_order_id: orderId,
    p_items: items.map(item => ({
      productId: item.productId,
      checks: item.checks.map(c => ({
        groupId: c.groupId,
        optionId: c.optionId,
        isSelected: c.isSelected,
      })),
    })),
  });
  if (error) throw new Error(`El pedido se guardó, pero no se pudo registrar su personalización: ${error.message}`);
}
