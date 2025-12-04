import React, { useState, useEffect } from 'react';
import { Button, Group, Text, Box, rem } from '@mantine/core';
import { IconDownload, IconX, IconDeviceMobile, IconDeviceDesktop } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

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

export const PWAInstallPrompt: React.FC<PWAInstallPromptProps> = ({ className }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);

      // Show banner after a delay to avoid annoying users immediately
      setTimeout(() => {
        setShowInstallBanner(true);
      }, 3000);
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsInstallable(false);
      setShowInstallBanner(false);

      notifications.show({
        title: 'App Installed Successfully!',
        message: 'Gunpla Collection Manager is now installed on your device.',
        color: 'green',
        icon: <IconDownload size={rem(16)} />,
      });
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        notifications.show({
          title: 'Installing...',
          message: 'Installing Gunpla Collection Manager on your device.',
          color: 'blue',
          loading: true,
        });
      } else {
        notifications.show({
          title: 'Installation Cancelled',
          message: 'You can install the app later from the browser menu.',
          color: 'yellow',
        });
      }

      setDeferredPrompt(null);
      setShowInstallBanner(false);
      setIsInstallable(false);
    } catch (error) {
      console.error('PWA installation error:', error);
      notifications.show({
        title: 'Installation Failed',
        message: 'There was an error installing the app. Please try again.',
        color: 'red',
      });
    }
  };

  const handleDismiss = () => {
    setShowInstallBanner(false);

    // Show a subtle reminder later
    setTimeout(() => {
      if (isInstallable) {
        notifications.show({
          title: 'Install Available',
          message: 'Install Gunpla Collection Manager for a better experience.',
          color: 'blue',
          icon: <IconDownload size={rem(16)} />,
          autoClose: 5000,
        });
      }
    }, 30000); // 30 seconds
  };

  const getDeviceIcon = () => {
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    return isMobile ? <IconDeviceMobile size={rem(20)} /> : <IconDeviceDesktop size={rem(20)} />;
  };

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
            }}
          >
            {getDeviceIcon()}
          </Box>

          <Box style={{ flex: 1 }}>
            <Text fw={600} mb={4} c="white">
              Install Gunpla App
            </Text>
            <Text size="sm" c="#9ca3af" mb="md">
              Install our app for a faster experience, offline access, and app shortcuts.
            </Text>

            <Group gap="sm">
              <Button
                size="sm"
                onClick={handleInstallClick}
                leftSection={<IconDownload size={rem(14)} />}
                style={{
                  background: '#dc2626',
                  border: 'none',
                }}
              >
                Install App
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={handleDismiss}
                leftSection={<IconX size={rem(14)} />}
                color="#6b7280"
              >
                Not Now
              </Button>
            </Group>
          </Box>
        </Group>
      </Box>
    </Box>
  );
};

export default PWAInstallPrompt;