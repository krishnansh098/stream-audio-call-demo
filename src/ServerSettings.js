import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

// Collapsible "Server URL" editor. Lets you repoint the app at a new directory
// server URL (e.g. a fresh tunnel) without rebuilding the APK.
export default function ServerSettings({ apiUrl, onSetApiUrl }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(apiUrl || '');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setValue(apiUrl || '');
  }, [apiUrl]);

  const save = async () => {
    await onSetApiUrl(value.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <View style={styles.wrap}>
      <TouchableOpacity onPress={() => setOpen((o) => !o)} style={styles.header}>
        <Text style={styles.headerText}>
          {open ? 'v' : '>'} Server settings
        </Text>
      </TouchableOpacity>

      {open && (
        <View style={styles.body}>
          <Text style={styles.label}>Directory server URL</Text>
          <TextInput
            style={styles.input}
            value={value}
            onChangeText={setValue}
            placeholder="https://your-server.example.com"
            placeholderTextColor="#6b7280"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
          <TouchableOpacity style={styles.button} onPress={save}>
            <Text style={styles.buttonText}>{saved ? 'Saved' : 'Save URL'}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 8 },
  header: { paddingVertical: 8 },
  headerText: { color: '#6b7280', fontSize: 13, fontWeight: '600' },
  body: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 14,
    marginTop: 4,
  },
  label: { color: '#9ca3af', fontSize: 12, marginBottom: 6 },
  input: {
    backgroundColor: '#111827',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#f9fafb',
    fontSize: 14,
    marginBottom: 10,
  },
  button: {
    backgroundColor: '#374151',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonText: { color: '#f9fafb', fontSize: 15, fontWeight: '600' },
});
