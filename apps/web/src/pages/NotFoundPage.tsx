import React from 'react';
import { Container, Title, Text, Button, Group, Stack } from '@mantine/core';
import { notFoundContainer } from '../styles/styles.css';
import { Link } from '@tanstack/react-router';
import { IconHome, IconSearch, IconArrowLeft } from '@tabler/icons-react';

export function NotFoundPage() {
  return (
    <div className={notFoundContainer}>
      <Container size="sm">
        <Stack align="center" gap="lg">
          <div style={{ fontSize: '8rem', opacity: 0.5 }}>🤖</div>

          <Title order={1} size={48} c="primary">
            404 - Page Not Found
          </Title>

          <Text size="lg" c="dimmed" ta="center">
            Oops! It looks like this Gunpla kit has gone missing in action.
            The page you're looking for doesn't exist or has been moved.
          </Text>

          <Text c="dimmed" ta="center">
            Maybe try checking the navigation or searching for what you need?
          </Text>

          <Group>
            <Button
              component={Link}
              to="/"
              size="lg"
              leftSection={<IconHome size={16} />}
            >
              Go Home
            </Button>

            <Button
              component={Link}
              to="/database"
              variant="outline"
              size="lg"
              leftSection={<IconSearch size={16} />}
            >
              Browse Database
            </Button>
          </Group>

          <Button
            variant="subtle"
            size="sm"
            onClick={() => window.history.back()}
            leftSection={<IconArrowLeft size={14} />}
          >
            Go Back
          </Button>
        </Stack>
      </Container>
    </div>
  );
}