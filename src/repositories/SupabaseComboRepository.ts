import { SupabaseClient } from '@supabase/supabase-js';

import {
    ComboComponentProductRule,
    ComboComponentType,
    ComboProductOption,
    ComboProductRuleType,
    ComboRecipe,
    ComboRecipeComponent,
    ComboSelectionMode,
} from "../domain/entities/ComboRecipe";
import { ComboRepository } from './ComboRepository';



interface ComboRecipeRow {
    id: string;
    combo_product_id: string;
    enabled: boolean;
}

interface ComboRecipeComponentRow {
    id: string;
    combo_recipe_id: string;
    slot_key: string;
    component_type: string;
    label: string;
    selection_mode: string;
    fixed_product_id: string | null;
    product_category_id: string | null;
    allows_notes: boolean;
    requires_meat: boolean;
    requires_sauce: boolean;
    requires_drink_flavor: boolean;
    position: number;
}

interface ComboComponentProductRow {
    combo_component_id: string;
    product_id: string;
    rule_type: string;
}

interface ProductRow {
    id: string;
    category_id: string;
    name: string;
    description: string | null;
    price: number | string;
    image_url: string | null;
    is_available: boolean | null;
    is_active: boolean | null;
    is_combo_option: boolean | null;
}

export class SupabaseComboRepository implements ComboRepository {
    constructor(
        private readonly supabase: SupabaseClient
    ) { }

    async getRecipeByComboProductId(
        comboProductId: string,
    ): Promise<ComboRecipe | null> {
        const recipe =
            await this.getRecipe(
                comboProductId,
            );

        if (!recipe) {
            return null;
        }

        const componentRows =
            await this.getComponents(
                recipe.id,
            );

        if (componentRows.length === 0) {
            return {
                id: recipe.id,
                comboProductId:
                    recipe.combo_product_id,
                enabled: recipe.enabled,
                components: [],
            };
        }

        const componentIds =
            componentRows.map(
                component => component.id,
            );

        const rules =
            await this.getComponentRules(
                componentIds,
            );

        const productIds =
            this.getRequiredProductIds(
                componentRows,
                rules,
            );

        const categoryIds =
            this.getSelectableCategoryIds(
                componentRows,
            );

        const [
            referencedProducts,
            categoryProducts,
        ] = await Promise.all([
            this.getProductsByIds(
                productIds,
            ),
            this.getProductsByCategoryIds(
                categoryIds,
            ),
        ]);

        const allProducts = [
            ...referencedProducts,
            ...categoryProducts,
        ];

        const uniqueProductIds = Array.from(
            new Set(
                allProducts.map(
                    product => product.id,
                ),
            ),
        );

        const flavorRows =
            await this.getProductFlavors(
                uniqueProductIds,
            );

        const flavorsByProductId = new Map<
            string,
            ProductFlavorRow[]
        >();

        flavorRows.forEach(flavor => {
            const currentFlavors =
                flavorsByProductId.get(
                    flavor.product_id,
                ) ?? [];

            currentFlavors.push(flavor);

            flavorsByProductId.set(
                flavor.product_id,
                currentFlavors,
            );
        });

        const addFlavors = (
            product: ComboProductOption,
        ): ComboProductOption => ({
            ...product,
            flavors: this.mapFlavors(
                flavorsByProductId.get(
                    product.id,
                ) ?? [],
            ),
        });

        const referencedProductsWithFlavors =
            referencedProducts.map(
                addFlavors,
            );

        const categoryProductsWithFlavors =
            categoryProducts.map(
                addFlavors,
            );

        const productsById = new Map<
            string,
            ComboProductOption
        >();

        referencedProductsWithFlavors.forEach(
            product => {
                productsById.set(
                    product.id,
                    product,
                );
            },
        );

        categoryProductsWithFlavors.forEach(
            product => {
                productsById.set(
                    product.id,
                    product,
                );
            },
        );

        const rulesByComponentId =
            this.groupRulesByComponentId(
                rules,
            );

        const productsByCategoryId =
            this.groupProductsByCategoryId(
                categoryProductsWithFlavors,
            );

        const components =
            componentRows.map(
                component =>
                    this.mapComponent({
                        component,
                        productsById,
                        rules:
                            rulesByComponentId.get(
                                component.id,
                            ) ?? [],
                        categoryProducts:
                            component.product_category_id
                                ? productsByCategoryId.get(
                                    component.product_category_id,
                                ) ?? []
                                : [],
                    }),
            );

        return {
            id: recipe.id,
            comboProductId:
                recipe.combo_product_id,
            enabled: recipe.enabled,
            components,
        };
    }

    private mapFlavors(
        flavors: ProductFlavorRow[],
    ): ComboProductOption['flavors'] {
        return flavors.map(flavor => ({
            id: flavor.id,
            productId: flavor.product_id,
            modifierId: flavor.modifier_id,
            name: flavor.name,
            isAvailable: flavor.is_available,
            position: flavor.position,
        }));
    }

