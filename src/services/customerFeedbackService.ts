import {
    supabase,
} from './supabase';

export type CustomerFeedbackType =
    | 'suggestion'
    | 'complaint'
    | 'compliment'
    | 'other';

export type CustomerFeedbackStatus =
    | 'new'
    | 'reviewed'
    | 'resolved';

export interface CustomerFeedback {
    id: string;
    feedbackType: CustomerFeedbackType;
    customerName: string | null;
    customerPhone: string | null;
    message: string;
    status: CustomerFeedbackStatus;
    createdAt: string;
    updatedAt: string;
}

interface CustomerFeedbackRow {
    id: string;
    feedback_type: CustomerFeedbackType;
    customer_name: string | null;
    customer_phone: string | null;
    message: string;
    status: CustomerFeedbackStatus;
    created_at: string;
    updated_at: string;
}

export async function getCustomerFeedback():
    Promise<CustomerFeedback[]> {
    const {
        data,
        error,
    } = await supabase
        .from(
            'customer_feedback',
        )
        .select(
            [
                'id',
                'feedback_type',
                'customer_name',
                'customer_phone',
                'message',
                'status',
                'created_at',
                'updated_at',
            ].join(', '),
        )
        .order(
            'created_at',
            {
                ascending:
                    false,
            },
        )
        .limit(
            200,
        )
        .returns<CustomerFeedbackRow[]>();

    if (error) {
        throw new Error(
            `No se pudo cargar el buzón: ${error.message}`,
        );
    }

    return (
        data ?? []
    ).map(
        row => ({
            id:
                row.id,

            feedbackType:
                row.feedback_type,

            customerName:
                row.customer_name,

            customerPhone:
                row.customer_phone,

            message:
                row.message,

            status:
                row.status,

            createdAt:
                row.created_at,

            updatedAt:
                row.updated_at,
        }),
    );
}

export async function updateCustomerFeedbackStatus(
    id: string,
    status: CustomerFeedbackStatus,
): Promise<void> {
    const {
        error,
    } = await supabase
        .from(
            'customer_feedback',
        )
        .update({
            status,

            updated_at:
                new Date().toISOString(),
        })
        .eq(
            'id',
            id,
        );

    if (error) {
        throw new Error(
            `No se pudo actualizar el comentario: ${error.message}`,
        );
    }
}