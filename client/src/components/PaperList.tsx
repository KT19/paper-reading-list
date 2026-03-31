import { FC, useState } from 'react';
import {
  Stack,
  Group,
  Text,
  Checkbox,
  ActionIcon,
  Paper,
  Badge,
  Tooltip,
  Textarea,
} from '@mantine/core';
import {
  IconTrash,
  IconFileTypePdf,
  IconArrowBackUp,
  IconPencil,
} from '@tabler/icons-react';
import type { Paper as PaperType } from '@/types/paper';
import { usePaperStore } from '@/store/usePaperStore';

interface PaperListProps {
  papers: PaperType[];
}

const PaperItem: FC<{ paper: PaperType }> = ({ paper }) => {
  const { completePaper, restorePaper, removePaper, openPaper, updateNote } =
    usePaperStore();
  const isCompleted = !!paper.completed_at;
  const [editingNote, setEditingNote] = useState(false);
  const [noteValue, setNoteValue] = useState(paper.note || '');

  const handleToggle = () => {
    if (paper.completed_at) {
      restorePaper(paper.id);
    } else {
      completePaper(paper.id);
    }
  };

  const handleSaveNote = () => {
    setEditingNote(false);
    if (noteValue.trim() !== (paper.note || '')) {
      updateNote(paper.id, noteValue);
    }
  };

  return (
    <Paper
      p="md"
      radius="md"
      withBorder
      style={{
        cursor: 'pointer',
        transition: 'all 0.15s ease',
      }}
      styles={{
        root: {
          '&:hover': {
            borderColor: 'var(--mantine-color-gray-5)',
            transform: 'translateY(-1px)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
          },
        },
      }}
      onClick={(e) => {
        // Only open paper if we didn't click on the note area or buttons
        if ((e.target as HTMLElement).closest('.no-open')) return;
        openPaper(paper.id);
      }}
    >
      <Group justify="space-between" wrap="nowrap" gap="md" align="flex-start">
        <Group wrap="nowrap" gap="md" style={{ flex: 1, minWidth: 0, alignItems: 'flex-start' }}>
          <Tooltip 
            label={isCompleted ? "Mark as unread" : "Mark as completed"}
            fz="xs"
            color="dark.4"
            withArrow
            openDelay={300}
          >
            <div className="no-open" style={{ display: 'flex', alignItems: 'center', paddingTop: '4px' }}>
              <Checkbox
                checked={!!paper.completed_at}
                onChange={handleToggle}
                color="teal"
                radius="xl"
                size="lg"
                style={{ cursor: 'pointer' }}
              />
            </div>
          </Tooltip>
          <Stack gap="xs" style={{ flex: 1, minWidth: 0 }}>
            <div>
              <Text
                fw={500}
                size="sm"
                truncate
                td={isCompleted ? 'line-through' : undefined}
                c={isCompleted ? 'dimmed' : undefined}
              >
                {paper.title}
              </Text>
              <Text size="xs" c="dimmed" truncate>
                {paper.source}
              </Text>
            </div>

            {/* Note Section */}
            <div className="no-open" style={{ width: '100%', marginTop: '4px' }}>
              {editingNote ? (
                <Textarea
                  size="sm"
                  autoFocus
                  minRows={2}
                  maxRows={6}
                  autosize
                  placeholder="Add a thought or note..."
                  value={noteValue}
                  onChange={(e) => setNoteValue(e.currentTarget.value)}
                  onBlur={handleSaveNote}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSaveNote();
                    }
                  }}
                />
              ) : (
                <Paper
                  withBorder
                  p="xs"
                  radius="sm"
                  bg="var(--mantine-color-default-hover)"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingNote(true);
                    setNoteValue(paper.note || '');
                  }}
                  style={{
                    cursor: 'text',
                    transition: 'all 0.2s ease',
                  }}
                  styles={{
                    root: {
                      '&:hover': {
                        borderColor: 'var(--mantine-color-gray-4)',
                        backgroundColor: 'var(--mantine-color-default)',
                      }
                    }
                  }}
                >
                  <Group gap="xs" align="flex-start" wrap="nowrap">
                    <IconPencil size={14} style={{ marginTop: '3px', color: 'var(--mantine-color-dimmed)' }} />
                    <Text
                      size="sm"
                      c={paper.note ? undefined : 'dimmed'}
                      fs={paper.note ? 'normal' : 'italic'}
                      lineClamp={2}
                      style={{ flex: 1, whiteSpace: 'pre-wrap' }}
                    >
                      {paper.note || 'Add a note...'}
                    </Text>
                  </Group>
                </Paper>
              )}
            </div>
          </Stack>
        </Group>

        <Group gap="md" wrap="nowrap" className="no-open" align="center">
          <Stack gap={4} align="flex-end">
            <Text size="xs" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
              Added: {new Date(paper.added_at).toLocaleDateString()}
            </Text>
            {isCompleted ? (
              <Badge size="xs" variant="default">
                Completed: {new Date(paper.completed_at!).toLocaleDateString()}
              </Badge>
            ) : (
              <Badge size="xs" variant="default">
                Completed: Pending
              </Badge>
            )}
          </Stack>

          {isCompleted && (
            <Tooltip label="Restore to reading list">
              <ActionIcon
                variant="subtle"
                color="gray"
                onClick={(e) => {
                  e.stopPropagation();
                  restorePaper(paper.id);
                }}
              >
                <IconArrowBackUp size={16} />
              </ActionIcon>
            </Tooltip>
          )}

          <Tooltip label="Remove paper">
            <ActionIcon
              variant="subtle"
              color="red"
              onClick={(e) => {
                e.stopPropagation();
                removePaper(paper.id);
              }}
            >
              <IconTrash size={16} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>
    </Paper>
  );
};

export const PaperList: FC<PaperListProps> = ({ papers }) => {
  if (papers.length === 0) {
    return (
      <Stack align="center" py="xl" gap="sm">
        <IconFileTypePdf size={48} stroke={1} color="var(--mantine-color-gray-4)" />
        <Text c="dimmed" size="lg">
          No papers to show here
        </Text>
        <Text c="dimmed" size="sm">
          Paste a URL or local file path above to get started
        </Text>
      </Stack>
    );
  }

  return (
    <Stack gap="sm">
      {papers.map((paper) => (
        <PaperItem key={paper.id} paper={paper} />
      ))}
    </Stack>
  );
};