    private async getProductFlavors(
        productIds: string[],
    ): Promise<ProductFlavorRow[]> {
        if (productIds.length === 0) {
            console.log(
                '⚠️ No se recibieron productos para buscar sabores',
            );

            return [];
        }

        const { data, error } =
            await this.supabase
                .from('product_flavors')
                .select(`
        id,
        product_id,
        modifier_id,
        name,
        is_available,
        position
      `)
                .in('product_id', productIds)
                .eq('is_available', true)
                .order('position', {
                    ascending: true,
                });

        console.log(
            '🥤 Sabores recibidos desde Supabase:',
            {
                data,
                error,
            },
        );

        if (error) {
            throw new Error(
                `No fue posible obtener los sabores: ${error.message}`,
            );
        }

        return (data ?? []) as ProductFlavorRow[];
    }

    private async getRecipe(
        comboProductId: string,
    ): Promise<ComboRecipeRow | null> {
        const {
            data: sessionData,
            error: sessionError,
        } = await this.supabase.auth.getSession();

        console.log('🔐 Sesión Supabase:', {
            userId:
                sessionData.session?.user.id ?? null,
            role:
                sessionData.session?.user.role ?? null,
            sessionError,
        });

        const {
            data: visibleRecipes,
            error: visibleRecipesError,
        } = await this.supabase
            .from('combo_recipes')
            .select(`
      id,
      combo_product_id,
      enabled
    `)
            .limit(5);

        const { data, error } = await this.supabase
            .from('combo_recipes')
            .select(`
      id,
      combo_product_id,
      enabled
    `)
            .eq(
                'combo_product_id',
                comboProductId,
            )
            .eq('enabled', true)
            .maybeSingle<ComboRecipeRow>();

        if (error) {
            throw new Error(
                `No fue posible obtener la receta del combo: ${error.message}`,
            );
        }

        return data;
    }

    private async getComponents(
        recipeId: string
    ): Promise<ComboRecipeComponentRow[]> {
        const { data, error } = await this.supabase
            .from('combo_recipe_components')
            .select(`
        id,
        combo_recipe_id,
        slot_key,
        component_type,
        label,
        selection_mode,
        fixed_product_id,
        product_category_id,
        allows_notes,
        requires_meat,
        requires_sauce,
        requires_drink_flavor,
        position
      `)
            .eq('combo_recipe_id', recipeId)
            .order('position', {
                ascending: true,
            });

        if (error) {
            throw new Error(
                `No fue posible obtener los componentes del combo: ${error.message}`
            );
        }

        return (data ?? []) as ComboRecipeComponentRow[];
    }

    private async getComponentRules(
        componentIds: string[]
    ): Promise<ComboComponentProductRow[]> {
        if (componentIds.length === 0) {
            return [];
        }

        const { data, error } = await this.supabase
            .from('combo_component_products')
            .select(`
        combo_component_id,
        product_id,
        rule_type
      `)
            .in('combo_component_id', componentIds);

        if (error) {
            throw new Error(
                `No fue posible obtener las reglas del combo: ${error.message}`
            );
        }

        return (data ?? []) as ComboComponentProductRow[];
    }

    private async getProductsByIds(
        productIds: string[]
    ): Promise<ComboProductOption[]> {
        if (productIds.length === 0) {
            return [];
        }

        const { data, error } = await this.supabase
            .from('products')
            .select(`
        id,
        category_id,
        name,
        description,
        price,
        image_url,
        is_available,
        is_active,
        is_combo_option
      `)
            .in('id', productIds);

        if (error) {
            throw new Error(
                `No fue posible obtener los productos del combo: ${error.message}`
            );
        }

        return ((data ?? []) as ProductRow[]).map(
            product => this.mapProduct(product)
        );
    }

    private async getProductsByCategoryIds(
        categoryIds: string[]
    ): Promise<ComboProductOption[]> {
        if (categoryIds.length === 0) {
            return [];
        }

        const { data, error } = await this.supabase
            .from('products')
            .select(`
        id,
        category_id,
        name,
        description,
        price,
        image_url,
        is_available,
        is_active,
        is_combo_option
      `)
            .in('category_id', categoryIds)
            .eq('is_active', true)
            .eq('is_available', true)
            .eq('is_combo_option', true)
            .order('name', {
                ascending: true,
            });

        if (error) {
            throw new Error(
                `No fue posible obtener las opciones del combo: ${error.message}`
            );
        }

        return ((data ?? []) as ProductRow[]).map(
            product => this.mapProduct(product)
        );
    }

