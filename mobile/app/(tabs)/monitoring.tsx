import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Server, Activity, AlertTriangle, ShieldCheck, Terminal, ChevronRight } from 'lucide-react-native';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useServers } from '../../hooks/useServers';
import { useAlerts } from '../../hooks/useAlerts';

function ServerCard({ server }: any) {
  return (
    <View className="bg-surface p-4 rounded-2xl mb-4 border border-gray-800">
      <View className="flex-row justify-between items-center mb-3">
        <View className="flex-row items-center gap-3">
          <View className={`w-10 h-10 rounded-xl items-center justify-center ${server.is_active ? 'bg-primary/10' : 'bg-red-400/10'}`}>
            <Server size={20} color={server.is_active ? '#6366f1' : '#f87171'} />
          </View>
          <View>
            <Text className="text-white font-bold">{server.name}</Text>
            <Text className="text-gray-500 text-xs">{server.hostname || 'No hostname'}</Text>
          </View>
        </View>
        <View className={`px-2 py-1 rounded ${server.is_active ? 'bg-primary/20' : 'bg-red-400/20'}`}>
          <Text className={`text-[10px] font-bold uppercase ${server.is_active ? 'text-primary' : 'text-red-400'}`}>
            {server.is_active ? 'Online' : 'Offline'}
          </Text>
        </View>
      </View>
      
      <View className="flex-row justify-between pt-3 border-t border-gray-800">
        <View>
          <Text className="text-gray-500 text-[10px] uppercase font-bold">Environment</Text>
          <Text className="text-gray-300 text-xs mt-1 capitalize">{server.environment}</Text>
        </View>
        <View className="items-end">
          <Text className="text-gray-500 text-[10px] uppercase font-bold">IP Address</Text>
          <Text className="text-gray-300 text-xs mt-1">{server.ip_address || 'Internal Only'}</Text>
        </View>
      </View>
    </View>
  );
}

function AlertItem({ alert, resolve }: any) {
  const isCritical = alert.severity === 'critical';
  return (
    <View className={`p-4 rounded-2xl mb-3 border ${isCritical ? 'bg-red-400/5 border-red-400/20' : 'bg-surface border-gray-800'}`}>
      <View className="flex-row justify-between items-start mb-2">
        <View className="flex-1 mr-2">
          <View className="flex-row items-center gap-2 mb-1">
            <AlertTriangle size={14} color={isCritical ? '#f87171' : '#fb923c'} />
            <Text className={`font-bold text-sm ${isCritical ? 'text-red-400' : 'text-orange-400'}`}>{alert.title}</Text>
          </View>
          <Text className="text-gray-400 text-xs" numberOfLines={2}>{alert.message}</Text>
        </View>
        <TouchableOpacity 
          onPress={() => resolve(alert.id)}
          className="bg-gray-800 px-3 py-1.5 rounded-lg"
        >
          <Text className="text-gray-300 text-[10px] font-bold">Resolve</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function MonitoringScreen() {
  const workspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const { servers, loading: serversLoading, refetch: refetchServers } = useServers(workspaceId);
  const { alerts, loading: alertsLoading, resolve, refetch: refetchAlerts } = useAlerts(workspaceId, false);

  const onRefresh = () => {
    refetchServers();
    refetchAlerts();
  };

  const isLoading = (serversLoading || alertsLoading) && (!servers.length && !alerts.length);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['bottom']}>
      <ScrollView 
        className="px-6 py-4"
        refreshControl={<RefreshControl refreshing={serversLoading || alertsLoading} onRefresh={onRefresh} tintColor="#6366f1" />}
      >
        <View className="mb-8 p-6 bg-primary/10 rounded-2xl border border-primary/20">
          <View className="flex-row items-center gap-3 mb-4">
            <ShieldCheck size={24} color="#6366f1" />
            <View>
              <Text className="text-white font-bold text-lg">System Status</Text>
              <Text className="text-gray-500 text-xs">All systems operational</Text>
            </View>
          </View>
          <View className="flex-row justify-between pt-4 border-t border-primary/10">
            <View className="items-center flex-1">
              <Text className="text-primary font-bold text-xl">{servers.filter(s => s.is_active).length}</Text>
              <Text className="text-gray-500 text-[10px] uppercase font-bold tracking-widest mt-1">Servers</Text>
            </View>
            <View className="items-center flex-1 border-x border-primary/10">
              <Text className="text-red-400 font-bold text-xl">{alerts.length}</Text>
              <Text className="text-gray-500 text-[10px] uppercase font-bold tracking-widest mt-1">Alerts</Text>
            </View>
            <View className="items-center flex-1">
              <Text className="text-accent font-bold text-xl">99.9%</Text>
              <Text className="text-gray-500 text-[10px] uppercase font-bold tracking-widest mt-1">Uptime</Text>
            </View>
          </View>
        </View>

        <View className="mb-8">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-white text-lg font-bold">Active Servers</Text>
            <Activity size={18} color="#94a3b8" />
          </View>
          {servers.length === 0 && !serversLoading ? (
            <View className="p-8 items-center bg-surface/30 rounded-2xl border border-dashed border-gray-800">
              <Text className="text-gray-500">No servers registered</Text>
            </View>
          ) : (
            servers.map(server => <ServerCard key={server.id} server={server} />)
          )}
        </View>

        <View className="mb-10">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-white text-lg font-bold">Current Alerts</Text>
            <Terminal size={18} color="#94a3b8" />
          </View>
          {alerts.length === 0 && !alertsLoading ? (
            <View className="p-8 items-center bg-surface/30 rounded-2xl border border-dashed border-gray-800">
              <Text className="text-gray-500">All systems clear</Text>
            </View>
          ) : (
            alerts.map(alert => <AlertItem key={alert.id} alert={alert} resolve={resolve} />)
          )}
        </View>
      </ScrollView>

      {isLoading && (
        <View className="absolute inset-0 bg-background/50 items-center justify-center">
          <ActivityIndicator color="#6366f1" size="large" />
        </View>
      )}
    </SafeAreaView>
  );
}
