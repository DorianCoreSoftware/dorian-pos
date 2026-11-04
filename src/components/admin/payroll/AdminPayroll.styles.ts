import {
  StyleSheet,
} from 'react-native';

export const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    minHeight: 0,
  },

  container: {
    flexGrow: 1,
    gap: 14,
    paddingBottom: 32,
  },
  headerCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 18,
    gap: 6,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    maxWidth: 820,
  },
});
