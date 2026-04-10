import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useTasks } from '../../hooks/useTasks';
import { ClipboardList, Filter } from 'lucide-react-native';

const PRIORITIES = [
  { id: 'all', label: 'All' },
  { id: 'urgent', label: 'Urgent', color: '#f87171' },
  { id: 'high', label: 'High', color: '#fb923c' },
  { id: 'medium', label: 'Medium', color: '#22d3ee' },
  { id: 'low', label: 'Low', color: '#94a3b8' },
];

function TaskCard({ task }: any) {
  const priorityColor = task.priority === 'urgent' || task.priority === 'high' ? '#f87171' : task.priority === 'medium' ? '#22d3ee' : '#94a3b8';
  const statusColor = task.status === 'done' ? '#4ade80' : task.status === 'in_progress' ? '#6366f1' : '#94a3b8';

  return (
    <View className="bg-surface p-4 rounded-2xl mb-4 border border-gray-800">
      <View className="flex-row justify-between items-start mb-2">
        <Text className="text-white font-bold text-base flex-1 mr-2">{task.title}</Text>
        <View className="px-2 py-1 rounded bg-gray-800">
          <Text className="text-[10px] font-bold uppercase" style={{ color: priorityColor }}>{task.priority}</Text>
        </View>
      </View>
      
      {task.description && (
        <Text className="text-gray-400 text-xs mb-4" numberOfLines={2}>{task.description}</Text>
      )}

      <View className="flex-row justify-between items-center pt-3 border-t border-gray-800">
        <View className="flex-row items-center">
          <View className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: statusColor }} />
          <Text className="text-gray-500 text-xs uppercase font-bold">{task.status.replace('_', ' ')}</Text>
        </View>
        <Text className="text-gray-500 text-xs">
          {task.due_date ? `Due ${task.due_date}` : 'No due date'}
        </Text>
      </View>
    </View>
  );
}

export default function TasksScreen() {
  const workspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const [filter, setFilter] = useState('all');
  const { data, loading, refetch } = useTasks(workspaceId, { 
    priority: filter === 'all' ? undefined : filter,
    top_level_only: true 
  });

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['bottom']}>
      <View className="px-6 py-4 flex-row items-center">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
          {PRIORITIES.map((p) => (
            <TouchableOpacity
              key={p.id}
              onPress={() => setFilter(p.id)}
              className={`px-4 py-2 rounded-full mr-2 border ${filter === p.id ? 'bg-primary border-primary' : 'bg-surface border-gray-800'}`}
            >
              <Text className={`${filter === p.id ? 'text-white font-bold' : 'text-gray-400'}`}>{p.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading && !data ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#6366f1" size="large" />
        </View>
      ) : (
        <FlatList
          data={data?.items || []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <TaskCard task={item} />}
          contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 10 }}
          ListEmptyComponent={
            <View className="items-center justify-center py-20">
              <ClipboardList size={48} color="#1e293b" />
              <Text className="text-gray-500 mt-4">No tasks found</Text>
            </View>
          }
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor="#6366f1" />}
        />
      )}
    </SafeAreaView>
  );
}
import { ScrollView } from 'react-native';
