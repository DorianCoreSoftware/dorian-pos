import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    width: '100%',
    maxWidth: 1180,
    alignSelf: 'center',
    paddingHorizontal: 18,
    paddingTop: 22,
    paddingBottom: 60,
  },
  header: { marginBottom: 18 },
  title: { fontSize: 28, fontWeight: '900' },
  subtitle: { fontSize: 13, lineHeight: 19, marginTop: 5 },
});
