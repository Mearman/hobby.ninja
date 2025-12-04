import React, { useState, useEffect } from 'react';
import { Button, Group, Text, Box, rem, Progress } from '@mantine/core';
import { IconRefresh, IconX, IconCheck } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

interface PWAUpdaterProps {
  className?: string;
}

export const PWAUpdater: React.FC<PWAUpdaterProps> = ({ className }) => {
  const [showUpdateBanner, setShowUpdateBanner] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateProgress, setUpdateProgress] = useState(0);

  useEffect(() => {
    // Listen for custom update events from service worker
    const handleSWUpdate = (event: CustomEvent) => {
      console.log('PWA Update available:', event.detail);
      setShowUpdateBanner(true);
    };

    // Listen for update progress
    const handleUpdateProgress = (event: CustomEvent) => {
      setUpdateProgress(event.detail.progress || 0);
    };

    window.addEventListener('sw-update', handleSWUpdate as EventListener);
    window.addEventListener('sw-update-progress', handleUpdateProgress as EventListener);

    return () => {
      window.removeEventListener('sw-update', handleSWUpdate as EventListener);
      window.removeEventListener('sw-update-progress', handleUpdateProgress as EventListener);
    };
  }, []);

  const handleUpdateClick = async () => {
    setIsUpdating(true);
    setUpdateProgress(0);

    try {
      // Send message to service worker to skip waiting
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'SKIP_WAITING'
        });

        // Simulate progress for user feedback
        const progressInterval = setInterval(() => {
          setUpdateProgress(prev => {
            if (prev >= 90) {
              clearInterval(progressInterval);
              return 90;
            }
            return prev + 10;
          });
        }, 200);

        // Listen for controller change
        const handleControllerChange = () => {
          setUpdateProgress(100);
          clearInterval(progressInterval);

          setTimeout(() => {
            window.location.reload();
          }, 500);
        };

        navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

        // Cleanup
        setTimeout(() => {
          navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
          clearInterval(progressInterval);
          setIsUpdating(false);
        }, 5000);

        notifications.show({
          title: 'Updating App',
          message: 'Downloading the latest version of Gunpla Collection Manager...',
          color: 'blue',
          loading: true,
          autoClose: 3000,
        });
      } else {
        // Fallback for browsers without service worker support
        window.location.reload();
      }
    } catch (error) {
      console.error('PWA update error:', error);
      setIsUpdating(false);
      setUpdateProgress(0);

      notifications.show({
        title: 'Update Failed',
        message: 'There was an error updating the app. Please refresh manually.',
        color: 'red',
      });
    }
  };

  const handleDismiss = () => {
    setShowUpdateBanner(false);

    // Show a subtle reminder after some time
    setTimeout(() => {
      notifications.show({
        title: 'Update Available',
        message: 'A new version of the app is available.',
        color: 'blue',
        icon: <IconRefresh size={rem(16)} />,
        autoClose: 8000,
      });
    }, 60000); // 1 minute
  };

  if (!showUpdateBanner) {
    return null;
  }

  return (
    <Box
      className={className}
      style={{
        position: 'fixed',
        top: rem(20),
        left: rem(20),
        right: rem(20),
        zIndex: 1000,
      }}
    >
      <Box
        p="md"
        bg="#1a1a1a"
        style={{
          border: `1px solid #10b981`,
          borderRadius: rem(12),
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <Group align="flex-start" gap="md">
          <Box
            p="xs"
            bg="#10b981"
            style={{
              borderRadius: rem(8),
              color: 'white',
            }}
          >
            {isUpdating ? (
              <IconRefresh size={rem(20)} style={{ animation: 'spin 1s linear infinite' }} />
            ) : (
              <IconCheck size={rem(20)} />
            )}
          </Box>

          <Box style={{ flex: 1 }}>
            <Text fw={600} mb={4} c="white">
              {isUpdating ? 'Updating...' : 'Update Available'}
            </Text>
            <Text size="sm" c="#9ca3af" mb="md">
              {isUpdating
                ? 'Installing the latest version with new features and improvements.'
                : 'A new version of Gunpla Collection Manager is available with bug fixes and new features.'
              }
            </Text>

            {isUpdating && updateProgress > 0 && (
              <Progress
                value={updateProgress}
                size="sm"
                mb="md"
                color="#10b981"
              />
            )}

            {!isUpdating && (
              <Group gap="sm">
                <Button
                  size="sm"
                  onClick={handleUpdateClick}
                  leftSection={<IconRefresh size={rem(14)} />}
                  style={{
                    background: '#10b981',
                    border: 'none',
                  }}
                >
                  Update Now
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDismiss}
                  leftSection={<IconX size={rem(14)} />}
                  color="#6b7280"
                >
                  Later
                </Button>
              </Group>
            )}
          </Box>
        </Group>
      </Box>
    </Box>
  );
};

export default PWAUpdater;