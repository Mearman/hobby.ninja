import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Group,
  Text,
  LoadingOverlay,
  Transition,
  Progress,
  useMantineTheme,
  rem,
  Stack,
  Skeleton,
  Container,
  Paper
} from '@mantine/core';
import {
  IconLoader2,
  IconBrandAndroid, // Using as replacement for IconBrandAndroid
  IconAlertTriangle,
  IconWifiOff
} from '@tabler/icons-react';

interface AppShellProps {
  children: React.ReactNode;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  showOfflineIndicator?: boolean;
}

interface LoadingState {
  isLoading: boolean;
  progress: number;
  stage: 'initializing' | 'loading' | 'hydrating' | 'ready' | 'error';
  message: string;
}

export const AppShell: React.FC<AppShellProps> = ({
  children,
  loading = false,
  error = null,
  onRetry,
  showOfflineIndicator = true
}) => {
  const theme = useMantineTheme();
  const [loadingState, setLoadingState] = useState<LoadingState>({
    isLoading: true,
    progress: 0,
    stage: 'initializing',
    message: 'Initializing app...'
  });
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showShell, setShowShell] = useState(true);
  const shellMounted = useRef(false);

  useEffect(() => {
    shellMounted.current = true;

    // Simulate app initialization stages
    const initializeApp = async () => {
      try {
        // Stage 1: Initializing
        setLoadingState(prev => ({
          ...prev,
          stage: 'initializing',
          progress: 10,
          message: 'Initializing app shell...'
        }));

        await new Promise(resolve => setTimeout(resolve, 300));

        // Stage 2: Loading critical resources
        setLoadingState(prev => ({
          ...prev,
          stage: 'loading',
          progress: 30,
          message: 'Loading critical resources...'
        }));

        await new Promise(resolve => setTimeout(resolve, 500));

        // Stage 3: Hydrating application
        setLoadingState(prev => ({
          ...prev,
          stage: 'hydrating',
          progress: 70,
          message: 'Hydrating application...'
        }));

        await new Promise(resolve => setTimeout(resolve, 400));

        // Stage 4: Ready
        setLoadingState(prev => ({
          ...prev,
          stage: 'ready',
          progress: 100,
          message: 'Ready!'
        }));

        // Hide shell after a brief moment
        setTimeout(() => {
          if (shellMounted.current) {
            setShowShell(false);
          }
        }, 300);

      } catch (error) {
        console.error('App initialization failed:', error);
        setLoadingState(prev => ({
          ...prev,
          stage: 'error',
          message: 'Failed to initialize app'
        }));
      }
    };

    // Initialize app
    const timer = setTimeout(initializeApp, 100);

    return () => {
      shellMounted.current = false;
      clearTimeout(timer);
    };
  }, []);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Handle external loading prop changes
  useEffect(() => {
    if (loading !== loadingState.isLoading) {
      setLoadingState(prev => ({
        ...prev,
        isLoading: loading,
        stage: loading ? 'loading' : 'ready',
        progress: loading ? 50 : 100
      }));
    }
  }, [loading, loadingState.isLoading]);

  const getStageIcon = () => {
    switch (loadingState.stage) {
      case 'initializing':
      case 'loading':
      case 'hydrating':
        return <IconLoader2 size={rem(48)} className="animate-spin" />;
      case 'error':
        return <IconAlertTriangle size={rem(48)} />;
      default:
        return <IconBrandAndroid size={rem(48)} />;
    }
  };

  const getStageColor = () => {
    switch (loadingState.stage) {
      case 'error':
        return theme.colors.red[5];
      case 'ready':
        return theme.colors.green[5];
      default:
        return theme.colors.blue[5];
    }
  };

  // Critical shell components for instant loading
  const ShellHeader = () => (
    <Box
      p="md"
      bg="#1a1a1a"
      style={{
        borderBottom: `1px solid ${theme.colors.gray[8]}`,
        position: 'sticky',
        top: 0,
        zIndex: 1000
      }}
    >
      <Group justify="space-between">
        <Group>
          <IconBrandAndroid size={rem(24)} color={theme.colors.red[5]} />
          <Text fw={600} c="white" size="lg">Gunpla Manager</Text>
        </Group>

        {isOffline && showOfflineIndicator && (
          <Group gap="xs" c="yellow" pl="md">
            <IconWifiOff size={rem(16)} />
            <Text size="sm">Offline</Text>
          </Group>
        )}
      </Group>
    </Box>
  );

  const ShellNavigation = () => (
    <Box
      p="sm"
      bg="#252525"
      style={{
        borderBottom: `1px solid ${theme.colors.gray[8]}`
      }}
    >
      <Group gap="lg">
        <Text size="sm" c="white" opacity={0.8}>Collection</Text>
        <Text size="sm" c="white" opacity={0.8}>Wishlist</Text>
        <Text size="sm" c="white" opacity={0.8}>Builds</Text>
        <Text size="sm" c="white" opacity={0.8}>Search</Text>
      </Group>
    </Box>
  );

  const LoadingScreen = () => (
    <Box
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <Container size="sm">
        <Stack align="center" gap="xl">
          <Box color={getStageColor()}>
            {getStageIcon()}
          </Box>

          <Stack align="center" gap="md">
            <Text size="xl" fw={700} c="white">
              {loadingState.stage === 'error' ? 'Something went wrong' : 'Loading Gunpla Manager'}
            </Text>
            <Text size="sm" c="gray.4" ta="center">
              {loadingState.message}
            </Text>
          </Stack>

          {loadingState.stage !== 'error' && (
            <Box w="100%">
              <Progress
                value={loadingState.progress}
                color="blue"
                size="md"
                radius="md"
                animated
              />
            </Box>
          )}

          {loadingState.stage === 'error' && onRetry && (
            <Box mt="md">
              <button
                onClick={onRetry}
                style={{
                  background: theme.colors.red[5],
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Try Again
              </button>
            </Box>
          )}

          {/* Quick preview of cached data */}
          {loadingState.stage === 'hydrating' && (
            <Box w="100%" mt="xl">
              <Paper p="md" bg="#2a2a2a" radius="md">
                <Stack gap="sm">
                  <Skeleton height={20} w="60%" />
                  <Skeleton height={16} w="80%" />
                  <Skeleton height={16} w="70%" />
                  <Skeleton height={40} mt="md" />
                </Stack>
              </Paper>
            </Box>
          )}
        </Stack>
      </Container>
    </Box>
  );

  // Content skeleton for instant loading experience
  const ContentSkeleton = () => (
    <Container size="lg" py="md">
      <Stack gap="lg">
        {/* Header skeleton */}
        <Group justify="space-between">
          <Skeleton height={32} w={200} />
          <Group gap="sm">
            <Skeleton height={36} w={100} />
            <Skeleton height={36} w={100} />
          </Group>
        </Group>

        {/* Stats cards skeleton */}
        <Group>
          {[1, 2, 3, 4].map((i) => (
            <Paper key={i} p="md" bg="#2a2a2a" radius="md" style={{ flex: 1 }}>
              <Stack gap="xs">
                <Skeleton height={20} w={80} />
                <Skeleton height={32} w={120} />
              </Stack>
            </Paper>
          ))}
        </Group>

        {/* Collection grid skeleton */}
        <Stack gap="md">
          <Skeleton height={24} w={150} />
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
              gap: '16px'
            }}
          >
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Paper key={i} p="md" bg="#2a2a2a" radius="md">
                <Stack gap="sm">
                  <Skeleton height={160} />
                  <Skeleton height={20} w="90%" />
                  <Skeleton height={16} w="70%" />
                  <Skeleton height={16} w="80%" />
                </Stack>
              </Paper>
            ))}
          </div>
        </Stack>
      </Stack>
    </Container>
  );

  if (showShell || loadingState.isLoading) {
    return <LoadingScreen />;
  }

  if (error) {
    return (
      <Box
        style={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <ShellHeader />
        <Container size="sm" py="xl" style={{ flex: 1 }}>
          <Stack align="center" gap="lg">
            <IconAlertTriangle size={rem(64)} color={theme.colors.red[5]} />
            <Stack align="center" gap="sm" ta="center">
              <Text size="xl" fw={700} c="white">Application Error</Text>
              <Text size="md" c="gray.4">{error}</Text>
            </Stack>
            {onRetry && (
              <button
                onClick={onRetry}
                style={{
                  background: theme.colors.red[5],
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Reload Application
              </button>
            )}
          </Stack>
        </Container>
      </Box>
    );
  }

  return (
    <Box
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
      }}
    >
      <ShellHeader />
      <ShellNavigation />

      <Box style={{ position: 'relative', flex: 1 }}>
        <LoadingOverlay
          visible={loading}
          loaderProps={{
            children: <ContentSkeleton />
          }}
          overlayProps={{
            backgroundOpacity: 0.95,
            blur: 2
          }}
        />

        {children}
      </Box>

      {/* Offline indicator overlay */}
      {isOffline && showOfflineIndicator && (
        <Box
          style={{
            position: 'fixed',
            bottom: rem(20),
            left: rem(20),
            right: rem(20),
            background: 'rgba(251, 191, 36, 0.1)',
            border: `1px solid ${theme.colors.yellow[7]}`,
            borderRadius: rem(8),
            padding: rem(12),
            zIndex: 1000
          }}
        >
          <Group justify="space-between">
            <Group gap="xs">
              <IconWifiOff size={rem(16)} color={theme.colors.yellow[5]} />
              <Text size="sm" c="yellow">
                You're offline. Some features may be unavailable.
              </Text>
            </Group>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: theme.colors.yellow[5],
                color: 'black',
                border: 'none',
                padding: '4px 12px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Retry
            </button>
          </Group>
        </Box>
      )}
    </Box>
  );
};

export default AppShell;