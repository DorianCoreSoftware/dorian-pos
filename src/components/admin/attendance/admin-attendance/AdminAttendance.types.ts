import type React from 'react';

export type AttendanceSectionKey =
  | 'rules'
  | 'people'
  | 'planning'
  | 'monitoring'
  | 'closing'
  | 'operations';

export interface AccordionSectionProps {
  title: string;
  subtitle: string;
  open: boolean;
  onToggle: () => void;
  children?: React.ReactNode;
}
