import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Guard } from '@/lib/app/App';
import { Ordering, useTasksQuery } from '@/lib/rekuest/api/graphql';
import { Stack } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, View } from 'react-native';

const TasksList = () => {
    const { data, loading, error, refetch } = useTasksQuery({
        variables: {
            order: { createdAt: Ordering.Desc },
                pagination: {
                limit: 50,
            },
        },
       
    });

    const [refreshing, setRefreshing] = useState(false);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await refetch();
        } finally {
            setRefreshing(false);
        }
    }, [refetch]);

    if (loading && !refreshing) {
        return (
            <ThemedView className="flex-1 justify-center items-center">
                <ActivityIndicator size="large" />
            </ThemedView>
        );
    }

    if (error) {
        return (
            <View className="flex-1 justify-center items-center p-4">
                <ThemedText className="text-red-500">Error loading tasks: {error.message}</ThemedText>
            </View>
        );
    }

    const tasks = data?.tasks || [];

    return (
        <FlatList
            data={tasks}
            keyExtractor={(item) => item.id}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ListEmptyComponent={
                <View className="flex-1 justify-center items-center p-4 mt-10">
                    <ThemedText className="text-gray-500">No tasks found</ThemedText>
                </View>
            }
            renderItem={({ item }) => (
                <Card className="mb-2 mx-4 bg-background-800 dark:bg-zinc-900 border-1 border border-zinc-400 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-slate-200 font-light">{item.action.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ThemedText className="text-xs text-white ">
                            Created: {new Date(item.createdAt).toLocaleString()}
                        </ThemedText>
                        <ThemedText className="text-xs text-white ">
                            Latest Event: {item.latestEventKind || 'N/A'}
                        </ThemedText>
                    </CardContent>
                </Card>
            )}
            className='bg-background-300'
            contentContainerStyle={{ paddingVertical: 16, flexGrow: 1 }}
        />
    );
};

export default function TasksScreen() {
    return (
        <View className="flex-1 bg-background-800">
            <Stack.Screen options={{ title: 'Tasks' }} />
            <Guard.Rekuest fallback={<ThemedText>Connecting to Rekuest...</ThemedText>}>
                <TasksList />
            </Guard.Rekuest>
        </View>
    );
}
