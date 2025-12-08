import React from 'react';
import Link from 'next/link';
import {
  Title,
  Text,
  Badge,
  Group,
  Stack,
  Card,
  SimpleGrid,
  Container,
  Grid,
  Button,
  ActionIcon,
  Modal,
  TextInput,
  Textarea,
  NumberInput,
  Select,
  Switch,
  Progress,
  Avatar,
  Box,
  Breadcrumbs,
  Anchor,
  Menu,
  Divider,
  Skeleton,
} from '@mantine/core';
import {
  IconPlus,
  IconFolder,
  IconBox,
  IconDots,
  IconEdit,
  IconTrash,
  IconTrendingUp,
  IconChevronRight,
  IconHome,
  IconChartBar,
  IconSearch,
  IconFilter,
  IconDownload,
  IconUpload,
} from '@tabler/icons-react';
import { useCollection } from '@/contexts/collection-context';
import { getAllItems } from '@/lib/graph-data';
import { getNodeDisplayName } from '@/lib/schemas';
import styles from '@/styles/components.css';

// Collection card component
function CollectionCard({ collection, onEdit, onDelete }: {
  collection: any;
  onEdit: (collection: any) => void;
  onDelete: (collection: any) => void;
}) {
  return (
    <Card
      p="lg"
      radius="md"
      className={styles.collectionCard}
      withBorder
    >
      <Group justify="space-between" mb="md">
        <Group>
          <div className={styles.collectionHeader} style={{
            backgroundColor: 'var(--mantine-color-blue-6)',
            width: 48,
            height: 48,
            borderRadius: 'var(--mantine-radius-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
          }}>
            <IconFolder size={24} />
          </div>
          <Box>
            <Text fw={600} size="lg">
              {collection.name}
            </Text>
            {collection.description && (
              <Text size="sm" color="dimmed" lineClamp={1}>
                {collection.description}
              </Text>
            )}
          </Box>
        </Group>

        <Menu shadow="md" width={200}>
          <Menu.Target>
            <ActionIcon variant="subtle" color="gray">
              <IconDots size={16} />
            </ActionIcon>
          </Menu.Target>

          <Menu.Dropdown>
            <Menu.Item leftSection={<IconEdit size={14} />} onClick={() => onEdit(collection)}>
              Edit Collection
            </Menu.Item>
            <Menu.Item leftSection={<IconDownload size={14} />}>
              Export
            </Menu.Item>
            <Menu.Divider />
            <Menu.Item
              leftSection={<IconTrash size={14} />}
              color="red"
              onClick={() => onDelete(collection)}
            >
              Delete Collection
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Group>

      <Box className={styles.collectionContent}>
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <Text className={styles.statValue}>{collection.itemCount || 0}</Text>
            <Text className={styles.statLabel}>Items</Text>
          </div>
          <div className={styles.statCard}>
            <Text className={styles.statValue}>{collection.completedCount || 0}</Text>
            <Text className={styles.statLabel}>Completed</Text>
          </div>
          <div className={styles.statCard}>
            <Text className={styles.statValue}>{collection.wantedCount || 0}</Text>
            <Text className={styles.statLabel}>Wanted</Text>
          </div>
          <div className={styles.statCard}>
            <Text className={styles.statValue}>{collection.totalValue || 0}</Text>
            <Text className={styles.statLabel}>Total Value</Text>
          </div>
        </div>

        <Box mt="md">
          <Text size="sm" fw={500} mb="xs">Completion Progress</Text>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{
                width: `${collection.completionPercentage || 0}%`,
                backgroundColor: 'var(--mantine-color-blue-6)'
              }}
            />
            <div className={styles.progressSegments}>
              <div
                className={styles.progressSegment}
                style={{
                  width: `${(collection.completedCount || 0) / (collection.itemCount || 1) * 100}%`,
                  backgroundColor: 'var(--mantine-color-green-6)'
                }}
              />
              <div
                className={styles.progressSegment}
                style={{
                  width: `${(collection.inProgressCount || 0) / (collection.itemCount || 1) * 100}%`,
                  backgroundColor: 'var(--mantine-color-orange-6)'
                }}
              />
            </div>
          </div>
          <Text size="xs" color="dimmed" mt="xs">
            {collection.completionPercentage || 0}% Complete
          </Text>
        </Box>

        <Group mt="md" justify="space-between">
          <Text size="sm" color="dimmed">
            Updated {new Date(collection.lastModified).toLocaleDateString()}
          </Text>
          <Button
            component={Link}
            href={`/collection/${collection.id}`}
            variant="light"
            size="sm"
          >
            View Collection
          </Button>
        </Group>
      </Box>
    </Card>
  );
}

