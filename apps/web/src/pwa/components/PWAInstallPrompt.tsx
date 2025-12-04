import React, { useState, useEffect, useCallback } from 'react';
import { Button, Group, Text, Box, rem, Progress, Stack, ActionIcon } from '@mantine/core';
import { IconDownload, IconX, IconDeviceMobile, IconDeviceDesktop, IconBolt, IconPointerBolt, IconStar } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useLocalStorage } from '@mantine/hooks';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface PWAInstallPromptProps {
  className?: string;
}

interface InstallMetrics {
  firstPrompted: number | null;
  dismissedCount: number;
  lastShown: number | null;
  installAttempts: number;
}

export const PWAInstallPrompt: React.FC<PWAInstallPromptProps> = ({ className }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [installProgress, setInstallProgress] = useState(0);

  // Track install metrics for smart prompting
  const [installMetrics, setInstallMetrics] = useLocalStorage<InstallMetrics>({
    key: 'pwa-install-metrics',
    defaultValue: {
      firstPrompted: null,
      dismissedCount: 0,
      lastShown: null,
      installAttempts: 0
    }
  });

  // Track if user has already dismissed too many times
  const [shouldShowPrompt, setShouldShowPrompt] = useState(true);

  // Smart install prompt logic
  const shouldShowInstallPrompt = useCallback(() => {
    // Don't show if user has dismissed more than 3 times
    if (installMetrics.dismissedCount >= 3) return false;

    // Don't show if shown in last 24 hours
    if (installMetrics.lastShown) {
      const timeSinceLastShown = Date.now() - installMetrics.lastShown;
      if (timeSinceLastShown < 24 * 60 * 60 * 1000) return false;
    }

    // Show on first visit after 2 minutes
    if (!installMetrics.firstPrompted) {
      return true;
    }

    return true;
  }, [installMetrics]);

  useEffect(() => {
    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);

      // Smart timing based on user engagement
      const delay = installMetrics.installAttempts === 0 ? 120000 : 30000; // 2 minutes first time, 30 seconds after attempts

      setTimeout(() => {
        if (shouldShowInstallPrompt()) {
          setShowInstallBanner(true);
          setInstallMetrics(prev => ({
            ...prev,
            firstPrompted: prev.firstPrompted || Date.now(),
            lastShown: Date.now()
          }));
        }
      }, delay);
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsInstallable(false);
      setShowInstallBanner(false);

      // Track successful installation
      setInstallMetrics(prev => ({
        ...prev,
        installAttempts: prev.installAttempts + 1
      }));

      notifications.show({
        title: '🎉 App Installed Successfully!',
        message: 'Gunpla Collection Manager is now installed. Check your app drawer!',
        color: 'green',
        icon: <IconDownload size={rem(16)} />,
        autoClose: 8000,
      });
    };

    // Listen for online status changes
    const handleOnlineChange = () => {
      if (navigator.onLine && isInstallable && !showInstallBanner && shouldShowInstallPrompt()) {
        setTimeout(() => setShowInstallBanner(true), 5000);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', handleOnlineChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnlineChange);
    };
  }, [isInstallable, showInstallBanner, shouldShowInstallPrompt, setInstallMetrics]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    setIsInstalling(true);
    setInstallProgress(0);

    try {
      // Simulate progress animation
      const progressInterval = setInterval(() => {
        setInstallProgress(prev => Math.min(prev + 10, 90));
      }, 100);

      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      clearInterval(progressInterval);
      setInstallProgress(100);

      if (outcome === 'accepted') {
        const notificationId = notifications.show({
          title: '🚀 Installing...',
          message: 'Installing Gunpla Collection Manager on your device.',
          color: 'blue',
          loading: true,
          autoClose: false,
        });

        // Complete the installation animation
        setTimeout(() => {
          notifications.update({
            id: notificationId,
            title: '✨ Almost Done!',
            message: 'The app is being installed. Check your home screen!',
            color: 'green',
            loading: false,
            autoClose: 5000,
          });
        }, 2000);
      } else {
        notifications.show({
          title: 'Installation Cancelled',
          message: 'You can install the app later from the browser menu.',
          color: 'yellow',
          icon: <IconDownload size={rem(16)} />,
        });
      }

      setDeferredPrompt(null);
      setShowInstallBanner(false);
      setIsInstallable(false);

      // Track install attempt
      setInstallMetrics(prev => ({
        ...prev,
        installAttempts: prev.installAttempts + 1
      }));

    } catch (error) {
      console.error('PWA installation error:', error);
      notifications.show({
        title: 'Installation Failed',
        message: 'There was an error installing the app. Please try again.',
        color: 'red',
        icon: <IconX size={rem(16)} />,
      });
    } finally {
      setIsInstalling(false);
      setTimeout(() => setInstallProgress(0), 1000);
    }
  };

  const handleDismiss = () => {
    setShowInstallBanner(false);

    // Track dismissal for smart prompting
    setInstallMetrics(prev => ({
      ...prev,
      dismissedCount: prev.dismissedCount + 1
    }));

    // Show a subtle reminder later based on dismissal count
    const reminderDelay = installMetrics.dismissedCount === 0 ? 30000 : // 30 seconds first time
                         installMetrics.dismissedCount === 1 ? 300000 : // 5 minutes second time
                         1800000; // 30 minutes subsequent times

    setTimeout(() => {
      if (isInstallable && installMetrics.dismissedCount < 3) {
        notifications.show({
          title: '🔔 Install Available',
          message: installMetrics.dismissedCount === 0
            ? 'Install Gunpla Collection Manager for offline access and push notifications.'
            : 'Get the full experience with our installed app!',
          color: 'blue',
          icon: <IconDownload size={rem(16)} />,
          autoClose: 8000
        });
      }
    }, reminderDelay);
  };

  const handleManualInstall = () => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);

    let instructions = '';
    if (isIOS) {
      instructions = 'Tap the Share button and then "Add to Home Screen"';
    } else if (isAndroid) {
      instructions = 'Tap the menu button and then "Install app" or "Add to Home screen"';
    } else {
      instructions = 'Look for the install icon in your browser\'s address bar';
    }

    notifications.show({
      title: '📱 Manual Installation',
      message: instructions,
      color: 'blue',
      autoClose: 10000,
    });
  };

  const getDeviceIcon = () => {
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    return isMobile ? <IconDeviceMobile size={rem(20)} /> : <IconDeviceDesktop size={rem(20)} />;
  };

  // Floating install button for mobile
  if (!showInstallBanner && isInstallable && !deferredPrompt) {
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    if (isMobile) {
      return (
        <ActionIcon
          className={className}
          variant="filled"
          color="#dc2626"
          size="lg"
          style={{
            position: 'fixed',
            bottom: rem(80),
            right: rem(20),
            zIndex: 999,
            boxShadow: '0 4px 16px rgba(220, 38, 38, 0.3)',
          }}
          onClick={() => setShowInstallBanner(true)}
          title="Install Gunpla App"
        >
          <IconDownload size={rem(20)} />
        </ActionIcon>
      );
    }
  }

  if (!showInstallBanner || !deferredPrompt) {
    return null;
  }

  return (
    <Box
      className={className}
      style={{
        position: 'fixed',
        bottom: rem(20),
        left: rem(20),
        right: rem(20),
        zIndex: 1000,
        animation: 'slideUp 0.3s ease-out',
      }}
    >
      <Box
        p="md"
        bg="#1a1a1a"
        style={{
          border: `1px solid #dc2626`,
          borderRadius: rem(12),
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <Group align="flex-start" gap="md">
          <Box
            p="xs"
            bg="#dc2626"
            style={{
              borderRadius: rem(8),
              color: 'white',
              flexShrink: 0,
            }}
          >
            {getDeviceIcon()}
          </Box>

          <Box style={{ flex: 1 }}>
            <Group justify="space-between" mb="xs">
              <Text fw={600} c="white">
                Install Gunpla App
              </Text>
              <ActionIcon
                variant="subtle"
                color="#6b7280"
                size="sm"
                onClick={handleManualInstall}
                title="Manual installation instructions"
              >
                <IconBolt size={rem(14)} />
              </ActionIcon>
            </Group>

            <Text size="sm" c="#9ca3af" mb="sm">
              Get the full experience with offline access and push notifications!
            </Text>

            {/* Feature highlights */}
            <Stack gap="xs" mb="md">
              <Group gap="xs">
                <IconPointerBolt size={rem(14)} color="#dc2626" />
                <Text size="xs" c="#e5e7eb">Works offline</Text>
              </Group>
              <Group gap="xs">
                <IconBolt size={rem(14)} color="#dc2626" />
                <Text size="xs" c="#e5e7eb">Lightning fast</Text>
              </Group>
              <Group gap="xs">
                <IconStar size={rem(14)} color="#dc2626" />
                <Text size="xs" c="#e5e7eb">App shortcuts</Text>
              </Group>
            </Stack>

            {/* Installation progress */}
            {isInstalling && (
              <Box mb="md">
                <Progress
                  value={installProgress}
                  size="sm"
                  color="#dc2626"
                  animated
                />
                <Text size="xs" c="#dc2626" mt="xs">
                  Installing... {installProgress}%
                </Text>
              </Box>
            )}

            <Group gap="sm">
              <Button
                size="sm"
                onClick={handleInstallClick}
                leftSection={<IconDownload size={rem(14)} />}
                loading={isInstalling}
                disabled={isInstalling}
                style={{
                  background: '#dc2626',
                  border: 'none',
                  flex: 1,
                }}
              >
                {isInstalling ? 'Installing...' : 'Install App'}
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={handleDismiss}
                leftSection={<IconX size={rem(14)} />}
                color="#6b7280"
                disabled={isInstalling}
              >
                Not Now
              </Button>
            </Group>

            {/* Dismissal hint */}
            {installMetrics.dismissedCount > 0 && (
              <Text size="xs" c="#6b7280" mt="xs">
                Dismissed {installMetrics.dismissedCount} time{installMetrics.dismissedCount > 1 ? 's' : ''}
              </Text>
            )}
          </Box>
        </Group>
      </Box>
    </Box>
  );
};

export default PWAInstallPrompt;