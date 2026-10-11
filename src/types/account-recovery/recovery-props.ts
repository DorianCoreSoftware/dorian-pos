import { AccountRecoveryType } from "../../services/accountRecoveryService";

export interface RecoveryProps {
  visible: boolean;
  type: AccountRecoveryType;
  initialIdentifier?: string;
  onClose: () => void;
}