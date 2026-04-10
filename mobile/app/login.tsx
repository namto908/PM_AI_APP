import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import client from '../api/client';
import { useAuthStore } from '../stores/authStore';
import { useWorkspaceStore } from '../stores/workspaceStore';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);
  const setActiveWorkspace = useWorkspaceStore((s) => s.setActiveWorkspace);
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Lỗi', 'Vui lòng nhập email và mật khẩu');
      return;
    }

    setLoading(true);
    try {
      const { data } = await client.post('/auth/login', { email, password });
      
      const me = await client.get('/auth/me', {
        headers: { Authorization: `Bearer ${data.access_token}` },
      });
      
      setAuth(data.access_token, me.data);

      try {
        const ws = await client.get('/auth/workspaces', {
          headers: { Authorization: `Bearer ${data.access_token}` },
        });
        if (ws.data.length > 0) {
          setActiveWorkspace(ws.data[0].id);
        }
      } catch (wsErr) {
        console.error('Error fetching workspaces:', wsErr);
      }

      router.replace('/(tabs)');
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Đăng nhập thất bại';
      Alert.alert('Lỗi', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background px-6 justify-center">
      <View className="mb-10">
        <Text className="text-4xl font-bold text-white">
          TaskOps <Text className="text-primary">AI</Text>
        </Text>
        <Text className="text-gray-400 mt-2 text-lg">Sign in to your account</Text>
      </View>

      <View className="space-y-4">
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
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-bold text-lg">Sign In</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/register')} className="mt-4 items-center">
          <Text className="text-gray-400">
            No account? <Text className="text-primary font-medium">Register</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
