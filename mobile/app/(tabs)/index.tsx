import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  AlertTriangle, 
  Bell, 
  Server, 
  ChevronRight, 
  ClipboardList, 
  Cpu, 
  Bot 
} from 'lucide-react-native';
import { useAuthStore } from '../../stores/authStore';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useTasks } from '../../hooks/useTasks';
import { useRouter } from 'expo-router';

function KpiCard({ label, value, icon: Icon, colorClass, borderClass }: any) {
  return (
    <View className={`bg-surface p-4 rounded-2xl flex-row items-center justify-between mb-4 border-l-4 ${borderClass || 'border-transparent'}`}>
      <View>
        <Text className="text-[10px] uppercase tracking-widest font-bold text-gray-500 mb-1">{label}</Text>
        <Text className={`text-3xl font-bold ${colorClass}`}>{value}</Text>
      </View>
      <View className="bg-gray-800/50 p-3 rounded-xl">
        <Icon size={24} color={colorClass === 'text-primary' ? '#6366f1' : colorClass === 'text-accent' ? '#22d3ee' : '#f87171'} />
      </View>
    </View>
  );
}

function TaskItem({ task }: any) {
  const router = useRouter();
  const priorityColor = task.priority === 'urgent' || task.priority === 'high' ? '#f87171' : task.priority === 'medium' ? '#22d3ee' : '#94a3b8';
  
  return (
    <TouchableOpacity 
      className="bg-surface/50 p-4 rounded-xl flex-row items-center mb-3 border border-gray-800/50"
      onPress={() => router.push('/(tabs)/tasks')}
    >
      <View className="w-10 h-10 rounded-lg bg-gray-800 items-center justify-center mr-4">
        <ClipboardList size={18} color={priorityColor} />
      </View>
      <View className="flex-1">
        <Text className="text-white font-bold text-sm" numberOfLines={1}>{task.title}</Text>
        <Text className="text-gray-500 text-xs mt-1">
          {task.due_date ? `Due ${task.due_date}` : 'No due date'}
        </Text>
      </View>
      <View className={`px-2 py-1 rounded-md bg-gray-800`}>
        <Text className="text-[10px] font-bold uppercase" style={{ color: priorityColor }}>{task.priority}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function DashboardScreen() {
  const workspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const { data: tasks, loading, refetch } = useTasks(workspaceId, { page_size: 5, top_level_only: true });

  const todayStr = new Date().toISOString().split('T')[0];
  const openTasks = tasks?.items.filter(t => t.status !== 'done' && t.status !== 'cancelled') ?? [];
  const overdueCount = openTasks.filter((t) => t.due_date && t.due_date < todayStr).length;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView 
        className="px-6 py-4"
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor="#6366f1" />}
      >
        <View className="flex-row items-center justify-between mb-8">
          <View>
            <Text className="text-gray-400 text-sm">Welcome back,</Text>
            <Text className="text-white text-2xl font-bold">{user?.name || 'User'}</Text>
          </View>
          <TouchableOpacity 
            className="w-12 h-12 rounded-full bg-surface items-center justify-center border border-gray-800"
            onPress={() => router.push('/modal')}
          >
            <Bell size={20} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        <KpiCard 
          label="Overdue Tasks" 
          value={String(overdueCount).padStart(2, '0')} 
          icon={AlertTriangle} 
          colorClass="text-red-400" 
          borderClass="border-red-400"
        />
        
        <View className="flex-row gap-4 mb-8">
          <View className="flex-1">
            <KpiCard 
              label="Active Tasks" 
              value={String(openTasks.length).padStart(2, '0')} 
              icon={ClipboardList} 
              colorClass="text-primary" 
            />
          </View>
          <View className="flex-1">
            <KpiCard 
              label="Services" 
              value="04" 
              icon={Server} 
              colorClass="text-accent" 
            />
          </View>
        </View>

        <View className="mb-8">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-white text-lg font-bold">Recent Tasks</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/tasks')}>
              <Text className="text-primary font-medium">See All</Text>
            </TouchableOpacity>
          </View>
          
          {openTasks.length === 0 ? (
            <View className="bg-surface/30 p-8 rounded-2xl items-center border border-dashed border-gray-800">
              <Text className="text-gray-500">No pending tasks</Text>
            </View>
          ) : (
            openTasks.map(task => <TaskItem key={task.id} task={task} />)
          )}
        </View>

        <View className="mb-10">
          <Text className="text-white text-lg font-bold mb-4">Quick Actions</Text>
          <View className="flex-row flex-wrap justify-between">
            <TouchableOpacity 
              className="bg-surface w-[48%] p-4 rounded-2xl mb-4 border border-gray-800"
              onPress={() => router.push('/(tabs)/ai')}
            >
              <Bot size={24} color="#6366f1" className="mb-2" />
              <Text className="text-white font-bold">Ask AI</Text>
              <Text className="text-gray-500 text-[10px] mt-1">Smart Assistance</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              className="bg-surface w-[48%] p-4 rounded-2xl mb-4 border border-gray-800"
              onPress={() => router.push('/(tabs)/monitoring')}
            >
              <Cpu size={24} color="#22d3ee" className="mb-2" />
              <Text className="text-white font-bold">Monitor</Text>
              <Text className="text-gray-500 text-[10px] mt-1">System Status</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
