import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import client from '../api/client';
import { useAuthStore } from '../stores/authStore';
import { useWorkspaceStore } from '../stores/workspaceStore';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);
  const setActiveWorkspace = useWorkspaceStore((s) => s.setActiveWorkspace);
  const router = useRouter();

  const handleRegister = async () => {
    if (!name || !email || !password) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin');
      return;
    }

    setLoading(true);
    try {
      const { data } = await client.post('/auth/register', { name, email, password });
      
      const me = await client.get('/auth/me', {
        headers: { Authorization: `Bearer ${data.access_token}` },
      });
      
      setAuth(data.access_token, me.data);

      // Auto-create workspace
      try {
        const base = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 20) || 'workspace';
        const slug = `${base}-${Date.now().toString(36)}`;
        const ws = await client.post(
          '/auth/workspaces',
          { name: `${name}'s Workspace`, slug },
          { headers: { Authorization: `Bearer ${data.access_token}` } }
        );
        setActiveWorkspace(ws.data.id);
      } catch (wsErr) {
        console.error('Error auto-creating workspace:', wsErr);
      }

      router.replace('/(tabs)');
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Đăng ký thất bại';
      Alert.alert('Lỗi', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24 }}>
        <View className="mb-10">
          <Text className="text-4xl font-bold text-white">Create account</Text>
          <Text className="text-gray-400 mt-2 text-lg">Start using TaskOps AI</Text>
        </View>

        <View className="space-y-4">
          <View>
            <Text className="text-gray-300 mb-2 font-medium">Name</Text>
            <TextInput
              className="bg-surface text-white px-4 py-4 rounded-xl border border-gray-800 focus:border-primary"
              placeholder="John Doe"
              placeholderTextColor="#64748b"
              value={name}
              onChangeText={setName}
            />
          </View>

          <View>
            <Text className="text-gray-300 mb-2 font-medium">Email</Text>
            <TextInput
              className="bg-surface text-white px-4 py-4 rounded-xl border border-gray-800 focus:border-primary"
              placeholder="name@company.com"
              placeholderTextColor="#64748b"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View>
            <Text className="text-gray-300 mb-2 font-medium">Password</Text>
            <TextInput
              className="bg-surface text-white px-4 py-4 rounded-xl border border-gray-800 focus:border-primary"
              placeholder="••••••••"
              placeholderTextColor="#64748b"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <TouchableOpacity
            className={`bg-primary py-4 rounded-xl items-center mt-4 ${loading ? 'opacity-70' : ''}`}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-bold text-lg">Create account</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/login')} className="mt-4 items-center">
            <Text className="text-gray-400">
              Already have an account? <Text className="text-primary font-medium">Sign in</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
