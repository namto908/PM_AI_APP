import { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Send, Sparkles, Brain, ChevronDown, ChevronUp, Bot, Trash2 } from 'lucide-react-native';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useChatStream, type ChatMessage } from '../../hooks/useChatStream';

function ThinkingBubble({ content }: { content: string }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <View className="mb-4 self-start max-w-[85%]">
      <TouchableOpacity 
        onPress={() => setExpanded(!expanded)}
        className="flex-row items-center gap-2 px-4 py-2 bg-gray-800/50 rounded-2xl border border-primary/20"
      >
        <Brain size={14} color="#6366f1" />
        <Text className="text-primary text-xs font-bold">Reasoning...</Text>
        {expanded ? <ChevronUp size={14} color="#6366f1" /> : <ChevronDown size={14} color="#6366f1" />}
      </TouchableOpacity>
      {expanded && (
        <View className="mt-1 p-3 bg-gray-800/30 rounded-xl border border-gray-800">
          <Text className="text-gray-400 text-xs leading-relaxed">{content}</Text>
        </View>
      )}
    </View>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  return (
    <View className={`mb-4 flex-row ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <View className="w-8 h-8 rounded-xl bg-primary/10 items-center justify-center mr-2 self-end">
          <Sparkles size={14} color="#6366f1" />
        </View>
      )}
      <View 
        className={`max-w-[80%] px-4 py-3 rounded-2xl ${
          isUser ? 'bg-primary rounded-br-none' : 'bg-surface border border-gray-800 rounded-bl-none'
        }`}
      >
        <Text className={`${isUser ? 'text-white' : 'text-gray-200'} text-sm leading-relaxed`}>
          {message.content}
        </Text>
      </View>
    </View>
  );
}

export default function AIChatScreen() {
  const workspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const { messages, isStreaming, send, clear } = useChatStream(workspaceId);
  const [input, setInput] = useState('');
  const flatListRef = useRef<FlatList>(null);

  const handleSend = () => {
    if (!input.trim() || isStreaming) return;
    send(input);
    setInput('');
  };

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['bottom']}>
      <KeyboardAvoidingView 
        className="flex-1" 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View className="flex-row items-center justify-between px-6 py-4 border-b border-gray-800">
          <View className="flex-row items-center gap-3">
            <View className="p-2 bg-primary/10 rounded-lg">
              <Bot size={20} color="#6366f1" />
            </View>
            <View>
              <Text className="text-white font-bold">Assistant</Text>
              <Text className="text-gray-500 text-[10px] uppercase font-bold tracking-widest">Active now</Text>
            </View>
          </View>
          <TouchableOpacity onPress={clear} className="p-2">
            <Trash2 size={20} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            item.role === 'thinking' ? (
              <ThinkingBubble content={item.content} />
            ) : (
              <MessageBubble message={item} />
            )
          )}
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          ListEmptyComponent={
            <View className="items-center justify-center pt-20">
              <Sparkles size={48} color="#1e293b" />
              <Text className="text-gray-500 mt-4 text-center px-10">
                Hỏi tôi về tasks, servers, alerts hoặc bất kỳ thứ gì trong workspace của bạn.
              </Text>
            </View>
          }
        />

        <View className="px-4 py-4 bg-surface border-t border-gray-800 flex-row items-end gap-3">
          <View className="flex-1 bg-gray-800/50 rounded-2xl px-4 py-2 border border-gray-800">
            <TextInput
              className="text-white text-sm max-h-32"
              placeholder="Type a message..."
              placeholderTextColor="#64748b"
              multiline
              value={input}
              onChangeText={setInput}
            />
          </View>
          <TouchableOpacity 
            className={`w-12 h-12 rounded-xl bg-primary items-center justify-center ${(!input.trim() || isStreaming) ? 'opacity-50' : ''}`}
            onPress={handleSend}
            disabled={!input.trim() || isStreaming}
          >
            {isStreaming ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Send size={20} color="white" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
