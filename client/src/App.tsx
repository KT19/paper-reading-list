import { FC, useEffect, useMemo, useCallback } from 'react';
import {
  Container,
  Title,
  Tabs,
  Badge,
  Group,
  Text,
  Stack,
  Loader,
  Center,
  Alert,
  Button,
  ThemeIcon,
  Card,
  SimpleGrid,
  ActionIcon,
  useMantineColorScheme,
} from '@mantine/core';
import {
  IconBookmark,
  IconChecks,
  IconAlertCircle,
  IconBooks,
  IconDownload,
  IconSun,
  IconMoon,
} from '@tabler/icons-react';
import { PaperAddInput } from '@/components/PaperDropZone';
import { PaperList } from '@/components/PaperList';
import { usePaperStore } from '@/store/usePaperStore';

const App: FC = () => {
  const { papers, loading, error, fetchPapers } = usePaperStore();
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();

  useEffect(() => {
    fetchPapers();
  }, [fetchPapers]);

  // Auto-dismiss errors after 3 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        usePaperStore.setState({ error: null });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const readingPapers = useMemo(
    () => papers.filter((p) => !p.completed_at),
    [papers]
  );
  const completedPapers = useMemo(
    () => papers.filter((p) => !!p.completed_at),
    [papers]
  );

  const downloadCSV = useCallback(() => {
    if (completedPapers.length === 0) return;

    const headers = ['ID', 'Title', 'Source', 'Note', 'Added At', 'Completed At'];
    const escapeCsv = (str: string | null | undefined) => (str ? `"${str.replace(/"/g, '""')}"` : '');

    const csvContent = [
      headers.join(','),
      ...completedPapers.map((p) =>
        [
          p.id.toString(),
          p.title,
          p.source,
          p.note,
          p.added_at,
          p.completed_at,
        ]
          .map(escapeCsv)
          .join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'completed_papers.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [completedPapers]);

  return (
    <Container size="md" py="xl">
      <Stack gap="lg">
        {/* Header */}
        <Group justify="space-between" align="center">
          <Group gap="sm" align="center">
            <IconBooks size={32} stroke={1.5} />
            <Title
              order={1}
              style={{
                letterSpacing: '-0.5px',
                fontWeight: 800,
              }}
            >
              Paper Reading List
            </Title>
          </Group>
          <Group gap="sm">
            <Button
              variant="default"
              leftSection={<IconDownload size={16} />}
              onClick={downloadCSV}
              disabled={completedPapers.length === 0}
            >
              Export
            </Button>
            <ActionIcon
              variant="default"
              size="lg"
              onClick={() => toggleColorScheme()}
              title="Toggle color scheme"
            >
              {colorScheme === 'dark' ? <IconSun size={18} /> : <IconMoon size={18} />}
            </ActionIcon>
          </Group>
        </Group>
        <Text c="dimmed" size="sm">
          Track your academic paper reading progress. Add by URL or local path, click to open, check to complete.
        </Text>

        {/* Stats Row */}
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          <Card withBorder radius="md" p="md">
            <Group>
              <ThemeIcon color="orange" variant="light" size={38} radius="md">
                <IconBookmark size={24} />
              </ThemeIcon>
              <div>
                <Text c="dimmed" size="xs" tt="uppercase" fw={700}>
                  Reading Lists
                </Text>
                <Text fw={700} size="xl">
                  {readingPapers.length}
                </Text>
              </div>
            </Group>
          </Card>
          <Card withBorder radius="md" p="md">
            <Group>
              <ThemeIcon color="teal" variant="light" size={38} radius="md">
                <IconChecks size={24} />
              </ThemeIcon>
              <div>
                <Text c="dimmed" size="xs" tt="uppercase" fw={700}>
                  Completed
                </Text>
                <Text fw={700} size="xl">
                  {completedPapers.length}
                </Text>
              </div>
            </Group>
          </Card>
        </SimpleGrid>

        {/* Error alert */}
        {error && (
          <Alert
            icon={<IconAlertCircle size={16} />}
            title="Error"
            color="red"
            variant="light"
            withCloseButton
            onClose={() => usePaperStore.setState({ error: null })}
          >
            {error}
          </Alert>
        )}

        {/* Loading state */}
        {loading && papers.length === 0 && (
          <Center py="xl">
            <Loader color="indigo" size="lg" />
          </Center>
        )}

        {/* Tabs */}
        <Tabs defaultValue="reading_list" variant="default" color="gray">
          <Tabs.List mb="lg">
            <Tabs.Tab
              value="reading_list"
              leftSection={<IconBookmark size={16} />}
              rightSection={
                readingPapers.length > 0 ? (
                  <Badge size="sm" variant="default" circle>
                    {readingPapers.length}
                  </Badge>
                ) : undefined
              }
            >
              Reading Lists
            </Tabs.Tab>
            <Tabs.Tab
              value="completed"
              leftSection={<IconChecks size={16} />}
              rightSection={
                completedPapers.length > 0 ? (
                  <Badge size="sm" variant="default" circle>
                    {completedPapers.length}
                  </Badge>
                ) : undefined
              }
            >
              Completed
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="reading_list">
            <Stack gap="lg">
              <PaperAddInput />
              <PaperList papers={readingPapers} />
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="completed">
            <PaperList papers={completedPapers} />
          </Tabs.Panel>
        </Tabs>
      </Stack>

    </Container>
  );
};

export default App;
