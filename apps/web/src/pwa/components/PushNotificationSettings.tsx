import React, { useState, useEffect } from 'react';
import {
  Box,
  Group,
  Text,
  Switch,
  Stack,
  Divider,
  Badge,
  Button,
  Alert,
  Select,
  NumberInput,
  useMantineTheme,
  rem
} from '@mantine/core';
import {
  IconBell,
  IconBellOff,
  IconBellRinging,
  IconSettings,
  IconAlertTriangle,
  IconCheck
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

interface NotificationSettings {
  enabled: boolean;
  types: {
    newReleases: boolean;
    priceDrops: boolean;
    buildReminders: boolean;
    collectionUpdates: boolean;
    wishlistAlerts: boolean;
    communityUpdates: boolean;
  };
  preferences: {
    quietHours: boolean;
    quietStart: string;
    quietEnd: string;
    maxDaily: number;
    soundEnabled: boolean;
    vibrationEnabled: boolean;
  };
}

interface PushNotificationSettingsProps {
  onSave?: (settings: NotificationSettings) => void;
  initialSettings?: Partial<NotificationSettings>;
}

export const PushNotificationSettings: React.FC<PushNotificationSettingsProps> = ({
  onSave,
  initialSettings = {}
}) => {
  const theme = useMantineTheme();

  const [settings, setSettings] = useState<NotificationSettings>({
    enabled: false,
    types: {
      newReleases: true,
      priceDrops: true,
      buildReminders: true,
      collectionUpdates: true,
      wishlistAlerts: true,
      communityUpdates: false
    },
    preferences: {
      quietHours: false,
      quietStart: '22:00',
      quietEnd: '08:00',
      maxDaily: 10,
      soundEnabled: true,
      vibrationEnabled: true
    },
    ...initialSettings
  });

  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Check notification support and current permission
    if (!('Notification' in window)) {
      setIsSupported(false);
      return;
    }

    setPermissionStatus(Notification.permission);

    // Listen for permission changes
    const handlePermissionChange = () => {
      setPermissionStatus(Notification.permission);
    };

    // This is a bit of a hack since there's no direct permission change event
    const checkPermission = setInterval(() => {
      if (Notification.permission !== permissionStatus) {
        handlePermissionChange();
        clearInterval(checkPermission);
      }
    }, 1000);

    return () => clearInterval(checkPermission);
  }, [permissionStatus]);

  const requestPermission = async () => {
    if (!isSupported) {
      notifications.show({
        title: 'Not Supported',
        message: 'Push notifications are not supported in your browser.',
        color: 'red',
      });
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setPermissionStatus(permission);

      if (permission === 'granted') {
        setSettings(prev => ({ ...prev, enabled: true }));

        // Request push subscription
        if ('serviceWorker' in navigator && 'pushManager' in ServiceWorkerRegistration.prototype) {
          const registration = await navigator.serviceWorker.ready;

          try {
            const subscription = await registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlBase64ToUint8Array('your-vapid-public-key-here')
            });

            // Send subscription to server
            await sendSubscriptionToServer(subscription);

            notifications.show({
              title: '✅ Notifications Enabled',
              message: 'You\'ll now receive updates about your Gunpla collection!',
              color: 'green',
            });
          } catch (subscriptionError) {
            console.error('Push subscription failed:', subscriptionError);

            notifications.show({
              title: '⚠️ Partial Setup',
              message: 'Notifications enabled, but push subscription failed. Some features may not work.',
              color: 'yellow',
            });
          }
        }
      } else if (permission === 'denied') {
        notifications.show({
          title: '❌ Notifications Blocked',
          message: 'You\'ll need to enable notifications in your browser settings to receive updates.',
          color: 'red',
        });
      }
    } catch (error) {
      console.error('Permission request failed:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to request notification permission.',
        color: 'red',
      });
    }
  };

  const sendSubscriptionToServer = async (subscription: PushSubscription) => {
    // Implementation to send subscription to your backend
    console.log('Sending subscription to server:', subscription);
  };

  const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }

    return outputArray;
  };

  const handleSave = async () => {
    setIsSaving(true);

    try {
      // Save settings to backend/localStorage
      localStorage.setItem('pwa-notification-settings', JSON.stringify(settings));

      if (onSave) {
        await onSave(settings);
      }

      notifications.show({
        title: '✅ Settings Saved',
        message: 'Your notification preferences have been updated.',
        color: 'green',
      });
    } catch (error) {
      console.error('Failed to save settings:', error);
      notifications.show({
        title: '❌ Save Failed',
        message: 'Could not save notification settings.',
        color: 'red',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const updateSetting = (category: keyof NotificationSettings, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...(prev[category] as any),
        [key]: value
      }
    }));
  };

  const getPermissionBadge = () => {
    switch (permissionStatus) {
      case 'granted':
        return <Badge color="green" leftSection={<IconCheck size={rem(10)} />}>Enabled</Badge>;
      case 'denied':
        return <Badge color="red" leftSection={<IconBellOff size={rem(10)} />}>Blocked</Badge>;
      default:
        return <Badge color="yellow" leftSection={<IconBellRinging size={rem(10)} />}>Not Set</Badge>;
    }
  };

  if (!isSupported) {
    return (
      <Box p="md" bg="#1a1a1a" style={{ borderRadius: rem(8) }}>
        <Alert
          icon={<IconAlertTriangle size={rem(20)} />}
          title="Notifications Not Supported"
          color="red"
        >
          Your browser doesn\'t support push notifications. Try using a modern browser like Chrome, Firefox, or Edge.
        </Alert>
      </Box>
    );
  }

  return (
    <Box p="md" bg="#1a1a1a" style={{ borderRadius: rem(8) }}>
      <Stack gap="lg">
        {/* Header */}
        <Group justify="space-between" align="center">
          <Group>
            <IconSettings size={rem(20)} color={theme.colors.red[5]} />
            <Text fw={600} c="white" size="lg">Notification Settings</Text>
          </Group>
          {getPermissionBadge()}
        </Group>

        {/* Permission Status */}
        {permissionStatus !== 'granted' && (
          <Alert
            icon={<IconBell size={rem(20)} />}
            title="Enable Notifications"
            color="blue"
            mb="md"
          >
            <Stack gap="md">
              <Text size="sm">
                Enable push notifications to stay updated about new Gunpla releases, price drops, and collection reminders.
              </Text>
              <Button
                leftSection={<IconBell size={rem(14)} />}
                onClick={requestPermission}
                color="blue"
                variant="light"
              >
                Enable Notifications
              </Button>
            </Stack>
          </Alert>
        )}

        {/* Main Toggle */}
        <Group justify="space-between" p="md" bg="#252525" style={{ borderRadius: rem(8) }}>
          <Group>
            <Text fw={500} c="white">Push Notifications</Text>
            <Text size="sm" c="gray.4">
              Get updates about your Gunpla collection
            </Text>
          </Group>
          <Switch
            checked={settings.enabled}
            disabled={permissionStatus !== 'granted'}
            onChange={(event) => {
              if (permissionStatus === 'granted') {
                setSettings(prev => ({ ...prev, enabled: event.currentTarget.checked }));
              } else {
                requestPermission();
              }
            }}
            size="lg"
          />
        </Group>

        {settings.enabled && permissionStatus === 'granted' && (
          <>
            <Divider color="gray.7" />

            {/* Notification Types */}
            <Stack gap="md">
              <Text fw={500} c="white">Notification Types</Text>

              <Group justify="space-between" p="sm" style={{ borderRadius: rem(4) }}>
                <Text size="sm" c="white">New Kit Releases</Text>
                <Switch
                  checked={settings.types.newReleases}
                  onChange={(e) => updateSetting('types', 'newReleases', e.currentTarget.checked)}
                  size="sm"
                />
              </Group>

              <Group justify="space-between" p="sm" style={{ borderRadius: rem(4) }}>
                <Text size="sm" c="white">Price Drops</Text>
                <Switch
                  checked={settings.types.priceDrops}
                  onChange={(e) => updateSetting('types', 'priceDrops', e.currentTarget.checked)}
                  size="sm"
                />
              </Group>

              <Group justify="space-between" p="sm" style={{ borderRadius: rem(4) }}>
                <Text size="sm" c="white">Build Reminders</Text>
                <Switch
                  checked={settings.types.buildReminders}
                  onChange={(e) => updateSetting('types', 'buildReminders', e.currentTarget.checked)}
                  size="sm"
                />
              </Group>

              <Group justify="space-between" p="sm" style={{ borderRadius: rem(4) }}>
                <Text size="sm" c="white">Collection Updates</Text>
                <Switch
                  checked={settings.types.collectionUpdates}
                  onChange={(e) => updateSetting('types', 'collectionUpdates', e.currentTarget.checked)}
                  size="sm"
                />
              </Group>

              <Group justify="space-between" p="sm" style={{ borderRadius: rem(4) }}>
                <Text size="sm" c="white">Wishlist Alerts</Text>
                <Switch
                  checked={settings.types.wishlistAlerts}
                  onChange={(e) => updateSetting('types', 'wishlistAlerts', e.currentTarget.checked)}
                  size="sm"
                />
              </Group>

              <Group justify="space-between" p="sm" style={{ borderRadius: rem(4) }}>
                <Text size="sm" c="white">Community Updates</Text>
                <Switch
                  checked={settings.types.communityUpdates}
                  onChange={(e) => updateSetting('types', 'communityUpdates', e.currentTarget.checked)}
                  size="sm"
                />
              </Group>
            </Stack>

            <Divider color="gray.7" />

            {/* Preferences */}
            <Stack gap="md">
              <Text fw={500} c="white">Preferences</Text>

              {/* Quiet Hours */}
              <Group justify="space-between" p="sm" style={{ borderRadius: rem(4) }}>
                <Box>
                  <Text size="sm" c="white">Quiet Hours</Text>
                  <Text size="xs" c="gray.4">Silence notifications during specific hours</Text>
                </Box>
                <Switch
                  checked={settings.preferences.quietHours}
                  onChange={(e) => updateSetting('preferences', 'quietHours', e.currentTarget.checked)}
                  size="sm"
                />
              </Group>

              {settings.preferences.quietHours && (
                <Group gap="sm" p="sm" bg="#2a2a2a" style={{ borderRadius: rem(4) }}>
                  <Select
                    label="From"
                    data={[
                      { value: '20:00', label: '8:00 PM' },
                      { value: '21:00', label: '9:00 PM' },
                      { value: '22:00', label: '10:00 PM' },
                      { value: '23:00', label: '11:00 PM' },
                    ]}
                    value={settings.preferences.quietStart}
                    onChange={(value) => updateSetting('preferences', 'quietStart', value || '22:00')}
                    size="sm"
                  />
                  <Text c="gray.4">to</Text>
                  <Select
                    label="To"
                    data={[
                      { value: '06:00', label: '6:00 AM' },
                      { value: '07:00', label: '7:00 AM' },
                      { value: '08:00', label: '8:00 AM' },
                      { value: '09:00', label: '9:00 AM' },
                    ]}
                    value={settings.preferences.quietEnd}
                    onChange={(value) => updateSetting('preferences', 'quietEnd', value || '08:00')}
                    size="sm"
                  />
                </Group>
              )}

              {/* Max Daily Notifications */}
              <Group justify="space-between" p="sm" style={{ borderRadius: rem(4) }}>
                <Box>
                  <Text size="sm" c="white">Max Daily Notifications</Text>
                  <Text size="xs" c="gray.4">Limit notifications per day</Text>
                </Box>
                <NumberInput
                  value={settings.preferences.maxDaily}
                  onChange={(value) => updateSetting('preferences', 'maxDaily', value || 10)}
                  min={1}
                  max={50}
                  size="sm"
                  w={80}
                />
              </Group>

              {/* Sound */}
              <Group justify="space-between" p="sm" style={{ borderRadius: rem(4) }}>
                <Text size="sm" c="white">Sound Effects</Text>
                <Switch
                  checked={settings.preferences.soundEnabled}
                  onChange={(e) => updateSetting('preferences', 'soundEnabled', e.currentTarget.checked)}
                  size="sm"
                />
              </Group>

              {/* Vibration */}
              <Group justify="space-between" p="sm" style={{ borderRadius: rem(4) }}>
                <Text size="sm" c="white">Vibration</Text>
                <Switch
                  checked={settings.preferences.vibrationEnabled}
                  onChange={(e) => updateSetting('preferences', 'vibrationEnabled', e.currentTarget.checked)}
                  size="sm"
                />
              </Group>
            </Stack>

            <Divider color="gray.7" />

            {/* Save Button */}
            <Button
              fullWidth
              onClick={handleSave}
              loading={isSaving}
              leftSection={<IconCheck size={rem(14)} />}
              style={{
                background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
              }}
            >
              Save Settings
            </Button>
          </>
        )}

        {/* Preview Section */}
        <Box p="md" bg="#2a2a2a" style={{ borderRadius: rem(8), border: `1px solid ${theme.colors.gray[7]}` }}>
          <Text size="sm" fw={500} c="white" mb="sm">Test Notifications</Text>
          <Group gap="sm">
            <Button
              variant="light"
              size="xs"
              color="blue"
              onClick={() => {
                if ('Notification' in window && Notification.permission === 'granted') {
                  new Notification('Test Notification', {
                    body: 'This is a test notification from Gunpla Collection Manager!',
                    icon: '/icons/icon-192x192.png',
                    badge: '/icons/badge-72x72.png',
                  });
                }
              }}
              disabled={permissionStatus !== 'granted'}
            >
              Send Test
            </Button>
            <Text size="xs" c="gray.4">
              Test how notifications will appear
            </Text>
          </Group>
        </Box>
      </Stack>
    </Box>
  );
};

export default PushNotificationSettings;