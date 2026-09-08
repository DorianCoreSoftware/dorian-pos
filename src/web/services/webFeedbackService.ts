import {
  supabase,
} from '../../services/supabase';

export type WebFeedbackType =
  | 'suggestion'
  | 'complaint'
  | 'compliment'
  | 'other';

export interface SubmitWebFeedbackInput {
  type: WebFeedbackType;
  message: string;
  customerName?: string;
  customerPhone?: string;
}

export async function submitWebFeedback(
  input: SubmitWebFeedbackInput,
): Promise<string> {
  const {
    data,
    error,
  } = await supabase.rpc(
    'submit_customer_feedback',
    {
      p_feedback_type:
        input.type,

      p_message:
        input.message,

      p_customer_name:
        input.customerName?.trim() ||
        null,

      p_customer_phone:
        input.customerPhone?.trim() ||
        null,
    },
  );

  if (error) {
    throw new Error(
      error.message ||
      'No se pudo enviar tu mensaje.',
    );
  }

  if (!data) {
    throw new Error(
      'No se pudo confirmar el envío.',
    );
  }

  return String(
    data,
  );
}