// Quick stats component
function QuickStats({ state }: { state: any }) {
  return (
    <Card p="lg" radius="md" withBorder>
      <Title order={3} mb="md">
        Quick Stats
      </Title>
      <SimpleGrid
        cols={{ base: 1, sm: 2, lg: 4 }}
        spacing="md"
      >
        <div className={styles.statCard}>
          <Group>
            <div className={styles.databaseStatIcon}>
              <IconFolder size={20} />
            </div>
            <div>
              <Text size="xs" color="dimmed" tt="uppercase" fw={700}>
                Total Collections
              </Text>
              <Text size="lg" fw={500}>
                {state.collections.length}
              </Text>
            </div>
          </Group>
        </div>

        <div className={styles.statCard}>
          <Group>
            <div className={styles.databaseStatIcon}>
              <IconBox size={20} />
            </div>
            <div>
              <Text size="xs" color="dimmed" tt="uppercase" fw={700}>
                Total Items
              </Text>
              <Text size="lg" fw={500}>
                {state.stats?.totalItems || 0}
              </Text>
            </div>
          </Group>
        </div>

        <div className={styles.statCard}>
          <Group>
            <div className={styles.databaseStatIcon}>
              <IconTrendingUp size={20} />
            </div>
            <div>
              <Text size="xs" color="dimmed" tt="uppercase" fw={700}>
                Completed
              </Text>
              <Text size="lg" fw={500}>
                {state.stats?.statusBreakdown?.completed || 0}
              </Text>
            </div>
          </Group>
        </div>

        <div className={styles.statCard}>
          <Group>
            <div className={styles.databaseStatIcon}>
              <IconChartBar size={20} />
            </div>
            <div>
              <Text size="xs" color="dimmed" tt="uppercase" fw={700}>
                Total Value
              </Text>
              <Text size="lg" fw={500}>
                ¥{(state.stats?.totalValue || 0).toLocaleString()}
              </Text>
            </div>
          </Group>
        </div>
      </SimpleGrid>
    </Card>
  );
}

// Loading skeleton
function LoadingSkeleton() {
  return (
    <>
      {[...Array(3)].map((_, index) => (
        <Card key={index} p="lg" radius="md" withBorder>
          <Group justify="space-between" mb="md">
            <Group>
              <Skeleton width={48} height={48} radius="md" />
              <Box>
                <Skeleton width={150} height={20} mb="xs" />
                <Skeleton width={200} height={16} />
              </Box>
            </Group>
            <Skeleton width={36} height={36} radius="sm" />
          </Group>

          <div className={styles.statsGrid}>
            {[...Array(4)].map((_, i) => (
              <div key={i} className={styles.statCard}>
                <Skeleton width={40} height={24} mb="xs" />
                <Skeleton width={50} height={14} />
              </div>
            ))}
          </div>

          <Box mt="md">
            <Skeleton width={120} height={16} mb="xs" />
            <Skeleton width="100%" height={8} mb="xs" />
            <Skeleton width={80} height={12} />
          </Box>

          <Group mt="md" justify="space-between">
            <Skeleton width={120} height={14} />
            <Skeleton width={100} height={32} radius="sm" />
          </Group>
        </Card>
      ))}
    </>
  );
}

