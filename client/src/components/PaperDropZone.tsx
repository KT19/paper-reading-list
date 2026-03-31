import React, { FC, useCallback, useMemo, useRef, useState } from 'react';
import {
  Button,
  Group,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { IconFileTypePdf, IconLink, IconPlus, IconUpload } from '@tabler/icons-react';
import { usePaperStore } from '@/store/usePaperStore';

export const PaperAddInput: FC = () => {
  const [source, setSource] = useState('');
  const [title, setTitle] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const addPaper = usePaperStore((s) => s.addPaper);
  const uploadPaper = usePaperStore((s) => s.uploadPaper);

  const isUrl = useCallback(
    (value: string) => /^https?:\/\//i.test(value.trim()),
    []
  );

  const deriveTitle = useCallback(
    (value: string): string => {
      const trimmed = value.trim();
      if (!trimmed) return '';

      if (isUrl(trimmed)) {
        try {
          const url = new URL(trimmed);
          const segments = url.pathname.split('/').filter(Boolean);
          return segments.length > 0
            ? decodeURIComponent(segments[segments.length - 1]).replace(/\.[^.]+$/, '')
            : url.hostname;
        } catch {
          return trimmed;
        }
      }

      const normalized = trimmed.replace(/\\/g, '/');
      const parts = normalized.split('/');
      const filename = parts[parts.length - 1] || trimmed;
      return filename.replace(/\.[^.]+$/, '');
    },
    [isUrl]
  );

  const sourceLooksLocalPath = useMemo(
    () => {
      const trimmed = source.trim();
      return Boolean(trimmed) && !isUrl(trimmed);
    },
    [isUrl, source]
  );

  const handleSourceChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.currentTarget.value;
      setSource(value);
      if (!title || title === deriveTitle(source)) {
        setTitle(deriveTitle(value));
      }
    },
    [deriveTitle, source, title]
  );

  const handleAdd = useCallback(async () => {
    const trimmedSource = source.trim();
    if (!trimmedSource) return;
    const finalTitle = title.trim() || deriveTitle(trimmedSource);
    await addPaper(finalTitle, trimmedSource);
    setSource('');
    setTitle('');
  }, [addPaper, deriveTitle, source, title]);

  const handleFileSelected = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.currentTarget.files?.[0];
      if (!file) return;

      const finalTitle = title.trim() || deriveTitle(file.name);
      await uploadPaper(file, finalTitle);
      setSource('');
      setTitle('');
      e.currentTarget.value = '';
    },
    [deriveTitle, title, uploadPaper]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        void handleAdd();
      }
    },
    [handleAdd]
  );

  return (
    <Stack gap="xs">
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,.pdf"
        style={{ display: 'none' }}
        onChange={handleFileSelected}
      />

      <TextInput
        placeholder="Paste a paper URL or local path"
        value={source}
        onChange={handleSourceChange}
        onKeyDown={handleKeyDown}
        leftSection={<IconLink size={16} />}
        styles={{
          input: {
            fontFamily: 'monospace',
            fontSize: '13px',
          },
        }}
      />

      <Group gap="sm" align="flex-start">
        <TextInput
          placeholder="Title (auto-filled from source or file)"
          value={title}
          onChange={(e) => setTitle(e.currentTarget.value)}
          onKeyDown={handleKeyDown}
          style={{ flex: 1 }}
        />

        <Group gap="sm">
          <Button
            leftSection={<IconUpload size={16} />}
            variant="default"
            onClick={() => fileInputRef.current?.click()}
          >
            Choose PDF
          </Button>
          <Button
            leftSection={<IconPlus size={16} />}
            variant="default"
            onClick={() => void handleAdd()}
            disabled={!source.trim()}
          >
            Add Link
          </Button>
        </Group>
      </Group>

      <Group gap="xs" wrap="nowrap" align="flex-start">
        <IconFileTypePdf size={16} style={{ marginTop: 2, flexShrink: 0 }} />
        <Text size="xs" c="dimmed">
          Use `Choose PDF` for local files. It uploads a copy into the app so opening works even when macOS blocks
          background access to folders like Downloads or Desktop.
        </Text>
      </Group>

      {sourceLooksLocalPath && (
        <Text size="xs" c="orange">
          Pasted local paths can still fail if the file lives in a protected macOS folder. `Choose PDF` is the safer
          option.
        </Text>
      )}
    </Stack>
  );
};
