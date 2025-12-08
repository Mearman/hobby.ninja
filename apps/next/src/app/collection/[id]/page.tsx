import React from 'react';
import { notFound } from 'next/navigation';
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
  Image,
  Box,
  Breadcrumbs,
  Anchor,
  Button,
  TextInput,
  Select,
  MultiSelect,
  Switch,
  Modal,
  NumberInput,
  ActionIcon,
  Menu,
  Avatar,
  Progress,
  Tabs,
  Table,
  ActionIcon as MantineActionIcon,
  Skeleton,
} from '@mantine/core';
import {
  IconPlus,
  IconSearch,
  IconFilter,
  IconDots,
  IconEdit,
  IconTrash,
  IconDownload,
  IconEye,
  IconEyeOff,
  IconChevronRight,
  IconHome,
  IconFolder,
  IconGrid,
  IconList,
} from '@tabler/icons-react';
import { useCollection } from '@/contexts/collection-context';
import { getAllItems } from '@/lib/graph-data';
import { getNodeDisplayName, isItemNode } from '@/lib/schemas';
import styles from '@/styles/components.css';

// Static data fetching
interface PageProps {
  params: { id: string };
}

// Item card component for collection items
function CollectionItemCard({
  item,
  onEdit,
  onDelete,
  onToggleVisibility,
  viewMode
}: {
  item: any;
  onEdit: (item: any) => void;
  onDelete: (item: any) => void;
  onToggleVisibility: (item: any) => void;
  viewMode: 'grid' | 'list';
}) {
  if (!isItemNode(item)) return null;

  const CardComponent = viewMode === 'grid' ? Card : 'div';

  return (
    <CardComponent
      {...(viewMode === 'grid' ? {
        p: 0,
        radius: "md",
        className: styles.itemCard,
        withBorder: true,
      } : {
        p: "md",
        radius: "md",
        className: styles.collectionCard,
        withBorder: true,
      })}
    >
      {viewMode === 'grid' ? (
        <>
          <Box className={styles.itemCardImage}>
            <Image
              src={`https://via.placeholder.com/280x200/f5f5f5/666666?text=${encodeURIComponent(getNodeDisplayName(item))}`}
              alt={getNodeDisplayName(item)}
              fit="cover"
              height={200}
              fallbackSrc="https://via.placeholder.com/280x200/e0e0e0/999999?text=No+Image"
            />
          </Box>
          <Box className={styles.itemCardContent}>
            <Text className={styles.itemCardTitle} lineClamp={2}>
              {getNodeDisplayName(item)}
            </Text>
            {item.series && (
              <Text className={styles.itemCardSubtitle} lineClamp={1}>
                {item.series}
              </Text>
            )}
            <Box className={styles.itemCardMetadata}>
              {item.grade && (
                <Badge className={styles.itemCardBadge} variant="light">
                  {item.grade}
                </Badge>
              )}
              {item.scale && (
                <Badge className={styles.itemCardBadge} variant="light">
                  {item.scale}
                </Badge>
              )}
              <Badge
                className={styles.itemCardBadge}
                variant={item.status === 'completed' ? 'filled' : 'outline'}
                color={item.status === 'completed' ? 'green' : 'blue'}
              >
                {item.status}
              </Badge>
            </Box>
            {item.price && (
              <Text className={styles.itemCardPrice}>
                ¥{item.price.toLocaleString()}
              </Text>
            )}
          </Box>
          <Box className={styles.itemCardActions}>
            <ActionIcon
              variant="light"
              size="sm"
              onClick={() => onToggleVisibility(item)}
              color={item.hidden ? 'red' : 'blue'}
            >
              {item.hidden ? <IconEyeOff size={14} /> : <IconEye size={14} />}
            </ActionIcon>
            <ActionIcon
              variant="light"
              size="sm"
              onClick={() => onEdit(item)}
            >
              <IconEdit size={14} />
            </ActionIcon>
            <ActionIcon
              variant="light"
              size="sm"
              color="red"
              onClick={() => onDelete(item)}
            >
              <IconTrash size={14} />
            </ActionIcon>
          </Box>
        </>
      ) : (
        <Group justify="space-between" align="center">
          <Group>
            <Avatar
              size="md"
              src={`https://via.placeholder.com/40x40/f5f5f5/666666?text=${encodeURIComponent(getNodeDisplayName(item)[0]}`}
              alt={getNodeDisplayName(item)}
            />
            <Box>
              <Text fw={500}>{getNodeDisplayName(item)}</Text>
              {item.series && (
                <Text size="sm" color="dimmed">
                  {item.series}
                </Text>
              )}
            </Box>
          </Group>

          <Group>
            <Box>
              <Text fw={500}>¥{item.price?.toLocaleString() || 0}</Text>
              <Text size="sm" color="dimmed">
                Added: {new Date(item.dateAdded).toLocaleDateString()}
              </Text>
            </Box>

            <Group gap="xs">
              {item.grade && <Badge size="sm">{item.grade}</Badge>}
              {item.scale && <Badge size="sm" variant="outline">{item.scale}</Badge>}
              <Badge
                size="sm"
                color={item.status === 'completed' ? 'green' : 'blue'}
                variant={item.status === 'completed' ? 'filled' : 'light'}
              >
                {item.status}
              </Badge>
            </Group>

            <Menu shadow="md" width={200}>
              <Menu.Target>
                <MantineActionIcon variant="subtle" color="gray">
                  <IconDots size={16} />
                </MantineActionIcon>
              </Menu.Target>

              <Menu.Dropdown>
                <Menu.Item leftSection={<IconEye size={14} />} onClick={() => onToggleVisibility(item)}>
                  {item.hidden ? 'Show' : 'Hide'}
                </Menu.Item>
                <Menu.Item leftSection={<IconEdit size={14} />} onClick={() => onEdit(item)}>
                  Edit Item
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item
                  leftSection={<IconTrash size={14} />}
                  color="red"
                  onClick={() => onDelete(item)}
                >
                  Remove from Collection
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>
      )}
    </CardComponent>
  );
}