// Main collection page
export default function CollectionPage() {
  const { state, actions } = useCollection();
  const [createModalOpen, setCreateModalOpen] = React.useState(false);
  const [editModalOpen, setEditModalOpen] = React.useState(false);
  const [selectedCollection, setSelectedCollection] = React.useState<any>(null);
  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);
  const [formData, setFormData] = React.useState({
    name: '',
    description: '',
  });

  React.useEffect(() => {
    actions.loadCollections();
  }, []);

  const handleCreateCollection = async () => {
    try {
      await actions.createCollection(formData.name, formData.description);
      setCreateModalOpen(false);
      setFormData({ name: '', description: '' });
    } catch (error) {
      console.error('Failed to create collection:', error);
    }
  };

  const handleUpdateCollection = async () => {
    if (!selectedCollection) return;

    try {
      await actions.updateCollection(selectedCollection.id, formData);
      setEditModalOpen(false);
      setSelectedCollection(null);
      setFormData({ name: '', description: '' });
    } catch (error) {
      console.error('Failed to update collection:', error);
    }
  };

  const handleDeleteCollection = async () => {
    if (!selectedCollection) return;

    try {
      await actions.deleteCollection(selectedCollection.id);
      setDeleteModalOpen(false);
      setSelectedCollection(null);
    } catch (error) {
      console.error('Failed to delete collection:', error);
    }
  };

  const openEditModal = (collection: any) => {
    setSelectedCollection(collection);
    setFormData({
      name: collection.name,
      description: collection.description || '',
    });
    setEditModalOpen(true);
  };

  const openDeleteModal = (collection: any) => {
    setSelectedCollection(collection);
    setDeleteModalOpen(true);
  };

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        {/* Header */}
        <Box>
          <Group justify="space-between" align="flex-start">
            <Box>
              <Title order={1} mb="sm">
                My Collections
              </Title>
              <Text size="lg" color="dimmed">
                Manage and track your personal hobby collections
              </Text>
            </Box>
            <Button
              leftSection={<IconPlus size={16} />}
              onClick={() => setCreateModalOpen(true)}
            >
              New Collection
            </Button>
          </Group>
        </Box>

        {/* Breadcrumbs */}
        <Breadcrumbs>
          <Anchor href="/" size="sm">
            <Group gap={4}>
              <IconHome size={14} />
              Home
            </Group>
          </Anchor>
          <Anchor href="/database" size="sm">
            Database
          </Anchor>
          <Text size="sm">Collections</Text>
        </Breadcrumbs>

        {/* Quick Stats */}
        {!state.loading && <QuickStats state={state} />}

        {/* Collections Grid */}
        <Box>
          <Group justify="space-between" mb="md">
            <Title order={2}>
              Your Collections
            </Title>
            <Group>
              {state.collections.length > 0 && (
                <>
                  <Button
                    variant="light"
                    leftSection={<IconFilter size={14} />}
                    size="sm"
                  >
                    Filter
                  </Button>
                  <Button
                    variant="light"
                    leftSection={<IconDownload size={14} />}
                    size="sm"
                  >
                    Export All
                  </Button>
                </>
              )}
            </Group>
          </Group>

          {state.loading ? (
            <SimpleGrid
              cols={{ base: 1, sm: 2, lg: 3 }}
              spacing="lg"
            >
              <LoadingSkeleton />
            </SimpleGrid>
          ) : state.collections.length > 0 ? (
            <SimpleGrid
              cols={{ base: 1, sm: 2, lg: 3 }}
              spacing="lg"
            >
              {state.collections.map((collection) => (
                <CollectionCard
                  key={collection.id}
                  collection={collection}
                  onEdit={openEditModal}
                  onDelete={openDeleteModal}
                />
              ))}
            </SimpleGrid>
          ) : (
            <Box ta="center" py="xl">
              <IconFolder size={64} color="var(--mantine-color-gray-4)" />
              <Title order={3} mt="md" mb="sm">
                No Collections Yet
              </Title>
              <Text color="dimmed" mb="lg">
                Create your first collection to start tracking your hobby items
              </Text>
              <Button
                leftSection={<IconPlus size={16} />}
                onClick={() => setCreateModalOpen(true)}
                size="lg"
              >
                Create Your First Collection
              </Button>
            </Box>
          )}
        </Box>

        {/* Create Collection Modal */}
        <Modal
          opened={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          title="Create New Collection"
          size="md"
        >
          <Stack gap="md">
            <TextInput
              label="Collection Name"
              placeholder="Enter collection name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <Textarea
              label="Description (Optional)"
              placeholder="Add a description for your collection"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              minRows={3}
            />
            <Group justify="flex-end" gap="sm">
              <Button variant="light" onClick={() => setCreateModalOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateCollection}
                disabled={!formData.name.trim()}
              >
                Create Collection
              </Button>
            </Group>
          </Stack>
        </Modal>

        {/* Edit Collection Modal */}
        <Modal
          opened={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          title="Edit Collection"
          size="md"
        >
          <Stack gap="md">
            <TextInput
              label="Collection Name"
              placeholder="Enter collection name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <Textarea
              label="Description (Optional)"
              placeholder="Add a description for your collection"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              minRows={3}
            />
            <Group justify="flex-end" gap="sm">
              <Button variant="light" onClick={() => setEditModalOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleUpdateCollection}
                disabled={!formData.name.trim()}
              >
                Update Collection
              </Button>
            </Group>
          </Stack>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          opened={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          title="Delete Collection"
          size="sm"
        >
          <Stack gap="md">
            <Text>
              Are you sure you want to delete "{selectedCollection?.name}"? This action cannot be undone.
            </Text>
            <Group justify="flex-end" gap="sm">
              <Button variant="light" onClick={() => setDeleteModalOpen(false)}>
                Cancel
              </Button>
              <Button color="red" onClick={handleDeleteCollection}>
                Delete Collection
              </Button>
            </Group>
          </Stack>
        </Modal>
      </Stack>
    </Container>
  );
}