import React, { useState, useEffect } from 'react';
import {
  Box,
  Group,
  Text,
  Badge,
  Button,
  Stack,
  Progress,
  ActionIcon,
  Tooltip,
  Divider,
  Alert,
  useMantineTheme,
  rem
} from '@mantine/core';
import {
  IconCloudOff,
  IconCloudCheck,
  IconRefresh,
  IconAlertTriangle,
  IconClock,
  IconDatabase,
  IconPhoto,
  IconListCheck,
  IconTools,
  IconCheck,
  IconX
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

interface SyncStatus {
  isOnline: boolean;
  lastSync: number | null;
  pendingChanges: number;
  pendingPhotos: number;
  conflicts: number;
  syncInProgress: boolean;
  storage: {
    used: number;
    quota: number;
    percentage: number;
  };
}

interface SyncQueueItem {
  id: string;
  type: 'collection' | 'wishlist' | 'builds' | 'photos' | 'user';
  status: 'pending' | 'syncing' | 'completed' | 'failed';
  retryCount: number;
  createdAt: number;
}

export const OfflineSyncManager: React.FC = () => {
  const theme = useMantineTheme();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: navigator.onLine,
    lastSync: null,
    pendingChanges: 0,
    pendingPhotos: 0,
    conflicts: 0,
    syncInProgress: false,
    storage: {
      used: 0,
      quota: 0,
      percentage: 0
    }
  });

  const [syncQueue, setSyncQueue] = useState<SyncQueueItem[]>([]);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Monitor online status
    const handleOnline = () => {
      setSyncStatus(prev => ({ ...prev, isOnline: true }));
      checkSyncStatus();
      notifications.show({
        title: '🌐 Back Online',
        message: 'Syncing your changes...',
        color: 'green',
        autoClose: 3000,
      });
    };

    const handleOffline = () => {
      setSyncStatus(prev => ({ ...prev, isOnline: false }));
      notifications.show({
        title: '📡 Offline',
        message: 'Changes will be synced when you\'re back online.',
        color: 'yellow',
        autoClose: 5000,
      });
    };

    // Listen for sync events from service worker
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'sync-status') {
        setSyncStatus(prev => ({ ...prev, ...event.data.data }));
      } else if (event.data.type === 'sync-completed') {
        setSyncStatus(prev => ({ ...prev, lastSync: Date.now() }));
        notifications.show({
          title: '✅ Sync Complete',
          message: `${event.data.data.count} items synced successfully.`,
          color: 'green',
          autoClose: 4000,
        });
      } else if (event.data.type === 'sync-error') {
        notifications.show({
          title: '❌ Sync Failed',
          message: 'Some items couldn\'t be synced. Will retry later.',
          color: 'red',
          autoClose: 6000,
        });
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    navigator.serviceWorker?.addEventListener('message', handleMessage);

    // Initial check
    checkSyncStatus();
    checkStorageUsage();

    // Periodic status checks
    const interval = setInterval(checkSyncStatus, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      navigator.serviceWorker?.removeEventListener('message', handleMessage);
      clearInterval(interval);
    };
  }, []);

  const checkSyncStatus = async () => {
    try {
      // Get sync queue status from IndexedDB or service worker
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        if (registration.active) {
          registration.active.postMessage({
            type: 'GET_SYNC_STATUS'
          });
        }
      }

      // Simulate getting sync status
      const mockQueue: SyncQueueItem[] = [
        {
          id: '1',
          type: 'collection',
          status: 'pending',
          retryCount: 0,
          createdAt: Date.now() - 120000
        },
        {
          id: '2',
          type: 'photos',
          status: 'syncing',
          retryCount: 1,
          createdAt: Date.now() - 300000
        }
      ];

      setSyncQueue(mockQueue);
      setSyncStatus(prev => ({
        ...prev,
        pendingChanges: mockQueue.filter(item => item.status === 'pending').length,
        pendingPhotos: mockQueue.filter(item => item.type === 'photos' && item.status !== 'completed').length,
        conflicts: mockQueue.filter(item => item.status === 'failed').length
      }));
    } catch (error) {
      console.error('Failed to check sync status:', error);
    }
  };

  const checkStorageUsage = async () => {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        const used = estimate.usage || 0;
        const quota = estimate.quota || 0;

        setSyncStatus(prev => ({
          ...prev,
          storage: {
            used,
            quota,
            percentage: quota > 0 ? (used / quota) * 100 : 0
          }
        }));
      } catch (error) {
        console.error('Failed to get storage estimate:', error);
      }
    }
  };

  const triggerManualSync = async () => {
    if (!syncStatus.isOnline || syncStatus.syncInProgress) return;

    setSyncStatus(prev => ({ ...prev, syncInProgress: true }));

    try {
      // Register background sync events
      if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
        const registration = await navigator.serviceWorker.ready;

        if (registration.sync) {
          await registration.sync.register('sync-collection');
          await registration.sync.register('sync-wishlist');
          await registration.sync.register('sync-builds');
          await registration.sync.register('sync-user-data');
        }
      }

      notifications.show({
        title: '🔄 Sync Started',
        message: 'Manual sync initiated. This may take a moment...',
        color: 'blue',
        autoClose: 3000,
      });

      // Update UI after delay
      setTimeout(() => {
        setSyncStatus(prev => ({ ...prev, syncInProgress: false }));
        setSyncStatus(prev => ({ ...prev, lastSync: Date.now() }));
      }, 3000);

    } catch (error) {
      console.error('Manual sync failed:', error);
      setSyncStatus(prev => ({ ...prev, syncInProgress: false }));

      notifications.show({
        title: '❌ Sync Failed',
        message: 'Could not start sync. Please try again.',
        color: 'red',
      });
    }
  };

  const clearOfflineData = async () => {
    try {
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }

      notifications.show({
        title: '🗑️ Cache Cleared',
        message: 'Offline data has been cleared. App will reload.',
        color: 'green',
        autoClose: 3000,
      });

      setTimeout(() => window.location.reload(), 1000);

    } catch (error) {
      console.error('Failed to clear cache:', error);
      notifications.show({
        title: '❌ Failed to Clear Cache',
        message: 'Could not clear offline data.',
        color: 'red',
      });
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 MB';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const formatRelativeTime = (timestamp: number | null) => {
    if (!timestamp) return 'Never';
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    return 'Yesterday';
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'collection': return <IconListCheck size={rem(14)} />;
      case 'wishlist': return <IconDatabase size={rem(14)} />;
      case 'builds': return <IconTools size={rem(14)} />;
      case 'photos': return <IconPhoto size={rem(14)} />;
      case 'user': return <IconDatabase size={rem(14)} />;
      default: return <IconDatabase size={rem(14)} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'yellow';
      case 'syncing': return 'blue';
      case 'completed': return 'green';
      case 'failed': return 'red';
      default: return 'gray';
    }
  };

  const getStatusBadge = (status: string) => {
    const color = getStatusColor(status);
    const text = status.charAt(0).toUpperCase() + status.slice(1);

    return (
      <Badge
        size="xs"
        color={color}
        variant="light"
        leftSection={status === 'syncing' ? <IconRefresh size={rem(10)} className="animate-spin" /> : undefined}
      >
        {text}
      </Badge>
    );
  };

  return (
    <Box p="md" bg="#1a1a1a" style={{ borderRadius: rem(8), border: `1px solid ${theme.colors.gray[7]}` }}>
      <Group justify="space-between" mb="md">
        <Group>
          {syncStatus.isOnline ? (
            <IconCloudCheck size={rem(20)} color={theme.colors.green[5]} />
          ) : (
            <IconCloudOff size={rem(20)} color={theme.colors.red[5]} />
          )}
          <Text fw={600} c="white">Offline Sync Manager</Text>
        </Group>

        <Group gap="xs">
          <Button
            variant="light"
            size="xs"
            onClick={triggerManualSync}
            loading={syncStatus.syncInProgress}
            disabled={!syncStatus.isOnline}
            leftSection={<IconRefresh size={rem(14)} />}
          >
            Sync Now
          </Button>

          <ActionIcon
            variant="subtle"
            color={showDetails ? theme.colors.blue[5] : theme.colors.gray[5]}
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? <IconX size={rem(14)} /> : <IconDatabase size={rem(14)} />}
          </ActionIcon>
        </Group>
      </Group>

      {/* Status Overview */}
      <Group mb="md">
        <Badge
          color={syncStatus.isOnline ? 'green' : 'red'}
          variant="light"
          leftSection={syncStatus.isOnline ? <IconCheck size={rem(10)} /> : <IconX size={rem(10)} />}
        >
          {syncStatus.isOnline ? 'Online' : 'Offline'}
        </Badge>

        {syncStatus.lastSync && (
          <Badge color="blue" variant="light" leftSection={<IconClock size={rem(10)} />}>
            Last sync: {formatRelativeTime(syncStatus.lastSync)}
          </Badge>
        )}

        {syncStatus.pendingChanges > 0 && (
          <Badge color="yellow" variant="light" leftSection={<IconAlertTriangle size={rem(10)} />}>
            {syncStatus.pendingChanges} pending
          </Badge>
        )}
      </Group>

      {/* Sync Progress */}
      {(syncStatus.syncInProgress || syncStatus.pendingChanges > 0) && (
        <Box mb="md">
          <Group justify="space-between" mb="xs">
            <Text size="sm" c="white">
              {syncStatus.syncInProgress ? 'Syncing...' : 'Ready to sync'}
            </Text>
            <Text size="xs" c="gray.5">
              {syncStatus.pendingChanges} items
            </Text>
          </Group>
          <Progress
            value={syncStatus.syncInProgress ? 50 : 0}
            color="blue"
            size="sm"
            animated={syncStatus.syncInProgress}
          />
        </Box>
      )}

      {/* Storage Usage */}
      <Box mb="md">
        <Group justify="space-between" mb="xs">
          <Text size="sm" c="white">Storage Usage</Text>
          <Text size="xs" c="gray.5">
            {formatBytes(syncStatus.storage.used)} / {formatBytes(syncStatus.storage.quota)}
          </Text>
        </Group>
        <Progress
          value={syncStatus.storage.percentage}
          color={syncStatus.storage.percentage > 80 ? 'red' : syncStatus.storage.percentage > 60 ? 'yellow' : 'green'}
          size="xs"
        />
      </Box>

      {/* Conflict Alert */}
      {syncStatus.conflicts > 0 && (
        <Alert color="orange" mb="md" icon={<IconAlertTriangle size={rem(16)} />}>
          <Text size="sm">
            {syncStatus.conflicts} conflict{syncStatus.conflicts > 1 ? 's' : ''} detected.
            Please resolve them manually.
          </Text>
        </Alert>
      )}

      {/* Detailed Queue Information */}
      {showDetails && (
        <>
          <Divider mb="md" color="gray.7" />

          <Stack gap="xs">
            <Text fw={500} c="white" mb="xs">Sync Queue</Text>

            {syncQueue.length === 0 ? (
              <Text size="sm" c="gray.5" ta="center" py="md">
                No items in sync queue
              </Text>
            ) : (
              syncQueue.map((item) => (
                <Box
                  key={item.id}
                  p="xs"
                  bg="#2a2a2a"
                  style={{ borderRadius: rem(4) }}
                >
                  <Group justify="space-between">
                    <Group gap="xs">
                      {getTypeIcon(item.type)}
                      <Text size="sm" c="white">
                        {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                      </Text>
                      {item.retryCount > 0 && (
                        <Badge size="xs" color="orange" variant="light">
                          Retry {item.retryCount}
                        </Badge>
                      )}
                    </Group>

                    <Group gap="xs">
                      <Text size="xs" c="gray.5">
                        {formatRelativeTime(item.createdAt)}
                      </Text>
                      {getStatusBadge(item.status)}
                    </Group>
                  </Group>
                </Box>
              ))
            )}

            <Button
              variant="outline"
              size="xs"
              color="red"
              onClick={clearOfflineData}
              mt="md"
            >
              Clear Offline Data
            </Button>
          </Stack>
        </>
      )}
    </Box>
  );
};

export default OfflineSyncManager;