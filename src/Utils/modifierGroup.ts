import {
  Modifier,
} from '../types';

export function getModifierGroupLabel(
  modifier:
    Pick<
      Modifier,
      'group'
    >,
): string | null {
  return modifier.group?.name ?? null;
}

export function getModifierGroupCode(
  modifier:
    Pick<
      Modifier,
      'group'
    >,
): string | null {
  return modifier.group?.code ?? null;
}
