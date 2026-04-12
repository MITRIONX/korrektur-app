import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuthStore } from '../src/store/auth';
import { login, register } from '../src/services/api';

export default function LoginScreen() {
  const { setAuth } = useAuthStore();
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email || !password || (isRegister && !name)) {
      Alert.alert('Fehler', 'Bitte alle Felder ausfüllen.');
      return;
    }

    setLoading(true);
    try {
      const result = isRegister
        ? await register(email, password, name)
        : await login(email, password);

      await setAuth(result.token, result.user);
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        'Ein unbekannter Fehler ist aufgetreten.';
      Alert.alert('Fehler', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.form}>
        <Text style={styles.title}>Korrektur-App</Text>
        <Text style={styles.subtitle}>
          {isRegister ? 'Konto erstellen' : 'Anmelden'}
        </Text>

        {isRegister && (
          <TextInput
            style={styles.input}
            placeholder="Name"
            placeholderTextColor="#94a3b8"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
        )}

        <TextInput
          style={styles.input}
          placeholder="E-Mail"
          placeholderTextColor="#94a3b8"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <TextInput
          style={styles.input}
          placeholder="Passwort"
          placeholderTextColor="#94a3b8"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <Pressable
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading
              ? 'Bitte warten…'
              : isRegister
              ? 'Konto erstellen'
              : 'Anmelden'}
          </Text>
        </Pressable>

        <Pressable onPress={() => setIsRegister((v) => !v)}>
          <Text style={styles.toggle}>
            {isRegister
              ? 'Bereits ein Konto? Anmelden'
              : 'Noch kein Konto? Registrieren'}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  form: {
    width: '100%',
    maxWidth: 360,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#f1f5f9',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 32,
  },
  input: {
    backgroundColor: '#1e293b',
    color: '#f1f5f9',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  button: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  toggle: {
    color: '#3b82f6',
    textAlign: 'center',
    fontSize: 14,
  },
});