// Item form modal
function ItemFormModal({
  opened,
  onClose,
  item,
  onSave,
}: {
  opened: boolean;
  onClose: () => void;
  item?: any;
  onSave: (itemData: any) => void;
}) {
  const [formData, setFormData] = React.useState({
    status: item?.status || 'wanted',
    notes: item?.notes || '',
    price: item?.price || 0,
    condition: item?.condition || 'new',
    location: item?.location || '',
    purchaseDate: item?.purchaseDate || '',
    rating: item?.rating || 0,
  });

  React.useEffect(() => {
    if (item) {
      setFormData({
        status: item.status || 'wanted',
        notes: item.notes || '',
        price: item.price || 0,
        condition: item.condition || 'new',
        location: item.location || '',
        purchaseDate: item.purchaseDate || '',
        rating: item.rating || 0,
      });
    }
  }, [item]);

  const handleSave = () => {
    onSave(formData);
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={item ? `Edit ${getNodeDisplayName(item)}` : 'Add Item Details'}
      size="md"
    >
      <Stack gap="md">
        {item && (
          <Box mb="md">
            <Group>
              <Avatar
                size="lg"
                src={`https://via.placeholder.com/60x60/f5f5f5/666666?text=${encodeURIComponent(getNodeDisplayName(item)[0]}`}
                alt={getNodeDisplayName(item)}
              />
              <Box>
                <Text fw={500}>{getNodeDisplayName(item)}</Text>
                <Text size="sm" color="dimmed">{item.series}</Text>
              </Box>
            </Group>
          </Box>
        )}

        <Select
          label="Status"
          data={[
            { value: 'wanted', label: 'Wanted' },
            { value: 'ordered', label: 'Ordered' },
            { value: 'pre-ordered', label: 'Pre-ordered' },
            { value: 'building', label: 'Building' },
            { value: 'completed', label: 'Completed' },
            { value: 'displayed', label: 'Displayed' },
            { value: 'stored', label: 'Stored' },
          ]}
          value={formData.status}
          onChange={(value) => setFormData({ ...formData, status: value as string })}
        />

        <Select
          label="Condition"
          data={[
            { value: 'new', label: 'New' },
            { value: 'used', label: 'Used' },
            { value: 'damaged', label: 'Damaged' },
            { value: 'box-damaged', label: 'Box Damaged' },
          ]}
          value={formData.condition}
          onChange={(value) => setFormData({ ...formData, condition: value as string })}
        />

        <NumberInput
          label="Price (¥)"
          value={formData.price}
          onChange={(value) => setFormData({ ...formData, price: Number(value) || 0 })}
          min={0}
          step={100}
        />

        <Select
          label="Rating"
          data={[
            { value: 0, label: 'Not Rated' },
            { value: 1, label: '1 Star' },
            { value: 2, label: '2 Stars' },
            { value: 3, label: '3 Stars' },
            { value: 4, label: '4 Stars' },
            { value: 5, label: '5 Stars' },
          ]}
          value={formData.rating}
          onChange={(value) => setFormData({ ...formData, rating: Number(value) || 0 })}
        />

        <TextInput
          label="Location"
          placeholder="Where is this item stored?"
          value={formData.location}
          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
        />

        <Textarea
          label="Notes"
          placeholder="Add any notes about this item..."
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          minRows={3}
        />

        <Group justify="flex-end" gap="sm">
          <Button variant="light" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Changes
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

// Stats component
function CollectionStats({ stats }: { stats: any }) {
  return (
    <Card p="lg" radius="md" withBorder>
      <Title order={3} mb="md">
        Collection Statistics
      </Title>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md" mb="md">
        <div className={styles.statCard}>
          <Text size="sm" color="dimmed" tt="uppercase" fw={700}>
            Total Items
          </Text>
          <Text size="lg" fw={500}>
            {stats?.totalItems || 0}
          </Text>
        </div>

        <div className={styles.statCard}>
          <Text size="sm" color="dimmed" tt="uppercase" fw={700}>
            Total Value
          </Text>
          <Text size="lg" fw={500}>
            ¥{(stats?.totalValue || 0).toLocaleString()}
          </Text>
        </div>

        <div className={styles.statCard}>
          <Text size="sm" color="dimmed" tt="uppercase" fw={700}>
            Completed
          </Text>
          <Text size="lg" fw={500}>
            {stats?.statusBreakdown?.completed || 0}
          </Text>
        </div>

        <div className={styles.statCard}>
          <Text size="sm" color="dimmed" tt="uppercase" fw={700}>
            In Progress
          </Text>
          <Text size="lg" fw={500}>
            {stats?.statusBreakdown?.building || 0}
          </Text>
        </div>
      </SimpleGrid>

      <Box>
        <Group justify="space-between" mb="xs">
          <Text size="sm" fw={500}>Progress</Text>
          <Text size="sm" color="dimmed">
            {stats?.completionPercentage || 0}% Complete
          </Text>
        </Group>
        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            style={{
              width: `${stats?.completionPercentage || 0}%`,
            }}
          />
        </div>
      </Box>
    </Card>
  );
}

// Loading skeleton
function LoadingGrid({ viewMode }: { viewMode: 'grid' | 'list' }) {
  if (viewMode === 'grid') {
    return (
      <SimpleGrid
        cols={{ base: 1, sm: 2, lg: 3, xl: 4 }}
        spacing="md"
      >
        {[...Array(8)].map((_, index) => (
          <Card key={index} p={0} radius="md" withBorder>
            <Skeleton height={200} />
            <Box p="md">
              <Skeleton height={20} mb="xs" />
              <Skeleton height={16} mb="md" width="60%" />
              <Group gap="xs">
                <Skeleton width={40} height={20} radius="sm" />
                <Skeleton width={50} height={20} radius="sm" />
              </Group>
              <Skeleton height={24} mb="md" />
            </Box>
          </Card>
        ))}
      </SimpleGrid>
    );
  }

  return (
    <Stack gap="sm">
      {[...Array(6)].map((_, index) => (
        <Card key={index} p="md" radius="md" withBorder>
          <Skeleton height={40} mb="md" />
          <Group justify="space-between">
            <Group>
              <Skeleton width={40} height={40} radius="md" />
              <Box>
                <Skeleton width={150} height={16} mb="xs" />
                <Skeleton width={100} height={12} />
              </Box>
            </Group>
            <Group>
              <Skeleton width={80} height={16} />
              <Skeleton width={60} height={16} />
              <Skeleton width={50} height={20} radius="sm" />
            </Group>
          </Group>
        </Card>
      ))}
    </Stack>
  );
}

// Main collection detail page
export default function CollectionDetailPage({ params }: PageProps) {
  const { state, actions } = useCollection();
  const [viewMode, setViewMode] = React.useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string[]>([]);
  const [sortOrder, setSortOrder] = React.useState('dateAdded');
  const [itemModalOpen, setItemModalOpen] = React.useState(false);
  const [selectedItem, setSelectedItem] = React.useState<any>(null);

  React.useEffect(() => {
    actions.loadCollection(params.id);
  }, [params.id]);

  // Filter and sort items
  const filteredItems = React.useMemo(() => {
    let items = [...state.items];

    // Search filter
    if (searchQuery) {
      items = items.filter(item =>
        getNodeDisplayName(item).toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter.length > 0) {
      items = items.filter(item => statusFilter.includes(item.status));
    }

    // Sort
    items.sort((a, b) => {
      switch (sortOrder) {
        case 'name':
          return getNodeDisplayName(a).localeCompare(getNodeDisplayName(b));
        case 'status':
          return a.status.localeCompare(b.status);
        case 'rating':
          return (b.rating || 0) - (a.rating || 0);
        case 'price':
          return (b.price || 0) - (a.price || 0);
        case 'dateAdded':
        default:
          return new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime();
      }
    });

    return items;
  }, [state.items, searchQuery, statusFilter, sortOrder]);

  const handleEditItem = (item: any) => {
    setSelectedItem(item);
    setItemModalOpen(true);
  };

  const handleDeleteItem = (item: any) => {
    if (confirm(`Remove "${getNodeDisplayName(item)}" from this collection?`)) {
      actions.removeItem(item.id);
    }
  };

  const handleToggleVisibility = (item: any) => {
    actions.updateItem(item.id, { hidden: !item.hidden });
  };

  const handleSaveItem = (itemData: any) => {
    if (selectedItem) {
      actions.updateItem(selectedItem.id, itemData);
    }
    setSelectedItem(null);
  };

  const statusOptions = [
    { value: 'wanted', label: 'Wanted' },
    { value: 'ordered', label: 'Ordered' },
    { value: 'pre-ordered', label: 'Pre-ordered' },
    { value: 'building', label: 'Building' },
    { value: 'completed', label: 'Completed' },
    { value: 'displayed', label: 'Displayed' },
    { value: 'stored', label: 'Stored' },
  ];

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        {/* Header */}
        <Box>
          <Group justify="space-between" align="flex-start">
            <Box>
              <Title order={1} mb="sm">
                {state.currentCollection?.name || 'Collection'}
              </Title>
              <Text size="lg" color="dimmed">
                {state.currentCollection?.description}
              </Text>
            </Box>
            <Group>
              <Button
                variant="light"
                leftSection={<IconDownload size={14} />}
                size="sm"
              >
                Export
              </Button>
            </Group>
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
          <Anchor href="/collection" size="sm">
            Collections
          </Anchor>
          <Text size="sm">{state.currentCollection?.name}</Text>
        </Breadcrumbs>

        {/* Stats */}
        {!state.loading && state.stats && <CollectionStats stats={state.stats} />}

        {/* Filters and Controls */}
        <Card p="lg" radius="md" withBorder>
          <Grid>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <TextInput
                leftSection={<IconSearch size={16} />}
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 4 }}>
              <MultiSelect
                leftSection={<IconFilter size={16} />}
                placeholder="Filter by status"
                data={statusOptions}
                value={statusFilter}
                onChange={setStatusFilter}
                clearable
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 2 }}>
              <Select
                data={[
                  { value: 'dateAdded', label: 'Date Added' },
                  { value: 'name', label: 'Name' },
                  { value: 'status', label: 'Status' },
                  { value: 'rating', label: 'Rating' },
                  { value: 'price', label: 'Price' },
                ]}
                value={sortOrder}
                onChange={(value) => setSortOrder(value as string)}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 2 }}>
              <Group>
                <Button
                  variant={viewMode === 'grid' ? 'filled' : 'light'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  leftSection={<IconGrid size={14} />}
                >
                  Grid
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'filled' : 'light'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  leftSection={<IconList size={14} />}
                >
                  List
                </Button>
              </Group>
            </Grid.Col>
          </Grid>
        </Card>

        {/* Items Grid/List */}
        <Box>
          <Group justify="space-between" mb="md">
            <Text size="lg" fw={500}>
              {filteredItems.length} {filteredItems.length === 1 ? 'Item' : 'Items'}
              {searchQuery || statusFilter.length > 0 ? ' (filtered)' : ''}
            </Text>
          </Group>

          {state.loading ? (
            <LoadingGrid viewMode={viewMode} />
          ) : filteredItems.length > 0 ? (
            viewMode === 'grid' ? (
              <SimpleGrid
                cols={{ base: 1, sm: 2, lg: 3, xl: 4 }}
                spacing="md"
              >
                {filteredItems.map((item) => (
                  <CollectionItemCard
                    key={item.id}
                    item={item}
                    onEdit={handleEditItem}
                    onDelete={handleDeleteItem}
                    onToggleVisibility={handleToggleVisibility}
                    viewMode={viewMode}
                  />
                ))}
              </SimpleGrid>
            ) : (
              <Stack gap="sm">
                {filteredItems.map((item) => (
                  <CollectionItemCard
                    key={item.id}
                    item={item}
                    onEdit={handleEditItem}
                    onDelete={handleDeleteItem}
                    onToggleVisibility={handleToggleVisibility}
                    viewMode={viewMode}
                  />
                ))}
              </Stack>
            )
          ) : (
            <Box ta="center" py="xl">
              <IconSearch size={64} color="var(--mantine-color-gray-4)" />
              <Title order={3} mt="md" mb="sm">
                No items found
              </Title>
              <Text color="dimmed" mb="lg">
                {searchQuery || statusFilter.length > 0
                  ? 'Try adjusting your search or filters'
                  : 'This collection is empty. Add items from the database to get started.'
                }
              </Text>
              {(searchQuery || statusFilter.length > 0) && (
                <Button
                  variant="light"
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter([]);
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </Box>
          )}
        </Box>

        {/* Item Form Modal */}
        <ItemFormModal
          opened={itemModalOpen}
          onClose={() => {
            setItemModalOpen(false);
            setSelectedItem(null);
          }}
          item={selectedItem}
          onSave={handleSaveItem}
        />
      </Stack>
    </Container>
  );
}