    private mapComponent(params: {
        component: ComboRecipeComponentRow;
        productsById: Map<string, ComboProductOption>;
        rules: ComboComponentProductRow[];
        categoryProducts: ComboProductOption[];
    }): ComboRecipeComponent {
        const {
            component,
            productsById,
            rules,
            categoryProducts,
        } = params;

        const mappedRules: ComboComponentProductRule[] =
            rules.map(rule => ({
                productId: rule.product_id,
                ruleType: this.parseRuleType(rule.rule_type),
            }));

        const options =
            component.selection_mode === 'selectable'
                ? this.applyProductRules(
                    categoryProducts,
                    mappedRules
                )
                : [];

        const fixedProduct = component.fixed_product_id
            ? productsById.get(component.fixed_product_id) ?? null
            : null;

        if (
            component.selection_mode === 'fixed' &&
            component.fixed_product_id &&
            !fixedProduct
        ) {
            throw new Error(
                `No se encontró el producto fijo del componente "${component.label}".`
            );
        }

        return {
            id: component.id,
            slotKey: component.slot_key,
            type: this.parseComponentType(
                component.component_type
            ),
            label: component.label,
            selectionMode: this.parseSelectionMode(
                component.selection_mode
            ),
            position: component.position,

            fixedProductId: component.fixed_product_id,
            selectableCategoryId:
                component.product_category_id,

            allowsNotes: component.allows_notes,
            requiresMeat: component.requires_meat,
            requiresSauce: component.requires_sauce,
            requiresDrinkFlavor:
                component.requires_drink_flavor,

            fixedProduct,
            options,
            rules: mappedRules,
        };
    }

    private applyProductRules(
        products: ComboProductOption[],
        rules: ComboComponentProductRule[]
    ): ComboProductOption[] {
        const allowedIds = new Set(
            rules
                .filter(rule => rule.ruleType === 'allowed')
                .map(rule => rule.productId)
        );

        const excludedIds = new Set(
            rules
                .filter(rule => rule.ruleType === 'excluded')
                .map(rule => rule.productId)
        );

        return products.filter(product => {
            if (excludedIds.has(product.id)) {
                return false;
            }

            /*
             * Cuando existen reglas allowed, únicamente esos productos
             * pueden mostrarse.
             *
             * Si no existen reglas allowed, se permite toda la categoría,
             * salvo los productos excluidos.
             */
            if (
                allowedIds.size > 0 &&
                !allowedIds.has(product.id)
            ) {
                return false;
            }

            return true;
        });
    }

    private getRequiredProductIds(
        components: ComboRecipeComponentRow[],
        rules: ComboComponentProductRow[]
    ): string[] {
        const ids = new Set<string>();

        components.forEach(component => {
            if (component.fixed_product_id) {
                ids.add(component.fixed_product_id);
            }
        });

        rules.forEach(rule => {
            ids.add(rule.product_id);
        });

        return Array.from(ids);
    }

    private getSelectableCategoryIds(
        components: ComboRecipeComponentRow[]
    ): string[] {
        const ids = new Set<string>();

        components.forEach(component => {
            if (
                component.selection_mode === 'selectable' &&
                component.product_category_id
            ) {
                ids.add(component.product_category_id);
            }
        });

        return Array.from(ids);
    }

    private groupRulesByComponentId(
        rules: ComboComponentProductRow[]
    ): Map<string, ComboComponentProductRow[]> {
        const result = new Map<
            string,
            ComboComponentProductRow[]
        >();

        rules.forEach(rule => {
            const current =
                result.get(rule.combo_component_id) ?? [];

            current.push(rule);

            result.set(rule.combo_component_id, current);
        });

        return result;
    }

    private groupProductsByCategoryId(
        products: ComboProductOption[]
    ): Map<string, ComboProductOption[]> {
        const result = new Map<
            string,
            ComboProductOption[]
        >();

        products.forEach(product => {
            const current =
                result.get(product.categoryId) ?? [];

            current.push(product);

            result.set(product.categoryId, current);
        });

        return result;
    }

    private mapProduct(
        row: ProductRow,
        flavors: ProductFlavorRow[] = [],
    ): ComboProductOption {
        return {
            id: row.id,
            categoryId: row.category_id,
            name: row.name,
            description: row.description,
            price: Number(row.price),
            imageUrl: row.image_url,
            isAvailable: row.is_available ?? false,
            isActive: row.is_active ?? false,
            isComboOption: row.is_combo_option ?? false,
            flavors: flavors.map(flavor => ({
                id: flavor.id,
                productId: flavor.product_id,
                modifierId: flavor.modifier_id,
                name: flavor.name,
                isAvailable: flavor.is_available,
                position: flavor.position,
            })),
        };
    }

    private parseComponentType(
        value: string
    ): ComboComponentType {
        const validValues: ComboComponentType[] = [
            'burger',
            'hotdog',
            'side',
            'drink',
        ];

        if (
            validValues.includes(
                value as ComboComponentType
            )
        ) {
            return value as ComboComponentType;
        }

        throw new Error(
            `Tipo de componente de combo inválido: ${value}`
        );
    }

    private parseSelectionMode(
        value: string
    ): ComboSelectionMode {
        if (
            value === 'fixed' ||
            value === 'selectable'
        ) {
            return value;
        }

        throw new Error(
            `Modo de selección de combo inválido: ${value}`
        );
    }

    private parseRuleType(
        value: string
    ): ComboProductRuleType {
        if (
            value === 'allowed' ||
            value === 'excluded'
        ) {
            return value;
        }

        throw new Error(
            `Tipo de regla de combo inválido: ${value}`
        );
    }
}

interface ProductFlavorRow {
    id: string;
    product_id: string;
    modifier_id: string;
    name: string;
    is_available: boolean;
    position: number;
}