import { View, Text, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, Bell, Shield, LogOut, ChevronRight, Moon, Globe, Info } from 'lucide-react-native';
import { useAuthStore } from '../../stores/authStore';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useRouter } from 'expo-router';

function SettingItem({ icon: Icon, label, value, onPress, showChevron = true, isDestructive = false }: any) {
  return (
    <TouchableOpacity 
      className="flex-row items-center justify-between p-4 bg-surface rounded-2xl mb-2 border border-gray-800"
      onPress={onPress}
    >
      <View className="flex-row items-center gap-3">
        <View className={`w-8 h-8 rounded-lg items-center justify-center ${isDestructive ? 'bg-red-400/10' : 'bg-gray-800'}`}>
          <Icon size={18} color={isDestructive ? '#f87171' : '#94a3b8'} />
        </View>
        <Text className={`${isDestructive ? 'text-red-400' : 'text-white'} font-medium`}>{label}</Text>
      </View>
      <View className="flex-row items-center gap-2">
        {value && <Text className="text-gray-500 text-sm">{value}</Text>}
        {showChevron && <ChevronRight size={16} color="#475569" />}
      </View>
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const router = useRouter();

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: () => {
            logout();
            router.replace('/login');
          }
        },
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['bottom']}>
      <ScrollView className="px-6 py-4">
        {/* Profile Section */}
        <View className="items-center mb-8 mt-4">
          <View className="w-24 h-24 rounded-full bg-primary/20 items-center justify-center border-2 border-primary/30 mb-4">
            <User size={48} color="#6366f1" />
          </View>
          <Text className="text-white text-xl font-bold">{user?.name || 'User'}</Text>
          <Text className="text-gray-500 text-sm">{user?.email || 'user@example.com'}</Text>
          <TouchableOpacity 
            className="mt-4 px-4 py-2 bg-gray-800 rounded-full"
            onPress={() => {}}
          >
            <Text className="text-white text-xs font-bold">Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Workspace Section */}
        <Text className="text-gray-500 text-[10px] uppercase font-bold tracking-widest ml-1 mb-2">Workspace</Text>
        <SettingItem 
          icon={Globe} 
          label="Active Workspace" 
          value={activeWorkspaceId ? `ID: ${activeWorkspaceId.slice(0, 8)}` : 'None'} 
          onPress={() => {}}
        />
        <View className="mb-6" />

        {/* Preferences Section */}
        <Text className="text-gray-500 text-[10px] uppercase font-bold tracking-widest ml-1 mb-2">Preferences</Text>
        <SettingItem icon={Bell} label="Notifications" onPress={() => {}} />
        <SettingItem icon={Moon} label="Dark Mode" value="On" showChevron={false} onPress={() => {}} />
        <SettingItem icon={Shield} label="Security" onPress={() => {}} />
        <View className="mb-6" />

        {/* About Section */}
        <Text className="text-gray-500 text-[10px] uppercase font-bold tracking-widest ml-1 mb-2">Support</Text>
        <SettingItem icon={Info} label="About TaskOps AI" value="v1.0.2" onPress={() => {}} />
        <View className="mb-8" />

        {/* Danger Zone */}
        <SettingItem 
          icon={LogOut} 
          label="Sign Out" 
          onPress={handleLogout} 
          showChevron={false} 
          isDestructive={true} 
        />
        
        <Text className="text-center text-gray-600 text-[10px] my-10 uppercase tracking-widest font-bold">
          TaskOps AI Orchestration • 2026
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
